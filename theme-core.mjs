// Only these saved settings can cross from pasted CSS into the live theme.
const colors = new Map([
  ['accent', 'accent'], ['night', 'night'], ['paper', 'paper'],
  ['surface', 'surface'], ['secondary', 'secondary'], ['warm', 'warm'],
  ['guitar-stars', 'guitarStars'], ['guitar-strings', 'guitarStrings'],
  ['guitar-glow', 'guitarGlow'], ['sky-glow', 'skyGlow'], ['sky-warm', 'skyWarm']
]);

const fontStacks = new Map([
  ["'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif", 'Inter Tight'],
  ['"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif', 'Inter Tight'],
  ["'Helvetica Neue', Helvetica, Arial, sans-serif", 'Helvetica Neue'],
  ['"Helvetica Neue", Helvetica, Arial, sans-serif', 'Helvetica Neue'],
  ['Arial, sans-serif', 'Arial'],
  ["'JetBrains Mono', monospace", 'JetBrains Mono'],
  ['"JetBrains Mono", monospace', 'JetBrains Mono'],
  ["'IBM Plex Mono', monospace", 'IBM Plex Mono'],
  ['"IBM Plex Mono", monospace', 'IBM Plex Mono'],
  ["'Space Mono', monospace", 'Space Mono'],
  ['"Space Mono", monospace', 'Space Mono']
]);

export function parseThemeCss(source) {
  if (typeof source !== 'string' || source.length > 20000) throw new Error('Paste a theme CSS block under 20 KB.');
  if ((source.match(/\/\*/g) || []).length !== (source.match(/\*\//g) || []).length) throw new Error('A CSS comment is unfinished.');
  let css = source.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const wrapped = css.match(/^:root\s*\{([\s\S]*)\}$/);
  if (wrapped) css = wrapped[1].trim();
  if (!css || /[{}]/.test(css)) throw new Error('Paste declarations inside one :root { … } block.');
  const result = {};
  const declarations = css.split(';').map(part => part.trim()).filter(Boolean);
  for (const declaration of declarations) {
    const match = declaration.match(/^(--[a-z][a-z-]*)\s*:\s*(.+)$/i);
    if (!match) throw new Error(`Unsupported declaration: ${declaration.slice(0, 48)}.`);
    const [, property, value] = match;
    const name = property.slice(2).toLowerCase();
    if (colors.has(name)) {
      if (!/^#[0-9a-f]{6}$/i.test(value.trim())) throw new Error(`${property} needs a six-digit HEX color such as #cfee61.`);
      result[colors.get(name)] = value.trim().toLowerCase();
      continue;
    }
    if (['f-sans', 'f-display', 'f-mono'].includes(name)) {
      const font = fontStacks.get(value.trim());
      if (!font) throw new Error(`Unsupported font for ${property}. Choose a listed theme font.`);
      const mono = font.endsWith('Mono');
      if (name === 'f-mono' && !mono) throw new Error(`${property} needs a listed mono font.`);
      if (name === 'f-sans' && mono) throw new Error(`${property} needs a listed sans font.`);
      if (name === 'f-display' && mono) result.highlightFont = font; // legacy exports used mono headings
      else result[name === 'f-mono' ? 'highlightFont' : 'font'] = font;
      continue;
    }
    throw new Error(`Unsupported declaration ${property}. Only theme colors and fonts can be applied.`);
  }
  if (!declarations.length) throw new Error('The theme has no declarations to apply.');
  return result;
}
