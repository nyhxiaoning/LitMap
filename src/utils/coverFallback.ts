const FALLBACK_BG = "#dceae6";
const FALLBACK_INK = "#294742";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTitle(title: string, maxChars = 8): string[] {
  const chars = [...title.trim()];
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < 5; index += maxChars) {
    lines.push(chars.slice(index, index + maxChars).join(""));
  }
  return lines.length > 0 ? lines : ["未命名图书"];
}

/** Creates a self-contained SVG data URL so Leaflet markers also have a title fallback. */
export function getBookCoverFallbackDataUrl(title: string, color = FALLBACK_BG): string {
  const safeTitle = wrapTitle(title).map(escapeXml);
  const titleMarkup = safeTitle
    .map((line, index) => `<text x="50" y="${58 + index * 13}" text-anchor="middle">${line}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150" viewBox="0 0 100 150">
    <rect width="100" height="150" rx="6" fill="${escapeXml(color)}"/>
    <rect x="8" y="8" width="84" height="134" rx="4" fill="rgba(255,255,255,.34)" stroke="rgba(41,71,66,.16)"/>
    <path d="M20 30h60" stroke="rgba(41,71,66,.22)"/>
    <g fill="${FALLBACK_INK}" font-family="Arial, sans-serif" font-size="10" font-weight="700">${titleMarkup}</g>
    <text x="50" y="128" text-anchor="middle" fill="rgba(41,71,66,.55)" font-family="Arial, sans-serif" font-size="6" letter-spacing="1">LITMAP</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
