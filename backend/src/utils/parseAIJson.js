// Robust 3-strategy JSON parser for AI responses.
// 1) Direct JSON.parse on trimmed content
// 2) Strip ```json fences then JSON.parse
// 3) Match the first {...} or [...] block via regex
// Returns parsed value, or null if all strategies fail.
export function parseAIJson(raw) {
  if (raw == null) return null;
  const text = typeof raw === 'string' ? raw.trim() : String(raw);

  try {
    return JSON.parse(text);
  } catch (_) {}

  try {
    const noFences = text.replace(/```json\s*|```\s*/gi, '').trim();
    return JSON.parse(noFences);
  } catch (_) {}

  try {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
  } catch (_) {}

  return null;
}

export default parseAIJson;
