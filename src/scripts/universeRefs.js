/**
 * Convert every supported legacy universe reference into the canonical content ID.
 * Phase content historically used both `dune.md` and `#universe-dune`; runtime
 * collection IDs use `dune`.
 */
export function normalizeUniverseId(value) {
  if (typeof value !== 'string') return '';

  let id = value.trim();
  if (id.startsWith('#universe-')) id = id.slice('#universe-'.length);
  else if (id.startsWith('universe-')) id = id.slice('universe-'.length);

  return id.replace(/\.md$/i, '');
}

export function getUniverseIdFromElement(element) {
  if (!element) return '';
  const explicitId = element.dataset?.universeNav;
  if (explicitId) return normalizeUniverseId(explicitId);

  const href = element.getAttribute?.('href') ?? '';
  return href.startsWith('#universe-') ? normalizeUniverseId(href) : '';
}
