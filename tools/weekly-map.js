// usage: node weekly-map.js world-map.json <id>.map.json <id>.html
// Draws "The world this week" map from the week's location tags and puts it at the top of the
// Weekly fragment (right after <main class="wrap">). Running it again replaces the old map.
// <id>.map.json = {"title"?, "items":[{"n":1,"head":"short headline","place":"New York","lat":40.7,"lon":-74,"to":"story-id"}]}
// Pins inside the Europe box go on the Europe inset; the rest on the world map. Pins closer than
// a few percent of the map width share one marker ("6,7"). No dependencies.
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
const B = G.europe.box;
const inEu = it => it.lon >= B.lon0 + 0.5 && it.lon <= B.lon1 - 0.5 && it.lat >= B.lat0 + 0.5 && it.lat <= B.lat1 - 0.5;
const eu = items.filter(inEu), world = items.filter(it => !inEu(it));
const useInset = eu.length > 0;

function cluster(m, list, gap) {
  const out = [];
  for (const it of list) {
    const [x, y] = proj(m, it.lon, it.lat);
    const c = out.find(c => Math.hypot(c.x0 - x, c.y0 - y) < gap * m.w);
    if (c) { c.items.push(it); c.xs.push(x); c.ys.push(y); }
    else out.push({x0: x, y0: y, xs: [x], ys: [y], items: [it]});
  }
  return out.map(c => {
    const x = c.xs.reduce((a, b) => a + b) / c.xs.length, y = c.ys.reduce((a, b) => a + b) / c.ys.length;
    return {items: c.items, l: Math.min(97, Math.max(3, 100 * x / m.w)), t: Math.min(95, Math.max(5, 100 * y / m.h))};
  });
}
const pin = c => {
  const ns = c.items.map(i => i.n), places = [...new Set(c.items.map(i => i.place))].join(', ');
  return `<a class="pin" href="#${esc(c.items[0].to)}" data-n="${ns.join(' ')}" style="left:${c.l.toFixed(2)}%;top:${c.t.toFixed(2)}%" aria-label="${ns.join(' and ')}: ${esc(places)}" title="${esc(places)}">${ns.join(',')}</a>`;
};
const svg = (m, extra = '') => `<svg viewBox="0 0 ${m.w} ${m.h}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"><path class="land" d="${m.land}"/><path class="bord" d="${m.borders}"/>${extra}</svg>`;

const frame = useInset ? `<path class="frame" d="${G.world.frame}"/>` : '';
const worldPins = cluster(G.world, world, 0.042).map(pin).join('');
const euPins = useInset ? cluster(G.europe, eu, 0.075).map(pin).join('') : '';
const list = items.map(it => `<li data-n="${it.n}"><a href="#${esc(it.to)}">${esc(it.head)}</a></li>`).join('');
const title = M.title || 'The world this week';

const html = `<section class="wmap" id="map" aria-labelledby="map-h">
<h2 class="wmap-h" id="map-h">${esc(title)}</h2>
<div class="wmap-world">${svg(G.world, frame)}${worldPins}</div>
<div class="wmap-low${useInset ? '' : ' no-inset'}">${useInset ? `<div class="wmap-eu"><span class="wmap-cap">Europe</span>${svg(G.europe)}${euPins}</div>` : ''}<ol class="wmap-list">${list}</ol></div>
</section>
`;

frag = frag.replace(/<section class="wmap"[\s\S]*?<\/section>\n?/, '');
if (!/<main class="wrap">\n?/.test(frag)) throw new Error('no <main class="wrap"> in fragment');
frag = frag.replace(/<main class="wrap">\n?/, m => m + html);
fs.writeFileSync(fragF, frag);
console.log(`map: ${world.length} world pins, ${eu.length} Europe pins, ${items.length} headlines`);
