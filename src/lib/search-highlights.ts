/** Find query matches without turning user input or article text into HTML. */
export type MatchRange = { start: number; end: number };
export type Tokenize = (text: string) => string[];

function withinOneEdit(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  let a = 0;
  let b = 0;
  let edits = 0;
  while (a < left.length && b < right.length) {
    if (left[a] === right[b]) { a++; b++; continue; }
    if (++edits > 1) return false;
    if (left.length >= right.length) a++;
    if (right.length >= left.length) b++;
  }
  return edits + Number(a < left.length || b < right.length) <= 1;
}

export function createMatcher(query: string, tokenize: Tokenize) {
  const terms = tokenize(query.trim()).filter(Boolean);
  const tolerateTypo = query.trim().length > 3;
  return (text: string): MatchRange[] => {
    if (!terms.length) return [];
    const ranges: MatchRange[] = [];
    for (const word of text.matchAll(/[\p{L}\p{M}\p{N}]+/gu)) {
      const tokens = tokenize(word[0]);
      if (tokens.some(token => terms.some(term => token.startsWith(term) || (tolerateTypo && withinOneEdit(term, token))))) {
        ranges.push({ start: word.index, end: word.index + word[0].length });
      }
    }
    return ranges;
  };
}

/** Prefer the description; use a nearby passage when a match is in the article body. */
export function resultPreview(description: string, body: string, matches: (text: string) => MatchRange[], limit = 190): string {
  const descriptionMatches = matches(description);
  const bodyMatches = descriptionMatches.length ? [] : matches(body);
  const text = descriptionMatches.length || !bodyMatches.length ? description : body;
  const first = (descriptionMatches[0] || bodyMatches[0])?.start ?? 0;
  if (text.length <= limit) return text;
  let start = Math.max(0, first - 55);
  // Start and finish at a word boundary while keeping the match in view.
  if (start > 0) {
    const boundary = text.indexOf(' ', start);
    if (boundary !== -1 && boundary < first) start = boundary + 1;
  }
  let end = Math.min(text.length, Math.max(start + limit, first + 45));
  if (end < text.length) {
    const boundary = text.lastIndexOf(' ', end);
    if (boundary > first) end = boundary;
  }
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

export function appendHighlighted(target: HTMLElement, text: string, ranges: MatchRange[]): void {
  let cursor = 0;
  for (const { start, end } of ranges) {
    target.append(document.createTextNode(text.slice(cursor, start)));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(start, end);
    target.append(mark);
    cursor = end;
  }
  target.append(document.createTextNode(text.slice(cursor)));
}
