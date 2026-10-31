// Builds the generated parts of my GitHub profile:
//   assets/banner-{dark,light}.svg    name banner over a fan of growth-percentile curves
//   assets/timeline-{dark,light}.svg  talks per year, from the catalog behind dbetebenner.github.io
//   README.md, between the talks markers: the most recent talks with their title-slide thumbnails
//
// Text is outlined from Josefin Sans (tools/fonts), because GitHub shows SVGs as images and an image
// cannot load web fonts.
//
// Usage: node tools/build.mjs            fetches the talk catalog from GitHub
//        TALKS_YAML=path node tools/build.mjs   reads a local copy instead
import opentype from "opentype.js";
import yaml from "js-yaml";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://dbetebenner.github.io";
const TALKS_URL = "https://raw.githubusercontent.com/dbetebenner/dbetebenner.github.io/master/catalog/talks.yml";

const font = (f) => {
  const b = fs.readFileSync(path.join(ROOT, "tools/fonts", f));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const bold = font("JosefinSans-Bold.ttf");
const medium = font("JosefinSans-Medium.ttf");

const f2 = (n) => +n.toFixed(2);

function text(str, { x, y, size, face = bold, anchor = "start", tracking = 0, fill }) {
  const scale = size / face.unitsPerEm;
  const glyphs = face.stringToGlyphs(str);
  let width = 0;
  const adv = glyphs.map((g, i) => {
    const kern = i < glyphs.length - 1 ? face.getKerningValue(g, glyphs[i + 1]) : 0;
    const w = (g.advanceWidth + kern) * scale + tracking * size;
    width += w;
    return w;
  });
  width -= tracking * size;
  let cx = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  let d = "";
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(2);
    cx += adv[i];
  });
  return { svg: `<path d="${d}" fill="${fill}"/>`, width };
}

// Dark matches the hex logos; light darkens the accents so they hold contrast on paper.
const THEMES = {
  dark: {
    bg: "#16170f", fg: "#f4f1ea", sub: "#d68b45", mute: "#8d8a7c", faint: "#3a3c2f",
    rose: "#e0a79a", copper: "#d68b45", sage: "#9db08a", blue: "#6aa6d8",
  },
  light: {
    bg: "#f4f1ea", fg: "#16170f", sub: "#9a5a1f", mute: "#5f5c50", faint: "#d9d3c4",
    rose: "#a5524a", copper: "#b8681f", sage: "#5d6a4c", blue: "#2f6fa8",
  },
};

const MOTION = `
  .draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 2.2s cubic-bezier(.2,.7,.2,1) forwards; }
  .fade { opacity: 0; animation: fade .8s ease-out forwards; }
  .grow { transform-box: fill-box; transform-origin: 50% 100%; animation: grow .9s cubic-bezier(.2,.7,.2,1) both; }
  @keyframes draw { to { stroke-dashoffset: 0; } }
  @keyframes fade { to { opacity: 1; } }
  @keyframes grow { from { transform: scaleY(0); } }
  @media (prefers-reduced-motion: reduce) {
    .draw, .fade, .grow { animation: none; stroke-dashoffset: 0; opacity: 1; }
    .runner { display: none; }
  }`;

// Standard normal quantile (Acklam's rational approximation), for spacing the percentile curves.
function qnorm(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const q = Math.min(p, 1 - p);
  if (q < 0.02425) {
    const r = Math.sqrt(-2 * Math.log(q));
    const z = (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
    return p < 0.5 ? z : -z;
  }
  const r = (p - 0.5) * (p - 0.5);
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * (p - 0.5)) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function banner(t) {
  const W = 1280, H = 320;
  const ox = 690, oy = 168, ex = 1170, spread = 60;
  const curve = (p) => {
    const ey = oy - qnorm(p / 100) * spread;
    const L = ex - ox;
    return { ey, d: `M${ox} ${oy} C ${f2(ox + 0.36 * L)} ${oy}, ${f2(ox + 0.56 * L)} ${f2(ey)}, ${ex} ${f2(ey)}` };
  };
  const out = [];
  for (let p = 5; p <= 95; p += 5) {
    if ([10, 25, 50, 75, 90].includes(p)) continue;
    const { d } = curve(p);
    out.push(`<path class="draw" pathLength="1" d="${d}" fill="none" stroke="${t.faint}" stroke-width="1.3" style="animation-delay:${f2(0.15 + Math.abs(p - 50) / 120)}s"/>`);
  }
  const key = [[10, t.rose, 2.4], [25, t.copper, 2.8], [50, t.fg, 4], [75, t.sage, 2.8], [90, t.blue, 2.4]];
  key.forEach(([p, col, w], i) => {
    const { d, ey } = curve(p);
    out.push(`<path class="draw" pathLength="1" d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" style="animation-delay:${0.5 + i * 0.12}s"/>`);
    out.push(`<g class="fade" style="animation-delay:${2 + i * 0.08}s"><circle cx="${ex}" cy="${f2(ey)}" r="${p === 50 ? 5 : 3.6}" fill="${col}"/>`);
    out.push(`${text(`${p}th`, { x: ex + 16, y: f2(ey + 6), size: 17, face: medium, fill: col }).svg}</g>`);
  });
  out.push(`<circle cx="${ox}" cy="${oy}" r="7" fill="${t.fg}"/>`);
  // one student, riding the 75th percentile curve: growth above the median
  out.push(`<g class="runner"><circle r="5.5" fill="${t.sage}" opacity="0"><animateMotion dur="5.5s" begin="2.6s" repeatCount="indefinite" path="${curve(75).d}" keyPoints="0;1;1" keyTimes="0;0.7;1" calcMode="spline" keySplines=".4 0 .2 1;0 0 1 1"/><animate attributeName="opacity" dur="5.5s" begin="2.6s" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;0.08;0.62;0.7;1"/></circle></g>`);

  const name = text("Damian Betebenner", { x: 64, y: 150, size: 60, fill: t.fg });
  const role = text("Student growth · educational assessment · open-source R", { x: 66, y: 194, size: 22, face: medium, fill: t.sub });
  const org = text("Senior Associate, Center for Assessment", { x: 66, y: 232, size: 18, face: medium, fill: t.mute });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Damian Betebenner</title>
<desc id="d">Student growth, educational assessment and open-source R. A fan of growth-percentile curves (10th, 25th, 50th, 75th and 90th highlighted) spreads from a single prior score.</desc>
<style>${MOTION}</style>
<rect width="${W}" height="${H}" rx="18" fill="${t.bg}"/>
${out.join("\n")}
${name.svg}
${role.svg}
${org.svg}
</svg>
`;
}

function timeline(t, counts, total, today) {
  const W = 1280, H = 300;
  const years = Object.keys(counts).map(Number).sort((a, b) => a - b);
  const first = years[0], last = Math.max(years.at(-1), today.getUTCFullYear());
  const span = last - first + 1;
  const x0 = 56, x1 = 1224, base = 238, hmax = 116;
  const step = (x1 - x0) / span, bw = step * 0.62;
  const max = Math.max(...Object.values(counts));
  const out = [];
  const xs = [];
  for (let i = 0; i < span; i++) {
    const yr = first + i, n = counts[yr] ?? 0;
    const h = (n / max) * hmax, x = x0 + i * step + (step - bw) / 2;
    xs.push([x + bw / 2, base - h]);
    const partial = yr === today.getUTCFullYear();
    const col = n === max ? t.blue : t.copper;
    if (n) {
      out.push(`<rect class="grow" style="animation-delay:${f2(i * 0.035)}s" x="${f2(x)}" y="${f2(base - h)}" width="${f2(bw)}" height="${f2(h)}" rx="3" fill="${col}" opacity="${partial ? 0.55 : 1}"/>`);
    }
    if (yr % 5 === 0 || yr === first || yr === last) {
      out.push(text(String(yr), { x: x + bw / 2, y: base + 30, size: 16, face: medium, anchor: "middle", fill: t.mute }).svg);
    }
    if (n === max) {
      out.push(`<g class="fade" style="animation-delay:1.2s">${text(`${n} in ${yr}`, { x: x + bw / 2, y: base - h - 12, size: 16, face: medium, anchor: "middle", fill: t.blue }).svg}</g>`);
    }
    if (partial && n) {
      out.push(`<g class="fade" style="animation-delay:1.2s">${text("so far", { x: x + bw / 2, y: base - h - 12, size: 14, face: medium, anchor: "middle", fill: t.mute }).svg}</g>`);
    }
  }
  out.push(`<line x1="${x0}" y1="${base + 0.5}" x2="${x1}" y2="${base + 0.5}" stroke="${t.faint}" stroke-width="1.5"/>`);

  const head = text(`${total} talks since ${first}`, { x: x0, y: 64, size: 32, fill: t.fg });
  const sub = text("One bar per year, counted from the catalog of my slide decks", { x: x0 + 2, y: 94, size: 17, face: medium, fill: t.mute });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">${total} talks since ${first}</title>
<desc id="d">Bar chart of talks per year from ${first} to ${last}. ${years.map((y) => `${y}: ${counts[y]}`).join(", ")}.</desc>
<style>${MOTION}</style>
<rect width="${W}" height="${H}" rx="18" fill="${t.bg}"/>
${head.svg}
${sub.svg}
${out.join("\n")}
</svg>
`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function displayDate(talk) {
  const [y, m, d] = String(talk.date).slice(0, 10).split("-").map(Number);
  return talk.date_precision === "month" || !d ? `${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${d}, ${y}`;
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function exists(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}

async function recentTalks(talks, today, total) {
  const iso = today.toISOString().slice(0, 10);
  const past = talks.filter((t) => String(t.date).slice(0, 10) <= iso)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const page = (t) => `${SITE}/talks/${t.slug}/`;

  const cards = [];
  for (const t of past) {
    if (cards.length === 3) break;
    const thumb = `${SITE}/public/thumbs/${t.slug}.webp`;
    if (!(await exists(thumb))) continue;
    cards.push(`<td width="33%" valign="top">
<a href="${page(t)}"><img src="${thumb}" alt="Title slide: ${esc(t.title)}" width="100%"></a><br>
<b><a href="${page(t)}">${esc(t.title)}</a></b><br>
<sub>${esc(t.venue ?? "")} · ${displayDate(t)}</sub>
</td>`);
  }
  const shown = new Set(cards.map((c) => c.match(/talks\/([^/]+)\//)[1]));
  const more = past.filter((t) => !shown.has(t.slug)).slice(0, 4)
    .map((t) => `- [${t.title}](${page(t)}) — ${t.venue ?? ""}, ${displayDate(t)}`);
  return [
    `<table>\n<tr>\n${cards.join("\n")}\n</tr>\n</table>`,
    "",
    ...more,
    "",
    `[All ${total} talks →](${SITE}/talks/)`,
  ].join("\n");
}

function replaceBetween(src, name, body) {
  const start = `<!-- ${name}:start -->`, end = `<!-- ${name}:end -->`;
  const a = src.indexOf(start), b = src.indexOf(end);
  if (a < 0 || b < a) throw new Error(`README.md is missing the ${name} markers`);
  return `${src.slice(0, a + start.length)}\n${body}\n${src.slice(b)}`;
}

const raw = process.env.TALKS_YAML
  ? fs.readFileSync(process.env.TALKS_YAML, "utf8")
  : await (await fetch(TALKS_URL)).text();
const talks = (yaml.load(raw).talks ?? []).filter((t) => t.slug && t.date);
if (talks.length < 50) throw new Error(`Only ${talks.length} talks in the catalog; refusing to overwrite the profile.`);

const today = new Date();
const counts = {};
for (const t of talks) {
  const y = Number(String(t.date).slice(0, 4));
  counts[y] = (counts[y] ?? 0) + 1;
}

const write = (rel, s) => fs.writeFileSync(path.join(ROOT, rel), s);
for (const [mode, t] of Object.entries(THEMES)) {
  write(`assets/banner-${mode}.svg`, banner(t));
  write(`assets/timeline-${mode}.svg`, timeline(t, counts, talks.length, today));
}
const readme = path.join(ROOT, "README.md");
write("README.md", replaceBetween(fs.readFileSync(readme, "utf8"), "talks", await recentTalks(talks, today, talks.length)));
console.log(`built: ${talks.length} talks, ${Object.keys(counts).length} years`);
