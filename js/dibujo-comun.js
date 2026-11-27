// ═══════════════════════════════════════════════════════════════════
//  DIBUJO COMÚN (v1.1, 25 de noviembre de 2026)
//  Primitivas de dibujo sobre el contexto 2D de p5 con trazados SVG
//  (las mismas coordenadas del boceto). Original en
//  /mnt/project-files/estilo/escena-comun/: se copia tal cual, no se edita.
//  Cada escena añade lo suyo: Object.assign(CF, {...}), Object.assign(GR, {...}).
//  Requiere js/escena-comun.js (THEME, FUENTE_TEXTO) y p5 en modo global.
// ═══════════════════════════════════════════════════════════════════

// Proyección oblicua única de la serie: por cada unidad de profundidad, 0,34 a la derecha y 0,26 arriba
const PDX = 0.34, PDY = -0.26;

// Colores fijos de los objetos (lo de alrededor sigue al tema). La escena añade los suyos.
const CF = {
    ink: '#071a2b', cyan: '#00c8ff', cam: '#ffd84a', agua: '#3a9be0', vidrio: '#d8efff',
    flota: '#9fe7c4', hunde: '#ffb38a', neutro: '#d7e3ee', A: '#8cc8ff', B: '#ffb38a',
};

// Degradados: ['l', [x1, y1, x2, y2], paradas] o ['r', [cx, cy, r], paradas] (en unidades de la caja de la forma)
const GR = {
    foco: ['r', [0.5, 0.5, 0.5], [[0, 'rgba(45,119,173,.55)'], [1, 'rgba(45,119,173,0)']]],
};

let CTX_FUERA = null;                       // contexto de un lienzo auxiliar (caché de cubos)
const cx2 = () => CTX_FUERA || drawingContext;
const tinta = () => THEME.ink || CF.ink;
const fuenteDib = () => (THEME.fun ? 'Fredoka, ' : '') + FUENTE_TEXTO;

// Semilla fija: las texturas salen siempre iguales
let semilla = 11;
const rnd = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };

// Trazados SVG de un rectángulo redondeado, una elipse y un polígono
function R(x, y, w, h, r = 0) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    if (!r) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
           `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}
function E(cx, cy, rx, ry) { return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`; }
function P(...q) { return 'M' + q.map(p => p.join(' ')).join(' L') + ' Z'; }

function pintar(p, f, bb) {
    const ctx = cx2();
    if (typeof f === 'string' && f.startsWith('g:')) {
        const g = GR[f.slice(2)], [bx, by, bw, bh] = bb;
        if (g[0] === 'l') {
            const [x1, y1, x2, y2] = g[1];
            const gr = ctx.createLinearGradient(bx + x1 * bw, by + y1 * bh, bx + x2 * bw, by + y2 * bh);
            g[2].forEach(([o, c]) => gr.addColorStop(o, c));
            ctx.fillStyle = gr; ctx.fill(p);
        } else {
            const [cx, cy, r] = g[1];
            ctx.save(); ctx.clip(p); ctx.translate(bx, by); ctx.scale(bw || 1, bh || 1);
            const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g[2].forEach(([o, c]) => gr.addColorStop(o, c));
            ctx.fillStyle = gr; ctx.fillRect(0, 0, 1, 1); ctx.restore();
        }
    } else { ctx.fillStyle = f; ctx.fill(p); }
}
// Forma: d (trazado SVG) con o = { f, fo, s, sw, so, op, bb, lj, lc, dash }
function forma(d, o) {
    const ctx = cx2(), p = typeof d === 'string' ? new Path2D(d) : d;
    const a0 = ctx.globalAlpha, op = o.op == null ? 1 : o.op;
    if (o.f) { ctx.globalAlpha = a0 * op * (o.fo == null ? 1 : o.fo); pintar(p, o.f, o.bb); }
    if (o.s) {
        ctx.globalAlpha = a0 * op * (o.so == null ? 1 : o.so);
        ctx.strokeStyle = o.s; ctx.lineWidth = o.sw || 1;
        ctx.lineJoin = o.lj || 'miter'; ctx.lineCap = o.lc || 'butt';
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.stroke(p);
        if (o.dash) ctx.setLineDash([]);
    }
    ctx.globalAlpha = a0;
}
const linea = (d, col, sw, op, lc) => forma(d, { s: col, sw, op, lc });
function recortar(d, fn) { const ctx = cx2(); ctx.save(); ctx.clip(new Path2D(d)); fn(); ctx.restore(); }

// Círculos con contorno «solo por fuera» (pelo, barba, nubes)
function nube(cs, fill, sw = 2.4) {
    cs.forEach(([cx, cy, r]) => forma(E(cx, cy, r, r), { f: fill, s: tinta(), sw: sw * 2 }));
    cs.forEach(([cx, cy, r]) => forma(E(cx, cy, r, r), { f: fill }));
}

// Texto con la línea base abajo (como en SVG). o = { fs, w, c, a, sys, op, borde, bw }
function fuenteDe(o) { return `${o.w || 500} ${o.fs || 16}px ${o.sys ? FUENTE_TEXTO : fuenteDib()}`; }
function T(x, y, s, o = {}) {
    const ctx = cx2(), a0 = ctx.globalAlpha;
    ctx.font = fuenteDe(o);
    ctx.textAlign = { start: 'left', middle: 'center', end: 'right' }[o.a || 'start'];
    ctx.textBaseline = 'alphabetic';
    if (o.op != null) ctx.globalAlpha = a0 * o.op;
    if (o.borde) { ctx.strokeStyle = o.borde; ctx.lineWidth = o.bw || 3.5; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.c || THEME.text;
    ctx.fillText(s, x, y);
    ctx.globalAlpha = a0;
}
function anchoT(s, o = {}) { const ctx = cx2(); ctx.font = fuenteDe(o); return ctx.measureText(s).width; }
// Texto con subíndices: trozos [[texto, sub?], …]
function Tsub(x, y, trozos, o = {}) {
    const fsSub = (o.fs || 16) * 0.72;
    let w = 0;
    trozos.forEach(([t, sub]) => { w += anchoT(t, sub ? Object.assign({}, o, { fs: fsSub }) : o); });
    let xx = o.a === 'end' ? x - w : o.a === 'middle' ? x - w / 2 : x;
    trozos.forEach(([t, sub]) => {
        const oo = Object.assign({}, o, { a: 'start' });
        if (sub) oo.fs = fsSub;
        T(xx, sub ? y + 3 : y, t, oo);
        xx += anchoT(t, oo);
    });
    return w;
}
// Píldora con texto centrado
function pildora(x, y, w, h, fill, stroke, sw = 2.5) { forma(R(x, y, w, h, h / 2), { f: fill, s: stroke, sw }); }
function chispaD(x, y, r, col = CF.cam) {
    let p = '';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.42 : r; p += `${i ? 'L' : 'M'}${x + Math.cos(a) * rr} ${y + Math.sin(a) * rr}`; }
    forma(p + 'Z', { f: col, s: tinta(), sw: 1.8 });
}
function focoD(cx, cy, rx, ry) {
    if (!THEME.foco) return;
    forma(E(cx, cy, rx, ry), { f: 'g:foco', bb: [cx - rx, cy - ry, 2 * rx, 2 * ry], op: THEME.foco });
}
const sombraE = (cx, cy, w, op = 0.38) => forma(E(cx, cy, w / 2, Math.max(3, w * 0.09)), { f: '#04111c', op });
function sombraPlano(x, yb, w, D, op = 0.38) {
    const dx = D * PDX, dy = D * PDY;
    forma(`M${x} ${yb} L${x + dx} ${yb + dy} H${x + w + dx} L${x + w} ${yb} Z`, { f: '#04111c', op });
}
// Caja en la proyección oblicua (profundidad D): frente, tapa y lado
function caja(x, yb, w, h, D, ff, ft, fs, sw = 3.5, rx = 6) {
    const dx = D * PDX, dy = D * PDY, y = yb - h, ink = tinta();
    forma(`M${x + w} ${y} L${x + w + dx} ${y + dy} V${yb + dy} L${x + w} ${yb} Z`, { f: fs, s: ink, sw, lj: 'round', bb: [x + w, y + dy, dx, h] });
    forma(`M${x} ${y} L${x + dx} ${y + dy} H${x + w + dx} L${x + w} ${y} Z`, { f: ft, s: ink, sw, lj: 'round', bb: [x, y + dy, w + dx, -dy] });
    forma(R(x, y, w, h, rx), { f: ff, s: ink, sw, bb: [x, y, w, h] });
}

function caras(x, yb, s) {
    const dx = s * PDX, dy = s * PDY, y = yb - s;
    return {
        dx, dy, y,
        top: `M${x} ${y} L${x + dx} ${y + dy} L${x + s + dx} ${y + dy} L${x + s} ${y} Z`,
        side: `M${x + s} ${y} L${x + s + dx} ${y + dy} L${x + s + dx} ${yb + dy} L${x + s} ${yb} Z`,
    };
}
