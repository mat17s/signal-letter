// usage: node weekly-map.js world-map.json <id>.map.json <id>.html
// Puts the week's map at the top of "The week in five minutes" and links each numbered point to its story.
// <id>.map.json = {"items":[{"n":1,"head":"short label","place":"New York","lat":40.7,"lon":-74,"to":"story-id"}]}
//   one item per point of The week in five minutes, in the same order (n = 1, 2, …);
//   leave out place/lat/lon for a point with no single place (Bitcoin, gold): it gets no pin.
// Points at the same place share one pin ("6,7"). Pins that would overlap (e.g. Bern and Frankfurt) are
// nudged apart and get a short leader line to a small dot at the real place. Running it again replaces
// the old map. No dependencies.
const fs = require('fs');
const [geoF, mapF, fragF] = process.argv.slice(2);
const G = JSON.parse(fs.readFileSync(geoF, 'utf8'));
const M = JSON.parse(fs.readFileSync(mapF, 'utf8'));
let frag = fs.readFileSync(fragF, 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Natural Earth 1 projection (same formula as d3-geo's geoNaturalEarth1, used to draw world-map.json)
function ne1(lon, lat) {
  const l = lon * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
  return [l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
          p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))];
}
const proj = (m, lon, lat) => { const [x, y] = ne1(lon, lat); return [m.tx + m.s * x, m.ty - m.s * y]; };

const items = (M.items || []).slice().sort((a, b) => a.n - b.n);
const placed = items.filter(it => typeof it.lat === 'number' && typeof it.lon === 'number');
const m = G.world;

// one pin per place; then push overlapping pins apart (a few px of map) and keep them inside the frame
const pins = [];
for (const it of placed) {
  const [x, y] = proj(m, it.lon, it.lat);
  const same = pins.find(p => Math.hypot(p.ax - x, p.ay - y) < 2);
  if (same) same.items.push(it); else pins.push({ax: x, ay: y, x, y, items: [it]});
}
const D = 0.042 * m.w;            // minimum distance between pin centres
for (let k = 0; k < 300; k++) {
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
    const a = pins[i], b = pins[j]; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= D) continue;
    if (d < 0.01) { dx = 0; dy = 1; d = 1; }
    const push = (D - d) / 2;
    a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push;
  }
  for (const p of pins) { p.x += (p.ax - p.x) * 0.01; p.y += (p.ay - p.y) * 0.01;
    p.x = Math.min(m.w - 14, Math.max(14, p.x)); p.y = Math.min(m.h - 14, Math.max(14, p.y)); }
}
const leaders = pins.filter(p => Math.hypot(p.x - p.ax, p.y - p.ay) > 6)
  .map(p => `<line class="lead" x1="${p.ax.toFixed(1)}" y1="${p.ay.toFixed(1)}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"/><circle class="dot" cx="${p.ax.toFixed(1)}" cy="${p.ay.toFixed(1)}" r="2.6"/>`).join('');
const pin = p => {
  const ns = p.items.map(i => i.n), places = [...new Set(p.items.map(i => i.place))].join(', ');
  return `<a class="pin" href="#${esc(p.items[0].to)}" data-n="${ns.join(' ')}" style="left:${(100 * p.x / m.w).toFixed(2)}%;top:${(100 * p.y / m.h).toFixed(2)}%" aria-label="${ns.join(' and ')}: ${esc(places)}" title="${esc(places)}">${ns.join(',')}</a>`;
};
const figure = `<figure class="wmap" aria-label="Map of the places in this week's points">
<div class="wmap-world"><svg viewBox="0 0 ${m.w} ${m.h}" aria-hidden="true" focusable="false"><path class="land" d="${m.land}"/><path class="bord" d="${m.borders}"/>${leaders}</svg>${pins.map(pin).join('')}</div>
</figure>
`;

// drop any older map (a standalone section or a figure from an earlier run)
frag = frag.replace(/<section class="wmap"[\s\S]*?<\/section>\n?/, '').replace(/<figure class="wmap"[\s\S]*?<\/figure>\n?/, '');
const h = frag.match(/<h2 class="brief-h">[\s\S]*?<\/h2>\n?/);
if (!h) throw new Error('no <h2 class="brief-h"> (The week in five minutes) in the fragment');
frag = frag.replace(h[0], h[0] + figure);

// number the points and link each lead to its story
const a = frag.indexOf('<ol class="brief-list">'), b = frag.indexOf('</ol>', a);
if (a < 0) throw new Error('no <ol class="brief-list"> in the fragment');
let i = 0;
const list = frag.slice(a, b).replace(/<li(?: data-n="\d+")?>([\s\S]*?)<\/li>/g, (all, inner) => {
  const it = items[i++]; if (!it) return all;
  if (!/^<b><a /.test(inner)) inner = inner.replace(/^<b>([\s\S]*?)<\/b>/, `<b><a href="#${esc(it.to)}">$1</a></b>`);
  return `<li data-n="${it.n}">${inner}</li>`;
});
if (i !== items.length) console.warn(`warning: ${i} points in The week in five minutes, ${items.length} items in the map file`);
frag = frag.slice(0, a) + list + frag.slice(b);
fs.writeFileSync(fragF, frag);
console.log(`map: ${pins.length} pins (${leaders ? pins.filter(p => Math.hypot(p.x - p.ax, p.y - p.ay) > 6).length : 0} nudged), ${items.length - placed.length} points without a pin`);
