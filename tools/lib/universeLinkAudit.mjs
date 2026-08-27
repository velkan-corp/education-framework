import { normalizeUniverseId } from '../../src/scripts/universeRefs.js';

const aliasEntries = [];

function register(id, policy, ...aliases) {
  for (const alias of aliases) aliasEntries.push({ alias, id, policy });
}

// Both policies are audited in the first cell of semantically identified
// Resource/Recurso tables. `resource` marks aliases that are too ambiguous for
// any future prose-wide audit; this checker deliberately does not infer links
// from ordinary prose.
register('richard-scarry', 'safe', 'Richard Scarry');
register('wheres-wally', 'safe', "Where's Wally", 'Wheres Wally');
register('eric-carle', 'safe', 'Eric Carle');
register('dr-seuss', 'safe', 'Dr. Seuss', 'Dr Seuss');
register('julia-donaldson', 'safe', 'Julia Donaldson', 'Gruffalo');
register('ghibli', 'safe', 'Studio Ghibli', 'Ghibli', 'Princess Mononoke');
register('pokemon', 'safe', 'Pokémon', 'Pokemon');
register('little-prince', 'safe', 'The Little Prince', 'El Principito');
register('pixar', 'safe', 'Pixar', 'Inside Out', 'WALL-E');
register('dc-marvel', 'safe', 'Batman: The Animated Series', 'Spider-Man: Into the Spider-Verse');
register('attenborough', 'safe', 'David Attenborough');
register('minecraft', 'safe', 'Minecraft');
register('ender', 'safe', "Ender's Game", 'Enders Game');
register('tolkien', 'safe', 'J.R.R. Tolkien', 'Tolkien', 'The Hobbit', 'Lord of the Rings');
register('gaiman', 'safe', 'Neil Gaiman', 'Coraline', 'Sandman');
register('pullman', 'safe', 'Philip Pullman', 'His Dark Materials');
register('outer-wilds', 'safe', 'Outer Wilds');
register('sherlock', 'safe', 'Sherlock Holmes');
register('lotgh', 'safe', 'Legend of the Galactic Heroes');
register('sanderson', 'safe', 'Brandon Sanderson', 'Mistborn Era 1', 'Stormlight Archive');
register('asimov', 'safe', 'Isaac Asimov', 'Asimov');
register('kahneman', 'safe', 'Daniel Kahneman');
register('le-guin', 'safe', 'Ursula K. Le Guin', 'Ursula Le Guin');
register('pratchett', 'safe', 'Terry Pratchett');
register('hunter-x-hunter', 'safe', 'Hunter × Hunter', 'Hunter x Hunter');
register('star-wars', 'safe', 'Star Wars', 'Knights of the Old Republic', 'KOTOR');
register('dnd', 'safe', 'Dungeons & Dragons', 'Dungeons and Dragons', 'D&D');
register('persepolis', 'safe', 'Persepolis', 'Persépolis');
register('heinlein', 'safe', 'Robert Heinlein', 'Heinlein');
register('naruto', 'safe', 'Naruto');
register('mob-psycho', 'safe', 'Mob Psycho 100');
register('shakespeare', 'safe', 'William Shakespeare', 'Shakespeare');
register('xcom', 'safe', 'XCOM');
register('papers-please', 'safe', 'Papers, Please');
register('cities-skylines', 'safe', 'Cities: Skylines');
register('hitchcock', 'safe', 'Alfred Hitchcock', 'Hitchcock');
register('maus', 'safe', 'Maus');
register('del-toro', 'safe', 'Guillermo del Toro', "Pan's Labyrinth", 'El Laberinto del Fauno');
register('cowboy-bebop', 'safe', 'Cowboy Bebop');
register('vinland-saga', 'safe', 'Vinland Saga');
register('villeneuve', 'safe', 'Denis Villeneuve', 'Blade Runner 2049');
register('villeneuve', 'resource', 'Arrival', 'Villeneuve');
register('coppola', 'safe', 'Francis Ford Coppola', 'Apocalypse Now');
register('bong-joon-ho', 'safe', 'Bong Joon-ho', 'Parasite');
register('orwell', 'safe', 'George Orwell', 'Orwell');
register('borges', 'safe', 'Jorge Luis Borges', 'Borges');
register('tarkovsky', 'safe', 'Andrei Tarkovsky', 'Tarkovsky');
register('kurosawa', 'safe', 'Akira Kurosawa', 'Kurosawa');
register('kubrick', 'safe', 'Stanley Kubrick', '2001: A Space Odyssey');
register('tao-te-ching', 'safe', 'Tao Te Ching');
register('ghost-in-the-shell', 'safe', 'Ghost in the Shell');
register('disco-elysium', 'safe', 'Disco Elysium');
register('evangelion', 'safe', 'Neon Genesis Evangelion');
register('ridley-scott', 'safe', 'Ridley Scott', 'Blade Runner: The Final Cut', 'Blade Runner The Final Cut');
register('ridley-scott', 'resource', 'Blade Runner');
register('nausicaa', 'safe', 'Nausicaa', 'Nausicaä');
register('dune', 'safe', 'Dune');
register('calvin-hobbes', 'safe', 'Calvin & Hobbes', 'Calvin and Hobbes');
register('harry-potter', 'safe', 'Harry Potter');
register('factorio', 'safe', 'Factorio');
register('fma', 'safe', 'Fullmetal Alchemist');
register('into-the-breach', 'safe', 'Into the Breach');
register('ksp', 'safe', 'Kerbal Space Program');
register('mafalda', 'safe', 'Mafalda');
register('mtg', 'safe', 'Magic: The Gathering');
register('rimworld', 'safe', 'Rimworld');
register('roald-dahl', 'safe', 'Roald Dahl');
register('watchmen', 'safe', 'Watchmen');
register('witcher', 'safe', 'The Witcher');
register('asterix', 'safe', 'Asterix', 'Astérix');
register('tintin', 'safe', 'Tintin', 'Tintín');
register('debate-rhetoric', 'safe', 'Getting to Yes');
register('warhammer', 'safe', 'Warhammer');
register('gymnastics-acrobatics', 'resource',
  'Tumbling Mat',
  'Gymnastics Mat',
  'Gymnastics Rings',
  'Anillas de gimnasia');
register('dance', 'resource',
  'Latin Dance Family Playlist',
  'Ballet Shoes',
  'Latin Dance Shoes');
register('material-craft', 'resource',
  'Sensory Material Sample Box',
  'Kintsugi Repair Kit',
  'Kit de reparación Kintsugi',
  'Shoe Goo');
register('cooking', 'resource', 'Child-Sized Cooking Tools');
register('martial-arts', 'resource',
  'Jiu-Jitsu or martial arts enrollment',
  'Inscripción en Jiu-Jitsu o artes marciales',
  'Gracie Jiu-Jitsu Bullyproof Kids Program');
register('dk-visual-reference', 'resource', 'DK Eyewitness Series', 'Nat Geo Kids Magazine', 'Horrible Histories');
register('coding', 'resource',
  'Cubetto Playset',
  'Scratch → Python transition',
  'Scratch to Python transition',
  'Transición de Scratch a Python',
  'Automate the Boring Stuff with Python');
register('personal-finance', 'resource', 'Moonjar Save Spend Share Bank');
register('fairy-tales', 'resource', "The Emperor's New Clothes");
register('poetry', 'resource', 'García Lorca', 'Octavio Paz');
register('western-philosophy', 'resource', 'Plato', 'Seneca', 'Marcus Aurelius', 'Nietzsche');
register('economics', 'resource', 'Adam Smith');
register('cognitive-science', 'resource', 'Anki');
register('spatial-intelligence', 'resource',
  'Connectography',
  "Grimm's Rainbow",
  "Grimm's Nesting/Stacking Cups",
  'Magna-Tiles',
  'Brio World Wooden Train',
  'Hape Shape Sorting Box',
  'Plan Toys Sorting Bus');
register('historical-cycles', 'resource', 'Thucydides');
register('bible-as-literature', 'resource', 'Book of Job');

register('avatar', 'resource', 'Avatar', 'Legend of Korra');
register('bone', 'resource', 'Bone');
register('chess', 'resource', 'Chess', 'Ajedrez');
register('civilization', 'resource', 'Civilization');
register('go', 'resource', 'Go (board game)', 'Go (juego de mesa)', 'Go Board Set', 'Tablero de Go');
register('homer', 'resource', 'Homer', 'Homero');
register('lego', 'resource', 'LEGO', 'Duplo Large Set', 'Duplo Large Creative Box');
register('monster', 'resource', 'Monster');
register('portal', 'resource', 'Portal');

export const DEFAULT_UNIVERSE_ALIASES = Object.freeze(aliasEntries.map((entry) => Object.freeze(entry)));

export const DEFAULT_LOCALE_ONLY_SUBSTITUTIONS = Object.freeze([]);

function textContent(node) {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.value === 'string' && node.type !== 'yaml') return node.value;
  if (typeof node.alt === 'string') return node.alt;
  return Array.isArray(node.children) ? node.children.map(textContent).join('') : '';
}

function walk(node, visitor, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  visitor(node, ancestors);
  for (const child of node.children ?? []) walk(child, visitor, [...ancestors, node]);
}

function normalizeForMatch(value) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’‘]/gu, "'")
    .replace(/×/gu, 'x')
    .toLocaleLowerCase('en')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function containsNormalized(haystack, needle) {
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function aliasCatalog(entries) {
  const catalog = new Map();
  for (const entry of entries) {
    if (!['safe', 'resource'].includes(entry.policy)) {
      throw new Error(`Universe alias '${entry.alias}' has unsupported policy '${entry.policy}'`);
    }
    const normalized = normalizeForMatch(entry.alias);
    if (normalized.length < 2) throw new Error(`Universe alias '${entry.alias}' is not substantive`);
    const current = catalog.get(normalized);
    if (current && current.id !== entry.id) {
      throw new Error(`Universe alias '${entry.alias}' ambiguously maps to ${current.id} and ${entry.id}`);
    }
    if (!current || (current.policy === 'resource' && entry.policy === 'safe')) {
      catalog.set(normalized, { ...entry, normalized });
    }
  }
  return [...catalog.values()].sort((left, right) => right.normalized.length - left.normalized.length);
}

function aliasesRecognized(value, catalog, includeResourcePolicy) {
  const normalized = normalizeForMatch(value);
  const matches = [];
  for (const entry of catalog) {
    if (entry.policy === 'resource' && !includeResourcePolicy) continue;
    if (!containsNormalized(normalized, entry.normalized)) continue;
    // Longest match wins when one title contains another. This makes
    // `Blade Runner 2049` distinct from the standalone `Blade Runner` without
    // sacrificing composite rows such as `LEGO Star Wars`.
    if (matches.some((match) => containsNormalized(match.normalized, entry.normalized))) continue;
    matches.push(entry);
  }
  return matches;
}

function universeLinks(node, catalog) {
  const links = [];
  walk(node, (child) => {
    if (child.type !== 'link' || !child.url.startsWith('#universe-')) return;
    links.push({
      id: normalizeUniverseId(child.url),
      label: textContent(child),
      recognizedIds: sortedUnique(
        aliasesRecognized(textContent(child), catalog, true).map((match) => match.id)
      ),
    });
  });
  return links;
}

function isResourceTable(table) {
  const firstCell = table.children?.[0]?.children?.[0];
  return /^(?:resource|recurso|game|juego)$/u.test(normalizeForMatch(textContent(firstCell)));
}

function isTierRow(row, label) {
  const remainingCellsAreEmpty = (row.children ?? [])
    .slice(1)
    .every((cell) => textContent(cell).trim() === '');
  return remainingCellsAreEmpty
    && /^(?:foundational|fundacional|fundamental|core|central|recommended|recomendado)\b/u
      .test(normalizeForMatch(label));
}

function collectResourceRows(file, catalog) {
  const rows = [];
  let tableIndex = 0;
  walk(file.tree, (node) => {
    if (node.type !== 'table' || !isResourceTable(node)) return;
    tableIndex += 1;
    for (const [zeroBasedRow, row] of (node.children ?? []).slice(1).entries()) {
      const firstCell = row.children?.[0];
      const label = textContent(firstCell).replace(/\s+/gu, ' ').trim();
      const recognized = isTierRow(row, label) ? [] : aliasesRecognized(label, catalog, true);
      const identityLinks = universeLinks(firstCell, catalog);
      rows.push({
        key: `${file.filename}:table-${tableIndex}:row-${zeroBasedRow + 1}`,
        filename: file.filename,
        line: row.position?.start?.line ?? '?',
        tableIndex,
        rowIndex: zeroBasedRow + 1,
        label,
        linkedIds: sortedUnique(identityLinks.map((link) => link.id)),
        recognizedIds: sortedUnique(recognized.map((match) => match.id)),
        identityLinks,
        recognized,
        firstCell,
        rowNode: row,
      });
    }
  });
  return rows;
}

function validateSubstitutions(substitutions) {
  const errors = [];
  const byKey = new Map();
  for (const entry of substitutions) {
    if (!entry || typeof entry.key !== 'string' || !entry.key) {
      errors.push('universe locale substitution: every entry requires a resource-row key');
      continue;
    }
    if (byKey.has(entry.key)) errors.push(`universe locale substitution: duplicate key ${entry.key}`);
    if (typeof entry.rationale !== 'string' || entry.rationale.trim().length < 24) {
      errors.push(`universe locale substitution ${entry.key}: rationale must be at least 24 characters`);
    }
    if (!Array.isArray(entry.enIds) || !Array.isArray(entry.esIds)) {
      errors.push(`universe locale substitution ${entry.key}: enIds and esIds must be arrays`);
    }
    byKey.set(entry.key, entry);
  }
  return { errors, byKey };
}

export function auditLocaleUniverseLinks({
  localeId,
  phaseFiles,
  universeIds,
  aliases = DEFAULT_UNIVERSE_ALIASES,
}) {
  const errors = [];
  const references = [];
  const catalog = aliasCatalog(aliases);
  const resourceRows = phaseFiles.flatMap((file) => collectResourceRows(file, catalog));
  let recognizableMentionCount = 0;

  for (const entry of catalog) {
    if (!universeIds.has(entry.id)) {
      errors.push(`${localeId}/universes: curated alias '${entry.alias}' references unknown universe ${entry.id}`);
    }
  }

  for (const file of phaseFiles) {
    walk(file.tree, (node, ancestors) => {
      if (node.type === 'link' && node.url.startsWith('#universe-')) {
        const universeId = normalizeUniverseId(node.url);
        references.push([file.filename, universeId]);
        if (node.url !== `#universe-${universeId}`) {
          errors.push(`${localeId}/${file.filename}:${node.position?.start?.line ?? '?'}: universe link must use canonical fragment '#universe-${universeId}'`);
        }
        if (!universeIds.has(universeId)) {
          errors.push(`${localeId}/${file.filename}:${node.position?.start?.line ?? '?'}: unknown universe reference ${node.url}`);
        }
        const recognized = aliasesRecognized(textContent(node), catalog, true);
        for (const match of recognized) {
          if (match.id !== universeId) {
            errors.push(`${localeId}/${file.filename}:${node.position?.start?.line ?? '?'}: linked label '${textContent(node)}' recognizes ${match.id}, not ${universeId}`);
          }
        }
        return;
      }

    });
  }

  for (const row of resourceRows) {
    const matchesById = Map.groupBy(row.recognized, (match) => match.id);
    recognizableMentionCount += matchesById.size;
    for (const [universeId, matches] of matchesById) {
      const identityIsLinked = row.identityLinks.some((link) => (
        link.id === universeId && link.recognizedIds.includes(universeId)
      ));
      if (!identityIsLinked) {
        const aliases = sortedUnique(matches.map((match) => match.alias));
        errors.push(`${localeId}/${row.filename}:${row.line}: resource '${row.label}' recognizes [${aliases.join('; ')}] but the recognized title itself is not linked to #universe-${universeId}`);
      }
    }
  }

  return {
    errors,
    referenceCount: references.length,
    references,
    recognizableMentionCount,
    resourceRows,
  };
}

export function auditBilingualResourceLinkParity(
  englishAudit,
  spanishAudit,
  { substitutions = DEFAULT_LOCALE_ONLY_SUBSTITUTIONS } = {}
) {
  const errors = [];
  const substitutionAudit = validateSubstitutions(substitutions);
  errors.push(...substitutionAudit.errors);
  const englishRows = new Map(englishAudit.resourceRows.map((row) => [row.key, row]));
  const spanishRows = new Map(spanishAudit.resourceRows.map((row) => [row.key, row]));
  const allKeys = new Set([...englishRows.keys(), ...spanishRows.keys()]);
  const consumedSubstitutions = new Set();

  for (const key of [...allKeys].sort((left, right) => left.localeCompare(right))) {
    const english = englishRows.get(key);
    const spanish = spanishRows.get(key);
    if (!english || !spanish) {
      errors.push(`universe resource parity ${key}: equivalent EN/ES row is missing`);
      continue;
    }
    const allowed = substitutionAudit.byKey.get(key);
    const linksMatch = JSON.stringify(english.linkedIds) === JSON.stringify(spanish.linkedIds);
    const recognitionMatches = JSON.stringify(english.recognizedIds) === JSON.stringify(spanish.recognizedIds);
    if (linksMatch && recognitionMatches) {
      if (allowed) {
        errors.push(`universe locale substitution ${key}: stale allowlist entry; EN and ES no longer differ`);
      }
      continue;
    }
    if (!allowed) {
      if (!recognitionMatches) {
        errors.push(`universe recognition parity ${key}: EN recognizes [${english.recognizedIds.join(', ')}], ES recognizes [${spanish.recognizedIds.join(', ')}]`);
      }
      if (!linksMatch) {
        errors.push(`universe resource parity ${key}: EN resolves [${english.linkedIds.join(', ')}], ES resolves [${spanish.linkedIds.join(', ')}]`);
      }
      continue;
    }
    consumedSubstitutions.add(key);
    const expectedEnglish = sortedUnique(allowed.enIds ?? []);
    const expectedSpanish = sortedUnique(allowed.esIds ?? []);
    if (JSON.stringify(english.linkedIds) !== JSON.stringify(expectedEnglish)
        || JSON.stringify(spanish.linkedIds) !== JSON.stringify(expectedSpanish)) {
      errors.push(`universe locale substitution ${key}: observed IDs do not match its explicit EN/ES contract`);
    }
    if (JSON.stringify(english.recognizedIds) !== JSON.stringify(expectedEnglish)
        || JSON.stringify(spanish.recognizedIds) !== JSON.stringify(expectedSpanish)) {
      errors.push(`universe locale substitution ${key}: recognized identities do not match its explicit EN/ES contract`);
    }
  }

  for (const key of substitutionAudit.byKey.keys()) {
    if (!allKeys.has(key)) errors.push(`universe locale substitution ${key}: allowlisted row does not exist`);
    else if (!consumedSubstitutions.has(key)
        && !errors.some((error) => error.includes(`substitution ${key}: stale allowlist entry`))) {
      errors.push(`universe locale substitution ${key}: allowlist entry was not consumed by a locale mismatch`);
    }
  }
  return errors;
}
