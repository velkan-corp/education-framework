-- One-time semantic migration filter for the legacy HTML-shaped phase files.
--
-- The legacy documents used HTML classes as both presentation and application
-- data. This filter converts the structures that have a native Markdown
-- equivalent before Pandoc writes GitHub-Flavored Markdown. A later Astro
-- presentation pass may decorate the semantic output, but author content no
-- longer needs HTML.

local stringify = pandoc.utils.stringify

local function is_spanish_source()
  if os.getenv("PHASE_MARKDOWN_LOCALE") == "es" then return true end
  local input = table.concat(PANDOC_STATE.input_files or {}, " ")
  return input:match("phases%-es") ~= nil
end

local function has_class(element, wanted)
  for _, class_name in ipairs(element.classes or {}) do
    if class_name == wanted then
      return true
    end
  end
  return false
end

local function clone_inlines(inlines)
  local result = pandoc.Inlines({})
  for _, inline in ipairs(inlines or {}) do
    result:insert(inline)
  end
  return result
end

local function strong_label(text)
  return pandoc.Strong({ pandoc.Str(text) })
end

local function prefixed_blocks(prefix, blocks)
  local result = pandoc.Blocks({})
  result:insert(pandoc.Para({ strong_label(prefix) }))
  result:extend(blocks)
  return result
end

local function strip_inline_class(blocks, class_name)
  local doc = pandoc.Pandoc(blocks)
  local cleaned = doc:walk({
    Span = function(span)
      if has_class(span, class_name) then
        return {}
      end
      return span
    end,
  })
  return cleaned.blocks
end

local function item_with_title(title, blocks)
  local item = pandoc.Blocks({})
  local heading = clone_inlines(title)
  heading:insert(pandoc.Str("."))
  item:insert(pandoc.Para({ pandoc.Strong(heading) }))
  item:extend(blocks)
  return item
end

local function target_list(grid)
  local items = pandoc.List({})
  for _, card in ipairs(grid.content) do
    if card.t == "Div" and has_class(card, "target-card") then
      local title = nil
      local body = pandoc.Blocks({})
      for _, block in ipairs(card.content) do
        if block.t == "Header" and not title then
          title = block.content
        elseif block.t ~= "Plain" or stringify(block) ~= stringify(block):match("^%s*%d+%s*$") then
          body:insert(block)
        end
      end
      body = strip_inline_class(body, "target-num")
      if title then
        items:insert(item_with_title(title, body))
      else
        items:insert(body)
      end
    end
  end
  return pandoc.OrderedList(items)
end

local function priority_list(box)
  local result = pandoc.Blocks({})
  local items = pandoc.List({})
  for _, block in ipairs(box.content) do
    if block.t == "Header" then
      result:insert(block)
    elseif block.t == "Div" and has_class(block, "priority-item") then
      items:insert(strip_inline_class(block.content, "priority-num"))
    else
      result:insert(block)
    end
  end
  if #items > 0 then
    result:insert(pandoc.OrderedList(items))
  end
  return result
end

local function profile_quote(adjustment)
  local label = "Profile adjustment"
  local body = pandoc.Blocks({})
  for _, block in ipairs(adjustment.content) do
    if block.t == "Div" and has_class(block, "t-label") then
      label = stringify(block)
    else
      body:insert(block)
    end
  end

  local marker = (is_spanish_source() and "Perfil — " or "Profile — ") .. label .. "."
  return pandoc.BlockQuote(prefixed_blocks(marker, body))
end

local function collect_model_dots(blocks)
  local dots = {}
  pandoc.Pandoc(blocks):walk({
    Span = function(span)
      if has_class(span, "model-dot") then
        local number = "?"
        local short_name = ""
        for _, child in ipairs(span.content or {}) do
          if child.t == "Span" and has_class(child, "model-dot-num") then
            number = stringify(child)
          elseif child.t == "Span" and has_class(child, "model-dot-name") then
            short_name = stringify(child)
          end
        end
        local status = ""
        for _, candidate in ipairs({ "new", "active", "future" }) do
          if has_class(span, candidate) then
            status = candidate
          end
        end
        table.insert(dots, {
          number = number,
          short_name = short_name,
          status = status,
          tip = span.attributes.tip or span.attributes["data-tip"] or "",
        })
      end
      return span
    end,
  })
  return dots
end

local function locale_status(status)
  local labels = is_spanish_source()
      and { new = "nuevo", active = "activo", future = "futuro" }
      or { new = "new", active = "active", future = "future" }
  return labels[status] or status
end

local function model_tracker(tracker)
  local label = "Model progression"
  for _, block in ipairs(tracker.content) do
    if block.t == "Div" and has_class(block, "model-tracker-label") then
      label = stringify(block)
    end
  end

  local items = pandoc.List({})
  for _, dot in ipairs(collect_model_dots(tracker.content)) do
    local lead = dot.number .. " · " .. locale_status(dot.status)
    if dot.short_name ~= "" then
      lead = lead .. " · " .. dot.short_name
    end
    local inlines = pandoc.Inlines({ pandoc.Strong({ pandoc.Str(lead) }) })
    if dot.tip ~= "" then
      inlines:insert(pandoc.Space())
      inlines:insert(pandoc.Str("—"))
      inlines:insert(pandoc.Space())
      inlines:insert(pandoc.Str(dot.tip))
    end
    items:insert({ pandoc.Plain(inlines) })
  end

  return {
    pandoc.Para({ pandoc.Strong({ pandoc.Str(label) }) }),
    pandoc.BulletList(items),
  }
end

local function titled_card_list(container, accepted_classes)
  local items = pandoc.List({})
  for _, card in ipairs(container.content) do
    local accepted = false
    if card.t == "Div" then
      for class_name, _ in pairs(accepted_classes) do
        accepted = accepted or has_class(card, class_name)
      end
    end
    if accepted then
      local title = nil
      local body = pandoc.Blocks({})
      for _, block in ipairs(card.content) do
        if block.t == "Header" and not title then
          title = block.content
        elseif block.t == "Div"
            and (has_class(block, "card-title") or has_class(block, "cycle-step-name"))
            and not title then
          title = { pandoc.Str(stringify(block)) }
        else
          body:insert(block)
        end
      end
      if title then
        items:insert(item_with_title(title, body))
      else
        items:insert(body)
      end
    end
  end
  if #items == 0 then
    return container.content
  end
  return pandoc.BulletList(items)
end

local function summary_parts(summary)
  local parts = { number = "", name = "", thesis = "" }
  pandoc.Pandoc(summary.content):walk({
    Span = function(span)
      if has_class(span, "principle-num") then parts.number = stringify(span) end
      if has_class(span, "principle-name") then parts.name = stringify(span) end
      if has_class(span, "principle-thesis") then parts.thesis = stringify(span) end
      return span
    end,
  })
  return parts
end

local function principle_blocks(principle)
  local summary = nil
  local body = pandoc.Blocks({})
  for _, block in ipairs(principle.content) do
    if block.t == "Div" and has_class(block, "details-summary") and not summary then
      summary = block
    else
      body:insert(block)
    end
  end
  if not summary then return principle.content end

  local parts = summary_parts(summary)
  local label = is_spanish_source() and "Principio" or "Principle"
  local title = label
  if parts.number ~= "" then title = title .. " " .. parts.number end
  if parts.name ~= "" then title = title .. " — " .. parts.name end
  local result = pandoc.Blocks({ pandoc.Header(3, title) })
  if parts.thesis ~= "" then
    result:insert(pandoc.BlockQuote({ pandoc.Para({ pandoc.Emph({ pandoc.Str(parts.thesis) }) }) }))
  end
  result:extend(body)
  return result
end

local function evidence_quote(evidence)
  local summary = is_spanish_source() and "Evidencia" or "Evidence"
  local body = pandoc.Blocks({})
  for _, block in ipairs(evidence.content) do
    if block.t == "Div" and has_class(block, "details-summary") then
      summary = stringify(block)
    else
      body:insert(block)
    end
  end
  if not summary:match("[%.:!?]$") then summary = summary .. "." end
  return pandoc.BlockQuote(prefixed_blocks(summary, body))
end

local function evidence_div(div)
  if has_class(div, "evidence") then return evidence_quote(div) end
  return div
end

local function special_div(div)
  if has_class(div, "principle") then
    return principle_blocks(div)
  end
  if has_class(div, "priority-box") then
    return priority_list(div)
  end
  if has_class(div, "target-grid") and div.attributes["target-map"] ~= nil then
    return target_list(div)
  end
  if has_class(div, "t-adjust") then
    return profile_quote(div)
  end
  if has_class(div, "model-tracker") then
    return model_tracker(div)
  end
  if has_class(div, "note-box") then
    return pandoc.BlockQuote(prefixed_blocks(is_spanish_source() and "Nota." or "Note.", div.content))
  end
  if has_class(div, "warn-box") then
    return pandoc.BlockQuote(prefixed_blocks(is_spanish_source() and "Advertencia." or "Warning.", div.content))
  end
  if has_class(div, "card-grid") then
    return titled_card_list(div, { ["card"] = true, ["target-card"] = true })
  end
  if has_class(div, "model-cards") then
    return titled_card_list(div, { ["model-card"] = true })
  end
  if has_class(div, "triad-grid") then
    return titled_card_list(div, { ["triad-card"] = true })
  end
  if has_class(div, "cycle-pipeline") then
    return titled_card_list(div, { ["cycle-step"] = true })
  end
  return div
end

local function clean_span(span)
  if has_class(span, "material-symbols-rounded")
      or has_class(span, "priority-num")
      or has_class(span, "target-num") then
    return {}
  end
  return span.content
end

local function unwrap_div(div)
  if has_class(div, "cycle-arrow") then
    return {}
  end
  return div.content
end

local function clean_header(header)
  header.identifier = ""
  header.classes = {}
  header.attributes = {}
  return header
end

local function clean_link(link)
  link.identifier = ""
  link.classes = {}
  link.attributes = {}
  return link
end

local function clean_table(table_element)
  table_element.identifier = ""
  table_element.classes = {}
  table_element.attributes = {}
  return table_element
end

return {
  {
    Div = evidence_div,
  },
  {
    traverse = "topdown",
    Div = special_div,
  },
  {
    Span = clean_span,
    LineBreak = function()
      return { pandoc.Space(), pandoc.Str("·"), pandoc.Space() }
    end,
    RawInline = function(raw)
      if raw.format == "html" then
        return pandoc.Str(raw.text:gsub("<[^>]+>", ""))
      end
      return raw
    end,
    RawBlock = function(raw)
      if raw.format == "html" then
        local text = raw.text:gsub("<[^>]+>", "")
        if text:match("%S") then
          return pandoc.Para({ pandoc.Str(text) })
        end
        return {}
      end
      return raw
    end,
    Header = clean_header,
    Link = clean_link,
    Table = clean_table,
  },
  {
    Div = unwrap_div,
  },
}
