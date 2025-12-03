function pickColorFromString(str) {
  const palette = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#17becf", "#bcbd22"
  ];
  if (!str) return palette[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function escapeXml(txt) {
  return String(txt)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateInitialAvatar(name, opts = {}) {
  const size = opts.size || 256;
  const bg = opts.bgColor || pickColorFromString(name || "");
  const textColor = opts.textColor || "#fff";
  const letter = name && name.trim() ? name[0].toUpperCase() : "?";

  const fontSize = Math.floor(size * 0.5);
  const rx = Math.floor(size * 0.12);

  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
    <rect width='100%' height='100%' rx='${rx}' fill='${bg}' />
    <text x='50%' y='50%' dy='0.36em'
      text-anchor='middle'
      font-size='${fontSize}'
      font-weight='600'
      font-family='Arial'
      fill='${textColor}'>
      ${escapeXml(letter)}
    </text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

module.exports = { generateInitialAvatar };
