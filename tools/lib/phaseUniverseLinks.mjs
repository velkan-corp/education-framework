import { normalizeUniverseId } from '../../src/scripts/universeRefs.js';

const LEGACY_UNIVERSE_ATTRIBUTE = /\bdata-universe-nav\s*=\s*(["'])(.*?)\1/iu;
const HREF_ATTRIBUTE = /\bhref\s*=\s*(["'])(.*?)\1/iu;

export function canonicalUniverseFragment(value) {
  const universeId = normalizeUniverseId(value);
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(universeId)) {
    throw new Error(`Invalid legacy universe ID '${value}'`);
  }
  return `#universe-${universeId}`;
}

/**
 * Give legacy data-only universe anchors a real href before Pandoc runs.
 * Pandoc then emits ordinary Markdown links; the later cleanup pass may safely
 * discard the application-specific attribute without discarding its identity.
 */
export function rewriteLegacyUniverseAnchorHrefs(source) {
  let rewritten = 0;
  const output = source.replace(/<a\b[^>]*>/giu, (tag) => {
    const universeAttribute = tag.match(LEGACY_UNIVERSE_ATTRIBUTE);
    if (!universeAttribute) return tag;

    const expectedHref = canonicalUniverseFragment(universeAttribute[2]);
    const hrefAttribute = tag.match(HREF_ATTRIBUTE);
    if (hrefAttribute) {
      if (hrefAttribute[2] !== expectedHref) {
        throw new Error(
          `Legacy universe anchor has conflicting href '${hrefAttribute[2]}' and identity '${expectedHref}'`
        );
      }
      return tag;
    }

    rewritten += 1;
    return tag.replace(/>$/u, ` href="${expectedHref}">`);
  });

  return { source: output, rewritten };
}
