// Finds touchable elements in TSX source that a screen reader can't name or
// classify (CS-38). Used by the accessibility test, which fails on any hit.

const TOUCHABLES = ["Pressable", "TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback"];

export interface A11yGap {
  line: number;
  element: string;
  missing: string[];
}

/** The text of a JSX opening tag starting at `start`, honouring braces and `=>`. */
function openingTag(source: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
}

export function findA11yGaps(source: string): A11yGap[] {
  const gaps: A11yGap[] = [];
  const pattern = new RegExp(`<(${TOUCHABLES.join("|")})\\b`, "g");
  for (const match of source.matchAll(pattern)) {
    const tag = openingTag(source, match.index!);
    // Decorative or hidden on purpose.
    if (/\baccessible=\{false\}/.test(tag) || /\bimportantForAccessibility="no(-hide-descendants)?"/.test(tag)) continue;
    const missing: string[] = [];
    if (!/\baccessibilityRole=/.test(tag) && !/\brole=/.test(tag)) missing.push("accessibilityRole");
    if (!/\baccessibilityLabel=/.test(tag) && !/\baria-label=/.test(tag)) missing.push("accessibilityLabel");
    if (missing.length > 0) {
      gaps.push({ line: source.slice(0, match.index!).split("\n").length, element: match[1], missing });
    }
  }
  return gaps;
}

/** WCAG relative-luminance contrast ratio of two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
