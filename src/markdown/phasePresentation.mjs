import { normalizeHeadingText, resolvePhaseSection } from './phaseSections.mjs';

const TARGET_SECTION_KEYS = new Set(['activity', 'target-progression', 'targets']);
const FRAMEWORK_HEADER_KEYS = new Set(['philosophy', 'methods', 'operations']);

const PROFILE_CLASS_BY_LABEL = new Map([
  ['introvert', 't-introvert'],
  ['introvertido', 't-introvert'],
  ['introvertida', 't-introvert'],
  ['extrovert', 't-extrovert'],
  ['extrovertido', 't-extrovert'],
  ['extrovertida', 't-extrovert'],
  ['high reactivity', 't-high-react'],
  ['alta reactividad', 't-high-react'],
  ['reactividad alta', 't-high-react'],
  ['low reactivity', 't-low-react'],
  ['baja reactividad', 't-low-react'],
  ['reactividad baja', 't-low-react'],
  ['high self-regulation', 't-ec-high'],
  ['alta autorregulacion', 't-ec-high'],
  ['autorregulacion alta', 't-ec-high'],
  ['low self-regulation', 't-ec-low'],
  ['baja autorregulacion', 't-ec-low'],
  ['autorregulacion baja', 't-ec-low'],
  ['communication: advanced', 't-comm-adv'],
  ['comunicacion: avanzada', 't-comm-adv'],
  ['comunicacion: avanzado', 't-comm-adv'],
  ['communication: developing', 't-comm-dev'],
  ['comunicacion: en desarrollo', 't-comm-dev'],
  ['comunicacion en desarrollo', 't-comm-dev'],
  ['problem solving: advanced', 't-ps-adv'],
  ['resolucion de problemas: avanzada', 't-ps-adv'],
  ['problem solving: developing', 't-ps-dev'],
  ['resolucion de problemas: en desarrollo', 't-ps-dev'],
  ['gross motor: advanced', 't-gm-adv'],
  ['motricidad gruesa: avanzada', 't-gm-adv'],
  ['gross motor: developing', 't-gm-dev'],
  ['motricidad gruesa: en desarrollo', 't-gm-dev'],
  ['fine motor: advanced', 't-fm-adv'],
  ['motricidad fina: avanzada', 't-fm-adv'],
  ['fine motor: developing', 't-fm-dev'],
  ['motricidad fina: en desarrollo', 't-fm-dev'],
  ['personal-social: advanced', 't-social-adv'],
  ['personal-social: avanzada', 't-social-adv'],
  ['personal-social: avanzado', 't-social-adv'],
  ['personal-social: developing', 't-social-dev'],
  ['personal-social: en desarrollo', 't-social-dev'],
  ['personal-social en desarrollo', 't-social-dev'],
  ['inhibit: advanced', 't-inhib-adv'],
  ['inhibicion: avanzada', 't-inhib-adv'],
  ['inhibit: developing', 't-inhib-dev'],
  ['inhibicion: en desarrollo', 't-inhib-dev'],
  ['inhibicion en desarrollo', 't-inhib-dev'],
  ['shift: advanced', 't-shift-adv'],
  ['flexibilidad: avanzada', 't-shift-adv'],
  ['flexibilidad cognitiva: avanzada', 't-shift-adv'],
  ['shift: developing', 't-shift-dev'],
  ['flexibilidad: en desarrollo', 't-shift-dev'],
  ['flexibilidad cognitiva: en desarrollo', 't-shift-dev'],
  ['emotional control: advanced', 't-emoctl-adv'],
  ['control emocional: avanzado', 't-emoctl-adv'],
  ['emotional control: developing', 't-emoctl-dev'],
  ['control emocional: en desarrollo', 't-emoctl-dev'],
  ['control emocional en desarrollo', 't-emoctl-dev'],
  ['working memory: advanced', 't-wm-adv'],
  ['memoria de trabajo: avanzada', 't-wm-adv'],
  ['working memory: developing', 't-wm-dev'],
  ['memoria de trabajo: en desarrollo', 't-wm-dev'],
  ['plan/organize: advanced', 't-plan-adv'],
  ['planificacion/organizacion: avanzada', 't-plan-adv'],
  ['planificar/organizar: avanzado', 't-plan-adv'],
  ['plan/organize: developing', 't-plan-dev'],
  ['planificacion/organizacion: en desarrollo', 't-plan-dev'],
  ['planificar/organizar: en desarrollo', 't-plan-dev'],
]);

function normalizedClassList(node) {
  const current = node.properties?.className;
  if (Array.isArray(current)) return current.map(String);
  if (typeof current === 'string') return current.split(/\s+/u).filter(Boolean);
  return [];
}

function addClasses(node, ctx, ...classes) {
  const next = [...new Set([...normalizedClassList(node), ...classes.filter(Boolean)])];
  ctx.setProperty(node, 'className', next);
}

function elementChildren(node) {
  return Array.isArray(node.children)
    ? node.children.filter((child) => child.type === 'element')
    : [];
}

function previousElement(node, ctx) {
  const parent = ctx.parent(node);
  const index = ctx.indexOf(node);
  if (!parent || index === undefined || !Array.isArray(parent.children)) return undefined;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const sibling = parent.children[cursor];
    if (sibling.type === 'element') return sibling;
  }
  return undefined;
}

function precedingHeading(node, ctx) {
  const parent = ctx.parent(node);
  const index = ctx.indexOf(node);
  if (!parent || index === undefined || !Array.isArray(parent.children)) return undefined;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const sibling = parent.children[cursor];
    if (sibling.type === 'element' && /^h[1-6]$/u.test(sibling.tagName)) return sibling;
  }
  return undefined;
}

function precedingRegisteredSection(node, ctx) {
  const parent = ctx.parent(node);
  const index = ctx.indexOf(node);
  if (!parent || index === undefined || !Array.isArray(parent.children)) return undefined;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const sibling = parent.children[cursor];
    if (sibling.type !== 'element' || !/^h[1-2]$/u.test(sibling.tagName)) continue;
    if (sibling.tagName === 'h1') return undefined;
    const section = sectionForHeading(sibling, ctx);
    if (section) return section;
  }
  return undefined;
}

function phaseIdFromContext(ctx) {
  const frontmatterPhaseId = ctx.data?.astro?.frontmatter?.phaseId;
  if (typeof frontmatterPhaseId === 'string') return frontmatterPhaseId;
  const pathname = ctx.fileURL?.pathname ?? '';
  return pathname.match(/\/(framework|age-\d+-\d+)\.md$/u)?.[1] ?? '';
}

function sectionForHeading(node, ctx) {
  if (node?.type !== 'element' || !/^h[1-6]$/u.test(node.tagName)) return undefined;
  return resolvePhaseSection(ctx.textContent(node), phaseIdFromContext(ctx));
}

function isPriorityHeading(node, ctx) {
  if (node?.type !== 'element' || !/^h[2-4]$/u.test(node.tagName)) return false;
  return /^(?:priorities|prioridades)\b/iu.test(normalizeHeadingText(ctx.textContent(node)));
}

function classifyOrderedList(node, ctx) {
  if (node?.type !== 'element' || node.tagName !== 'ol') return undefined;
  const heading = precedingHeading(node, ctx);
  const section = sectionForHeading(heading, ctx);
  if (section && TARGET_SECTION_KEYS.has(section.key)) return 'targets';
  if (isPriorityHeading(heading, ctx)) return 'priorities';
  return undefined;
}

function listItemOrdinal(node, ctx) {
  const parent = ctx.parent(node);
  const index = ctx.indexOf(node);
  if (!parent || index === undefined || !Array.isArray(parent.children)) return undefined;
  return parent.children
    .slice(0, index + 1)
    .filter((child) => child.type === 'element' && child.tagName === 'li')
    .length;
}

function firstDescendantElement(node, tagName) {
  for (const child of elementChildren(node)) {
    if (child.tagName === tagName) return child;
    const nested = firstDescendantElement(child, tagName);
    if (nested) return nested;
  }
  return undefined;
}

function profileMetadata(blockquote, ctx) {
  const strong = firstDescendantElement(blockquote, 'strong');
  if (!strong) return undefined;
  const labelText = normalizeHeadingText(ctx.textContent(strong));
  const match = labelText.match(/^(?:profile|perfil)\s*[\u2014:\-]\s*(.+?)\.?$/iu);
  if (!match) return undefined;
  const label = match[1].trim();
  return { label, strong };
}

function normalizeProfileLabel(label) {
  return normalizeHeadingText(label)
    .replace(/\s+—\s+.*$/u, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en');
}

export function resolveLegacyProfileClass(label) {
  return PROFILE_CLASS_BY_LABEL.get(normalizeProfileLabel(label));
}

function hasMaterialIcon(node) {
  return elementChildren(node).some((child) => (
    child.tagName === 'span' && normalizedClassList(child).includes('material-symbols-rounded')
  ));
}

function decorateHeading(node, ctx) {
  const phaseId = phaseIdFromContext(ctx);
  const section = resolvePhaseSection(ctx.textContent(node), phaseId);
  if (!section) {
    if (isPriorityHeading(node, ctx)) {
      addClasses(node, ctx, 'priority-heading');
      ctx.setProperty(node, 'data-section-key', 'priorities');
    }
    return;
  }

  addClasses(
    node,
    ctx,
    'phase-section-heading',
    phaseId === 'framework' && FRAMEWORK_HEADER_KEYS.has(section.key) ? 'fw-section-header' : undefined
  );
  ctx.setProperty(node, 'id', section.id);
  ctx.setProperty(node, 'data-section-key', section.key);
  if (section.tier) ctx.setProperty(node, 'data-tier', section.tier);
  if (section.icon && !hasMaterialIcon(node)) {
    ctx.prependChild(node, {
      type: 'element',
      tagName: 'span',
      properties: {
        className: ['material-symbols-rounded'],
        'aria-hidden': 'true',
      },
      children: [{ type: 'text', value: section.icon }],
    });
  }
}

function decorateParagraph(node, ctx) {
  const preceding = previousElement(node, ctx);
  if (preceding?.tagName === 'h1') addClasses(node, ctx, 'subtitle');
  const phaseId = phaseIdFromContext(ctx);
  if (
    ['age-14-16', 'age-17-18'].includes(phaseId)
    && preceding?.tagName === 'h2'
    && sectionForHeading(preceding, ctx)?.key === 'rhythm'
  ) {
    addClasses(node, ctx, 'subtitle');
  }
}

function decorateOrderedList(node, ctx) {
  const kind = classifyOrderedList(node, ctx);
  if (kind === 'targets') {
    addClasses(node, ctx, 'target-grid');
    ctx.setProperty(node, 'data-target-map', '');
  } else if (kind === 'priorities') {
    addClasses(node, ctx, 'priority-box');
    ctx.setProperty(node, 'data-priority-list', '');
  }
}

function decorateListItem(node, ctx) {
  const list = ctx.parent(node);
  const kind = classifyOrderedList(list, ctx);
  if (!kind) return;

  const ordinal = listItemOrdinal(node, ctx);
  const strong = firstDescendantElement(node, 'strong');
  if (kind === 'targets') {
    addClasses(node, ctx, 'target-card');
    if (strong) addClasses(strong, ctx, 'target-card-title');
    if (ordinal) {
      ctx.prependChild(node, {
        type: 'element',
        tagName: 'span',
        properties: { className: ['target-num'], 'aria-hidden': 'true' },
        children: [{ type: 'text', value: String(ordinal) }],
      });
    }
  } else {
    addClasses(node, ctx, 'priority-item');
    if (strong) addClasses(strong, ctx, 'priority-title');
    if (ordinal) {
      ctx.prependChild(node, {
        type: 'element',
        tagName: 'span',
        properties: { className: ['priority-num'], 'aria-hidden': 'true' },
        children: [{ type: 'text', value: String(ordinal) }],
      });
    }
  }
}

function decorateBlockquote(node, ctx) {
  const visibleText = normalizeHeadingText(ctx.textContent(node));
  const heading = precedingHeading(node, ctx);
  const headingText = normalizeHeadingText(heading ? ctx.textContent(heading) : '');
  if (/^(?:note|nota)\./iu.test(visibleText)) {
    addClasses(node, ctx, 'note-box');
    ctx.setProperty(node, 'data-callout', 'note');
    return;
  }
  if (/^(?:warning|advertencia|aviso)\./iu.test(visibleText)) {
    addClasses(node, ctx, 'warn-box');
    ctx.setProperty(node, 'data-callout', 'warning');
    return;
  }
  if (/^(?:evidence|evidencia)\./iu.test(visibleText)) {
    addClasses(node, ctx, 'evidence', 'evidence-callout');
    ctx.setProperty(node, 'data-callout', 'evidence');
    return;
  }
  if (/^(?:principle|principio)\s+\d+\b/iu.test(headingText) && !/^(?:evidence|evidencia)\./iu.test(visibleText)) {
    addClasses(node, ctx, 'principle-thesis');
    ctx.setProperty(node, 'data-callout', 'principle-thesis');
    return;
  }
  if (/(?:repair script|guion de reparaci[oó]n)/iu.test(headingText)) {
    addClasses(node, ctx, 'repair-script');
    ctx.setProperty(node, 'data-callout', 'repair-script');
    return;
  }

  const profile = profileMetadata(node, ctx);
  if (!profile) return;
  const legacyClass = resolveLegacyProfileClass(profile.label);
  addClasses(node, ctx, 't-adjust', legacyClass);
  addClasses(profile.strong, ctx, 't-label');
  ctx.setProperty(node, 'data-profile', profile.label);
}

function decorateTable(node, ctx) {
  const heading = precedingHeading(node, ctx);
  const tableText = normalizeHeadingText(ctx.textContent(node));
  const isPraiseAntipattern = (
    (heading && /(?:anti-pattern table|tabla de anti-patrones)/iu.test(normalizeHeadingText(ctx.textContent(heading))))
    || /^(?:default verbal a eliminar|verbal default to eliminate)\b/iu.test(tableText)
  );
  const section = precedingRegisteredSection(node, ctx);
  addClasses(node, ctx, isPraiseAntipattern ? 'praise-antipattern' : undefined, section ? 'phase-table' : undefined);
  if (!section) return;
  ctx.setProperty(node, 'data-section-key', section.key);
}

/**
 * Presentation-only transformation for semantic phase Markdown.
 *
 * The plugin derives classes and stable hooks from visible Markdown structure;
 * it owns no curriculum wording or model values.
 */
export const phasePresentationPlugin = {
  name: 'phase-presentation',
  element: {
    filter: ['h1', 'h2', 'h3', 'h4', 'p', 'ol', 'li', 'blockquote', 'table'],
    visit(node, ctx) {
      if (!phaseIdFromContext(ctx)) return;
      if (/^h[1-4]$/u.test(node.tagName)) decorateHeading(node, ctx);
      else if (node.tagName === 'p') decorateParagraph(node, ctx);
      else if (node.tagName === 'ol') decorateOrderedList(node, ctx);
      else if (node.tagName === 'li') decorateListItem(node, ctx);
      else if (node.tagName === 'blockquote') decorateBlockquote(node, ctx);
      else if (node.tagName === 'table') decorateTable(node, ctx);
    },
  },
};
