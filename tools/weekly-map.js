// usage: node weekly-map.js world-map.json <id>.map.json <id>.html
// Puts the week's map at the top of "The week in five minutes" and links each numbered point to its story.
// <id>.map.json = {"items":[{"n":1,"head":"short label","place":"New York","lat":40.7,"lon":-74,"to":"story-id"}]}
//   one item per point of The week in five minutes, in the same order (n = 1, 2, …);
//   leave out place/lat/lon for a point with no single place (Bitcoin, gold): it gets no pin.
// Pins inside the Europe box go on the small Europe inset in the map's lower-left corner; pins very close
// together share one marker ("6,7"). Running it again replaces the old map. No dependencies.
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
const B = G.europe.box;
const inEu = it => it.lon >= B.lon0 + 0.5 && it.lon <= B.lon1 - 0.5 && it.lat >= B.lat0 + 0.5 && it.lat <= B.lat1 - 0.5;
const eu = placed.filter(inEu), world = placed.filter(it => !inEu(it));

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
    return {items: c.items, l: Math.min(96, Math.max(4, 100 * x / m.w)), t: Math.min(93, Math.max(7, 100 * y / m.h))};
  });
}
const pin = c => {
  const ns = c.items.map(i => i.n), places = [...new Set(c.items.map(i => i.place))].join(', ');
  return `<a class="pin" href="#${esc(c.items[0].to)}" data-n="${ns.join(' ')}" style="left:${c.l.toFixed(2)}%;top:${c.t.toFixed(2)}%" aria-label="${ns.join(' and ')}: ${esc(places)}" title="${esc(places)}">${ns.join(',')}</a>`;
};
const svg = (m, extra = '') => `<svg viewBox="0 0 ${m.w} ${m.h}" aria-hidden="true" focusable="false"><path class="land" d="${m.land}"/><path class="bord" d="${m.borders}"/>${extra}</svg>`;

const inset = eu.length ? `<div class="wmap-eu"><span class="wmap-cap">Europe</span>${svg(G.europe)}${cluster(G.europe, eu, 0.1).map(pin).join('')}</div>` : '';
const figure = `<figure class="wmap" aria-label="Map of the places in this week's points">
<div class="wmap-world">${svg(G.world, eu.length ? `<path class="frame" d="${G.world.frame}"/>` : '')}${cluster(G.world, world, 0.045).map(pin).join('')}</div>${inset}
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
console.log(`map: ${world.length} world pins, ${eu.length} Europe pins, ${items.length - placed.length} points without a pin`);
