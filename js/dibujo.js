// ═══════════════════════════════════════════════════════════════════
//  DIBUJOS DE LA ESCENA «MODELOS ATÓMICOS» (boceto aprobado, en planta)
//  Mismas coordenadas que /capturas/escena-modelos/boceto.html. Lo común
//  (forma, T, R, E, GR, CF…) está en js/dibujo-comun.js.
//  · aparato()      cámara de vacío de Geiger y Marsden vista desde arriba
//  · marco()        círculo del modelo con el cono que lo une a la lámina
//  · atomoRuth(), atomoThom(), laminaThom(), laminaRuth(), alfa(), estela()
//  · mirilla(), leyendaModelo(), panelEstado(), grafica(), selloVuelve()
// ═══════════════════════════════════════════════════════════════════
Object.assign(CF, {
    prot: '#ff6b5e', neut: '#9fb3c4', elec: '#5cc8ff', alfa: '#ffe9c7', thom: '#e0a85a',
    recta: '#9ec9ff', desv: '#ffa25a', vuel: '#ff6b6b', zns: '#2d4a3e', dest: '#c8ffb0',
});
Object.assign(GR, {
    laton:    ['l', [0, 0, 1, 1], [[0, '#f6dea2'], [0.35, '#d4ad62'], [0.7, '#b38841'], [1, '#7a5a24']]],
    suelo:    ['r', [0.5, 0.5, 0.55], [[0, '#1b3144'], [1, '#0a1621']]],
    plomoT:   ['l', [0, 0, 1, 1], [[0, '#7b8694'], [1, '#4b5562']]],
    plomoBoq: ['l', [0, 0, 0, 1], [[0, '#8d98a6'], [0.45, '#5e6875'], [1, '#363e48']]],
    capsula:  ['r', [0.35, 0.3, 0.8], [[0, '#eef3f7'], [0.6, '#9aa8b5'], [1, '#55626e']]],
    radio:    ['r', [0.4, 0.35, 0.7], [[0, '#fff2c8'], [0.6, '#e9c46a'], [1, '#a7782a']]],
    oro:      ['l', [0, 0, 1, 0], [[0, '#b8861f'], [0.45, '#ffe8a3'], [0.7, '#ffd36b'], [1, '#a77818']]],
    vidrio:   ['r', [0.38, 0.32, 0.7], [[0, 'rgba(233,246,255,.09)'], [0.8, 'rgba(159,208,240,.05)'], [1, 'rgba(10,34,54,.35)']]],
    dest:     ['r', [0.5, 0.5, 0.5], [[0, '#f6fff0'], [0.35, 'rgba(200,255,176,.9)'], [1, 'rgba(127,224,138,0)']]],
    thomS:    ['r', [0.38, 0.34, 0.72], [[0, 'rgba(255,230,189,.8)'], [0.65, 'rgba(224,168,90,.62)'], [1, 'rgba(185,129,58,.72)']]],
});
const rad = (d) => d * Math.PI / 180;
const circ = (x, y, r) => E(x, y, r, r);
const bbC = (x, y, r) => [x - r, y - r, 2 * r, 2 * r];

// ── Colores que se pueden cambiar en ⚙ (α, protones, neutrones, electrones) ──
const COLORES = { alfa: '#ffe9c7', prot: '#ff6b5e', neut: '#9fb3c4', elec: '#5cc8ff', tamE: 2 };
function mezclar(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}
// Degradado de cada bola: centro claro, color y borde oscuro (los del boceto con los colores de serie)
function paradasBola(col, tipo) {
    const fijo = { prot: ['#ff6b5e', '#ffc2b8', '#b8362c'], neut: ['#9fb3c4', '#eef4f9', '#5e7385'], elec: ['#5cc8ff', '#e3f6ff', '#1f7fb8'] }[tipo];
    if (fijo && fijo[0] === col.toLowerCase()) return [[0, fijo[1]], [tipo === 'elec' ? 0.6 : 0.55, col], [1, fijo[2]]];
    return [[0, mezclar(col, '#ffffff', 0.65)], [0.55, col], [1, mezclar(col, '#000000', 0.35)]];
}
// Bolas (protón, neutrón, electrón) dibujadas una vez en un lienzo pequeño y copiadas
const CACHE_BOLAS = new Map();
function bola(tipo, x, y, r, sw) {
    const col = COLORES[tipo], pd = pixelDensity(), ink = tinta();
    const k = `${tipo}|${col}|${ink}|${(r * 4) | 0}|${((sw || 0) * 4) | 0}|${pd}`;
    let c = CACHE_BOLAS.get(k);
    if (!c) {
        const m = (sw || 0) + 1.5, lado = Math.ceil((r + m) * 2 * pd);
        c = document.createElement('canvas'); c.width = c.height = lado;
        const g = c.getContext('2d'); g.scale(pd, pd);
        const o = r + m, gr = g.createRadialGradient(o - r + 0.35 * 2 * r, o - r + 0.3 * 2 * r, 0, o - r + 0.35 * 2 * r, o - r + 0.3 * 2 * r, 0.8 * 2 * r);
        paradasBola(col, tipo).forEach(([p, cc]) => gr.addColorStop(p, cc));
        g.beginPath(); g.arc(o, o, r, 0, 7); g.fillStyle = gr; g.fill();
        if (sw) { g.lineWidth = sw; g.strokeStyle = ink; g.stroke(); }
        c.medio = o;
        if (CACHE_BOLAS.size > 300) CACHE_BOLAS.clear();
        CACHE_BOLAS.set(k, c);
    }
    drawingContext.drawImage(c, x - c.medio, y - c.medio, c.medio * 2, c.medio * 2);
}

// ═════════ EL APARATO DE GEIGER Y MARSDEN, EN PLANTA (centro 222, 196) ═════════
const AX = 222, AY = 196, R0 = 160, RI = 148, RZ = 140, HUECO = 16;
const BOQUILLA_X = 70 + 64 - 3 + 22;                 // salida de la boquilla
function posA(a, r) { return [AX + r * Math.cos(rad(a)), AY + r * Math.sin(rad(-a))]; }
function aparato(o) {
    const ink = tinta();
    if (THEME.foco) forma(circ(AX, AY, 215), { f: 'g:foco', bb: bbC(AX, AY, 215) });
    T(AX, 22, i18n.t('cámara de vacío · vista desde arriba'), { fs: 13.5, a: 'middle', c: THEME.textDim, sys: true });
    // sombra sólida y aro de latón
    forma(circ(AX + 5, AY + 6, R0 + 1), { f: ink, op: 0.6 });
    forma(circ(AX, AY, R0), { f: 'g:laton', bb: bbC(AX, AY, R0), s: ink, sw: 4 });
    const ctx = drawingContext;
    ctx.save(); ctx.translate(AX, AY); ctx.rotate(rad(195));
    forma(circ(0, 0, R0 - 3), { s: '#fff3cf', sw: 1.5, op: 0.6, dash: [R0 * 1.4, R0 * 5] });
    ctx.restore();
    // suelo de la cámara
    forma(circ(AX, AY, RI), { f: 'g:suelo', bb: bbC(AX, AY, RI), s: ink, sw: 3 });
    // pantalla de sulfuro de cinc (hueco a la izquierda, donde está la fuente)
    const [ax0, ay0] = posA(180 - HUECO, RZ), [ax1, ay1] = posA(-180 + HUECO, RZ);
    const arco = `M${ax0} ${ay0} A${RZ} ${RZ} 0 1 1 ${ax1} ${ay1}`;
    forma(arco, { s: ink, sw: 15, lc: 'round' });
    forma(arco, { s: CF.zns, sw: 11, lc: 'round' });
    if (o.huella) { ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = '#b5f59c'; ctx.fill(o.huella); ctx.restore(); }
    // emisor: castillo de plomo con la fuente de radio al fondo del canal y boquilla de salida
    const bx = 70, by = AY - 30, bw = 64, bh = 60, nx = bx + bw - 3;
    forma(R(nx + 4, AY - 6, 22, 18, 4), { f: ink, op: 0.5 });
    forma(R(bx + 5, by + 6, bw, bh, 10), { f: ink, op: 0.6 });
    forma(R(nx, AY - 9, 20, 18, 2), { f: 'g:plomoBoq', bb: [nx, AY - 9, 20, 18], s: ink, sw: 2.2 });
    forma(R(nx + 16, AY - 11, 6, 22, 2.5), { f: 'g:plomoBoq', bb: [nx + 16, AY - 11, 6, 22], s: ink, sw: 2 });
    forma(R(nx, AY - 2.5, 22, 5), { f: '#0b1015' });
    forma(R(bx, by, bw, bh, 10), { f: '#262d35', s: ink, sw: 2.6 });
    forma(R(bx + 3, by + 3, bw - 8, bh - 9, 8), { f: 'g:plomoT', bb: [bx + 3, by + 3, bw - 8, bh - 9] });
    forma(`M${bx + 6} ${by + bh - 10} V${by + 12} Q${bx + 6} ${by + 5} ${bx + 13} ${by + 5} H${bx + bw - 14}`, { s: '#d3dbe3', sw: 1.6, op: 0.7, lc: 'round' });
    forma(R(bx + 24, AY - 4, bw - 24, 8, 2), { f: '#0b1015' });
    linea(`M${bx + 26} ${AY + 2.6} H${bx + bw - 2}`, '#56606c', 1);
    forma(circ(bx + 22, AY, 10), { f: '#0b1015' });
    forma(circ(bx + 22, AY, 7.8), { f: 'g:capsula', bb: bbC(bx + 22, AY, 7.8), s: ink, sw: 1.6 });
    forma(circ(bx + 22, AY, 4), { f: 'g:radio', bb: bbC(bx + 22, AY, 4), s: '#7a5a24', sw: 0.8 });
    // señal de radiactividad pequeña
    const tx = bx + bw - 18, ty = by + 15;
    forma(circ(tx, ty, 8), { f: '#ffd400', s: ink, sw: 1.6 });
    for (let k = 0; k < 3; k++) {
        const a0 = rad(-90 + k * 120 - 30), a1 = rad(-90 + k * 120 + 30), r0 = 1.9, r1 = 6.2;
        forma(`M${tx + r0 * Math.cos(a0)} ${ty + r0 * Math.sin(a0)} L${tx + r1 * Math.cos(a0)} ${ty + r1 * Math.sin(a0)} A${r1} ${r1} 0 0 1 ${tx + r1 * Math.cos(a1)} ${ty + r1 * Math.sin(a1)} L${tx + r0 * Math.cos(a1)} ${ty + r0 * Math.sin(a1)} A${r0} ${r0} 0 0 0 ${tx + r0 * Math.cos(a0)} ${ty + r0 * Math.sin(a0)}Z`, { f: '#111' });
    }
    forma(circ(tx, ty, 1.2), { f: '#111' });
    // rótulo fuera de la cámara
    if (o.rotFuente !== false) {
        linea(`M38 ${AY + 86} L${bx + 10} ${by + bh - 3}`, THEME.textDim, 1.2, 0.65);
        forma(circ(bx + 10, by + bh - 3, 2), { f: THEME.textDim });
        T(22, AY + 100, i18n.t('fuente'), { fs: 12.5, c: THEME.textDim, sys: true });
        T(22, AY + 114, i18n.t('de α'), { fs: 12.5, c: THEME.textDim, sys: true });
    }
    // α como puntos tenues, sin estela
    (o.alfas || []).forEach(([x, y]) => forma(circ(x, y, 2.4), { f: COLORES.alfa, op: 0.6 }));
    // pan de oro, de canto
    forma(R(AX - 2.5, AY - 34, 5, 68, 2), { f: 'g:oro', bb: [AX - 2.5, AY - 34, 5, 68], s: '#6e4f1d', sw: 1 });
    if (o.marca) forma(circ(AX, AY, 11), { s: THEME.accent, sw: 2, dash: [3, 3] });
    // destellos: se encienden en 120 ms y se apagan en 1,2 s
    const ahora = millis();
    (o.destellos || []).forEach(d => {
        const e = ahora - d.t, op = MOV_REDUCIDO ? (e < 900 ? 1 : 0) : (e < 120 ? e / 120 : Math.max(0, 1 - (e - 120) / 1200));
        if (op <= 0) return;
        const [x, y] = posA(d.a, RZ);
        forma(circ(x, y, 13), { f: 'g:dest', bb: bbC(x, y, 13), op });
        forma(circ(x, y, 2.6), { f: '#fbfff6', op });
    });
    if (o.celebra) {
        const [x, y] = posA(o.celebra.a, RZ), s = salto(o.celebra.t0);
        forma(circ(x, y, 17 * s), { s: ink, sw: 6 });
        forma(circ(x, y, 17 * s), { s: CF.cam, sw: 3.2 });
        if (o.celebra.grande) { chispaD(x - 20, y - 17, 6.5); chispaD(x + 17, y - 22, 5); }
    }
    // tapa de vidrio: un solo reflejo suave
    forma(circ(AX, AY, RI), { f: 'g:vidrio', bb: bbC(AX, AY, RI) });
    const [h0x, h0y] = posA(112, RI - 7), [h1x, h1y] = posA(150, RI - 7);
    forma(`M${h0x} ${h0y} A${RI - 7} ${RI - 7} 0 0 0 ${h1x} ${h1y}`, { s: '#fff', sw: 3, lc: 'round', op: 0.32 });
}
// Leyenda fija bajo el aparato
function leyendaAparato(x, y, conDestello, movil) {
    forma(circ(x + 8, y - 5, 3), { f: THEME.fun && !THEME.foco ? THEME.estela : COLORES.alfa, op: THEME.foco || !THEME.fun ? 0.7 : 1 });
    T(x + 18, y, i18n.t('α: en realidad no se ven; solo sus destellos'), { fs: movil ? 12.5 : 13, c: THEME.textDim, sys: true });
    if (conDestello) {
        if (!THEME.foco) forma(circ(335, y - 5, 7), { f: '#1b3144' });
        forma(circ(335, y - 5, 6), { f: 'g:dest', bb: bbC(335, y - 5, 6) });
        forma(circ(335, y - 5, 2), { f: '#fbfff6' });
        T(345, y, i18n.t('destello'), { fs: 13, c: THEME.textDim, sys: true });
    }
}

// ═════════ EL MODELO ═════════
function marcoFondo(cx, cy, r, zoom) {
    const ink = tinta();
    if (zoom) {
        const [zx, zy] = zoom, k = r * 0.42;
        forma(`M${zx} ${zy - 11} L${cx - r * 0.9} ${cy - k} L${cx - r * 0.9} ${cy + k} L${zx} ${zy + 11} Z`, { f: THEME.accent, op: 0.055 });
        forma(`M${zx} ${zy - 11} L${cx - r * 0.9} ${cy - k} M${zx} ${zy + 11} L${cx - r * 0.9} ${cy + k}`, { s: THEME.accent, sw: 1.3, op: 0.35, dash: [4, 5] });
    }
    forma(circ(cx + 4, cy + 5, r + 5), { f: ink, op: 0.55 });
    forma(circ(cx, cy, r), { f: THEME.modelBg });
}
function marcoBorde(cx, cy, r, rotulo, fs) {
    forma(circ(cx, cy, r), { s: tinta(), sw: 9 });
    forma(circ(cx, cy, r + 7), { s: THEME.accent, sw: 2, dash: [7, 6], op: 0.8 });
    if (rotulo) {
        const w = anchoT(rotulo, { fs, w: 600 }) + 36;
        pildora(cx - w / 2, cy + r - 16, w, 32, THEME.pillBg, THEME.accent, 2);
        T(cx, cy + r + 5.5, rotulo, { fs, w: 600, a: 'middle', c: THEME.text });
    }
}
// Núcleo en girasol: nucleones con brillo propio y sin halo alrededor
function nucleo(cx, cy, s, z) {
    forma(circ(cx + 1.5 * s, cy + 2 * s, 12.5 * s * Math.min(1, Math.sqrt(nNucleones(z) / 34) + 0.15)), { f: tinta(), op: 0.6 });
    const n = nNucleones(z), lista = [];
    semilla = 3;
    for (let i = 0; i < n; i++) {
        const t = i * 2.39996, rr = 1.95 * Math.sqrt(i + 0.4) * s;
        lista.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t), z <= 8 ? i % 2 === 0 && i / 2 < z : rnd() < 0.42]);
    }
    if (z === 1) lista[0][2] = true;
    lista.sort((a, b) => (a[1] + a[0] * 0.3) - (b[1] + b[0] * 0.3));
    lista.forEach(([x, y, p]) => bola(p ? 'prot' : 'neut', x, y, 2.75 * s, 0.9 * s));
}
function nNucleones(z) { return z === 1 ? 1 : Math.min(34, 2 * z + (z > 2 ? 1 : 0)); }
// α: núcleo de helio (dos protones y dos neutrones)
function alfa(x, y, s) {
    const d = 2.5 * s, r = 2.6 * s;
    forma(circ(x + 1, y + 1.5, 6 * s), { f: tinta(), op: 0.5 });
    [[-1, -1, 'neut'], [1, 1, 'neut'], [1, -1, 'prot'], [-1, 1, 'prot']].forEach(([a, b, t]) => bola(t, x + a * d, y + b * d, r, 0.9 * s));
}
function estela(pts, op, w, col) {
    if (pts.length < 2) return;
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) d += ' L' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
    forma(d, { s: col || THEME.estela, sw: w || 2.4, lc: 'round', lj: 'round', op });
}
function estelaLuz(pts) {
    let d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    forma(d, { s: CF.cam, sw: 16, op: 0.22, lc: 'round', lj: 'round' });
    forma(d, { s: THEME.estelaLuz, sw: 3, lc: 'round', lj: 'round' });
}
// Capas de electrones del átomo de Rutherford (radios relativos y electrones por capa)
function radiosCapas(n) {
    if (n === 1) return [0.6];
    const oro = [24, 46, 74, 106, 136, 160].map(v => v / 160);
    if (n === 6) return oro;
    return Array.from({ length: n }, (_, i) => 0.15 + 0.85 * i / (n - 1));
}
function atomoRuthFondo(cx, cy, rA, capas, sc) {
    const radios = radiosCapas(capas.length);
    radios.forEach(f => forma(circ(cx, cy, f * rA), { s: COLORES.elec, sw: 1, op: 0.13 }));
}
function atomoRuthElectrones(cx, cy, rA, capas, sc, t) {
    const radios = radiosCapas(capas.length), re = (2.6 * sc + 0.3) * COLORES.tamE / 2;
    semilla = 17;
    capas.forEach((n, ci) => {
        const rr = radios[ci] * rA, f = rnd() * 6.28 + (MOV_REDUCIDO ? 0 : t * 0.22 / (ci + 1));
        for (let i = 0; i < n; i++) {
            const a = f + i * 6.283 / n, x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
            forma(circ(x, y, re * 1.9), { f: COLORES.elec, op: 0.14 });
            bola('elec', x, y, re, 0.8);
        }
    });
}
// Átomo de Thomson aislado: esfera de carga positiva repartida, con los electrones quietos
function atomoThom(cx, cy, rA, electrones, sc) {
    forma(circ(cx + 3, cy + 4, rA), { f: tinta(), op: 0.35 });
    forma(circ(cx, cy, rA), { f: 'g:thomS', bb: bbC(cx, cy, rA), s: '#f0c27e', sw: 2 });
    const ctx = drawingContext; ctx.save(); ctx.translate(cx - rA * 0.35, cy - rA * 0.42); ctx.rotate(rad(-30));
    forma(E(0, 0, rA * 0.32, rA * 0.17), { f: '#fff', op: 0.25 }); ctx.restore();
    const re = (2.6 * sc + 0.3) * COLORES.tamE / 2;
    electrones.forEach(([x, y]) => bola('elec', x, y, re, 0.8));
}
// Lámina de Thomson ampliada: esferas en ámbar con sus electrones encajados como pasas
function esferaThom(x, y, ar, sc, z, sem) {
    forma(circ(x + 1.5, y + 2, ar), { f: tinta(), op: 0.35 });
    forma(circ(x, y, ar), { f: 'g:thomS', bb: bbC(x, y, ar), s: '#f0c27e', sw: 1.4 });
    const ctx = drawingContext; ctx.save(); ctx.translate(x - ar * 0.35, y - ar * 0.42); ctx.rotate(rad(-30));
    forma(E(0, 0, ar * 0.32, ar * 0.17), { f: '#fff', op: 0.32 }); ctx.restore();
    semilla = sem;
    const re = (2.3 * sc + 0.3) * COLORES.tamE / 2;
    for (let e = 0; e < Math.min(9, z); e++) { const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * ar * 0.74; bola('elec', x + rr * Math.cos(a), y + rr * Math.sin(a), re, 0.7); }
}
// Lámina de Rutherford ampliada: átomos casi vacíos, con un núcleo diminuto
function atomoRuthPeq(x, y, ar, sc, z, sem) {
    forma(circ(x, y, ar), { s: COLORES.elec, sw: 1, op: 0.22 });
    semilla = sem;
    const re = (2.1 * sc + 0.3) * COLORES.tamE / 2;
    for (let e = 0; e < Math.min(6, z); e++) { const a = rnd() * 6.28, rr = (0.35 + 0.6 * rnd()) * ar; bola('elec', x + rr * Math.cos(a), y + rr * Math.sin(a), re, 0.7); }
    nucleo(x, y, 0.2 * sc, Math.min(z, 6));
}
function mirilla(x, y, xFin, latido) {
    forma(`M${x + 14} ${y} H${xFin}`, { s: THEME.accent, sw: 1.8, op: 0.55, dash: [6, 7] });
    forma(circ(x, y, 20 * latido), { f: THEME.accent, op: 0.16 });
    forma(circ(x, y, 13), { f: THEME.accent, s: tinta(), sw: 3 });
    forma(`M${x - 5} ${y - 5} L${x + 3} ${y} L${x - 5} ${y + 5}`, { s: tinta(), sw: 2.6, lc: 'round', lj: 'round' });
}
function leyendaModelo(x, y, thom, movil, aviso) {
    const fs = movil ? 12.5 : 13.5; let px = x;
    const item = (tipo, txt) => {
        if (tipo === 'thom') forma(circ(px + 6, y - 4, 5.5), { f: CF.thom, s: tinta(), sw: 1.2 });
        else bola(tipo, px + 6, y - 4, 5.5, 1.2);
        T(px + 16, y, txt, { fs, c: THEME.textDim, sys: true });
        px += 16 + anchoT(txt, { fs, sys: true }) + 14;
    };
    if (thom) { item('thom', i18n.t('carga positiva repartida')); item('elec', i18n.t('electrón')); }
    else { item('prot', i18n.t('protón')); item('neut', i18n.t('neutrón')); item('elec', i18n.t('electrón')); }
    T(x, y + (movil ? 19 : 20), aviso, { fs: fs - 0.5, c: THEME.avisoModelo, sys: true });
}

// ═════════ PANEL DE ESTADO ═════════
const COL_TRAMOS = [CF.recta, CF.desv, CF.vuel];
function partirTexto(txt, w, o) {
    const pal = String(txt).split(/\s+/), out = []; let l = '';
    pal.forEach(p => { const pr = l ? l + ' ' + p : p; if (l && anchoT(pr, o) > w) { out.push(l); l = p; } else l = pr; });
    if (l) out.push(l);
    return out;
}
function panelEstado(x, y, w, h, e, movil) {
    const ink = tinta();
    forma(R(x + 4, y + 5, w, h, 20), { f: ink, op: THEME.fun ? 0.55 : 0 });
    forma(R(x, y, w, h, 20), { f: THEME.pillBg, s: THEME.cardEdge || THEME.border, sw: 1.5 });
    const px = x + (movil ? 20 : 26), iw = w - (movil ? 40 : 52);
    // rótulo de color que salta al cambiar
    const tw = anchoT(e.tag, { fs: 16.5, w: 700 }) + 40, s = salto(e.t0 || 0);
    const ctx = drawingContext; ctx.save(); ctx.translate(px + tw / 2, y + 39); ctx.scale(s, s);
    if (e.luz) forma(R(-tw / 2 - 6, -23, tw + 12, 46, 23), { f: CF.cam, op: 0.35 });
    pildora(-tw / 2, -17, tw, 34, e.col, ink, 2.5);
    T(0, 6, e.tag, { fs: 16.5, w: 700, a: 'middle', c: CF.ink });
    ctx.restore();
    const fs = movil ? 16.5 : 18.5, lh = fs + 8;
    const lineas = partirTexto(e.msg, iw, { fs });
    lineas.slice(0, 5).forEach((l, i) => T(px, y + 92 + i * lh, l, { fs, c: THEME.text }));
    const nl = Math.max(4, Math.min(5, lineas.length));
    let dy = y + 92 + (nl - 1) * lh + 26;
    linea(`M${px} ${dy} H${px + iw}`, THEME.border, 1.5);
    T(px, dy + 28, i18n.t('Lo que hacen las α'), { fs: 14, c: THEME.textDim, sys: true });
    T(px + iw, dy + 28, `${e.n} α`, { fs: 14, c: THEME.textDim, a: 'end', sys: true, w: 700 });
    const by = dy + 40, tot = e.c[0] + e.c[1] + e.c[2];
    forma(R(px, by, iw, 22, 7), { f: THEME.hundido, s: ink, sw: 2 });
    let bx = px;
    recortar(R(px, by, iw, 22, 7), () => {
        e.c.forEach((v, i) => {
            let ww = tot ? v / tot * iw : 0;
            if (v > 0 && ww < 7) ww = 7;
            if (ww > 0) { forma(R(bx, by, ww, 22), { f: COL_TRAMOS[i] }); bx += ww; }
        });
    });
    forma(R(px, by, iw, 22, 7), { s: ink, sw: 2.2 });
    const filas = [['→', 'Pasan casi rectas', 'menos de 10°'], ['↗', 'Se desvían', 'de 10° a 90°'], ['↩', 'Vuelven hacia atrás', 'más de 90°']];
    filas.forEach(([ic, t, sub], i) => {
        const ry = by + 58 + i * 46;
        if (e.luzTramo === i) forma(R(px - 8, ry - 24, iw + 16, 42, 12), { f: CF.cam, op: 0.16 });
        forma(R(px, ry - 17, 26, 26, 8), { f: COL_TRAMOS[i], s: ink, sw: 2 });
        T(px + 13, ry + 2, ic, { fs: 16, w: 700, a: 'middle', c: CF.ink });
        T(px + 38, ry - 3, i18n.t(t), { fs: movil ? 16 : 17, w: 600, c: THEME.text });
        T(px + 38, ry + 14, i18n.t(sub), { fs: 12.5, c: THEME.textDim, sys: true });
        const pc = tot ? porcentaje(e.c[i] / tot * 100) : '0';
        T(px + iw, ry + 1, `${e.c[i]} · ${pc} %`, { fs: movil ? 16 : 17, w: 700, a: 'end', c: e.c[i] && i === 2 ? THEME.vuelveTxt : THEME.text });
    });
    if (e.ult && !e.sinUlt) {
        const uy = by + 58 + 3 * 46 - 6;
        linea(`M${px} ${uy} H${px + iw}`, THEME.border, 1.5);
        T(px, uy + 32, i18n.t('Última α'), { fs: 14, c: THEME.textDim, sys: true });
        const lw = Math.max(86, anchoT(e.ult[0], { fs: 22, w: 700 }) + 26);
        forma(R(px + 80, uy + 10, lw, 36, 8), { f: THEME.headBg, s: THEME.headEdge, sw: 2 });
        T(px + 80 + lw / 2, uy + 36, e.ult[0], { fs: 22, w: 700, a: 'middle', c: THEME.headText });
        T(px + 92 + lw, uy + 33, e.ult[1], { fs: 15, c: THEME.text });
    }
}
const porcentaje = (p) => p === 0 ? '0' : i18n.num(p < 10 ? p.toFixed(1) : Math.round(p), p < 10 ? 1 : 0);

// ═════════ TIRA: ÁNGULO DE DESVIACIÓN EN PAPEL ═════════
function geomGrafica(x, y, w, h, movil) {
    const gx = x + (movil ? 50 : 70), gx1 = x + w - (movil ? 24 : 30), gy = y + (movil ? 58 : 56), gb = y + h - (movil ? 30 : 26);
    return { gx, gx1, gy, gb, bw: (gx1 - gx) / 18 };
}
function grafica(x, y, w, h, g, movil) {
    const ink = tinta(), G = geomGrafica(x, y, w, h, movil), { gx, gx1, gy, gb, bw } = G;
    forma(R(x + 4, y + 5, w, h, 16), { f: ink, op: THEME.fun ? 0.55 : 0 });
    forma(R(x, y, w, h, 16), { f: THEME.paper, s: THEME.paperLine || ink, sw: 3 });
    const pi = THEME.paperInk;
    T(x + (movil ? 14 : 22), y + (movil ? 24 : 28), movil ? i18n.t('Ángulo de desviación') : i18n.t('Ángulo de desviación · cuántas α llegan a cada ángulo'), { fs: movil ? 15 : 16, w: 600, c: pi });
    if (!movil) T(x + w - 26, y + 28, `n = ${g.n} α`, { fs: 15, w: 700, a: 'end', c: pi });
    else T(x + w - 14, y + 24, `n = ${g.n}`, { fs: 14, w: 700, a: 'end', c: pi });
    const top = g.top;
    for (let j = 0; j <= 2; j++) {
        const yy = gb - j * (gb - gy) / 2;
        linea(`M${gx} ${yy} H${gx1}`, THEME.paperGrid, 1);
        T(gx - 8, yy + 4, `${i18n.num(j * top / 2)} %`, { fs: 12, a: 'end', c: pi, sys: true });
    }
    const yv = (v) => gb - Math.min(v, top) / top * (gb - gy);
    const zig = (xx, zy) => { let d = `M${xx - 3} ${zy}`; for (let k = 0; k < 6; k++) d += ` l${bw / 6} ${k % 2 ? 6 : -6}`; return d; };
    if (g.ghost) g.ghost.forEach((v, i) => {
        if (!v) return;
        const xx = gx + i * bw + 3, hh = gb - yv(v);
        forma(R(xx - 2, gb - hh - 2, bw - 2, hh + 2), { s: THEME.huellaGraf, sw: 2, dash: [5, 4] });
    });
    g.p.forEach((v, i) => {
        if (!v) return;
        const xx = gx + i * bw + 3, yy = yv(v), col = i === 0 ? CF.recta : (i < 9 ? CF.desv : CF.vuel);
        if (g.luz === i) forma(R(xx - 6, gy - 2, bw + 6, gb - gy + 2), { f: CF.cam, op: 0.5 });
        if (g.hover === i) forma(R(xx - 4, gy - 2, bw + 2, gb - gy + 2), { f: THEME.accent, op: 0.18 });
        forma(R(xx, yy, bw - 6, gb - yy), { f: col, s: ink, sw: 2 });
        if (g.luz === i) chispaD(xx + bw - 2, yy - 8, 6);
        if (v > top) {
            const zy = gy + 12;
            forma(zig(xx, zy + 5), { s: THEME.paper, sw: 7 });
            forma(zig(xx, zy + 1), { s: ink, sw: 1.4 });
            forma(zig(xx, zy + 9), { s: ink, sw: 1.4 });
            const lab = porcentaje(v) + ' %', lw = anchoT(lab, { fs: 14, w: 700 }) + 16, lx = xx + (bw - 6) / 2 - lw / 2;
            pildora(lx, gy - 26, lw, 22, pi, ink, 1.2);
            T(lx + lw / 2, gy - 10, lab, { fs: 14, w: 700, a: 'middle', c: THEME.paper });
        }
    });
    forma(`M${gx} ${gy - 2} V${gb} H${gx1}`, { s: pi, sw: 2 });
    (movil ? [0, 90, 180] : [0, 30, 60, 90, 120, 150, 180]).forEach(a => {
        const xx = gx + a / 10 * bw;
        linea(`M${xx} ${gb} v5`, pi, 1.5);
        T(xx, gb + 18, a + '°', { fs: 12.5, a: 'middle', c: pi, sys: true });
    });
    const cortada = g.p[0] > top;
    if (!movil) {
        if (cortada) T(gx + bw + 14, gy - 10, i18n.t('← primera barra cortada'), { fs: 13, w: 600, c: THEME.paperChange, sys: true });
        if (g.ghost) {
            const nx = gx + bw * 4.1;
            forma(R(nx, gy - 21, 22, 12), { s: THEME.huellaGraf, sw: 2, dash: [5, 4] });
            T(nx + 30, gy - 10, g.ghostTxt, { fs: 13, c: pi, sys: true, w: 600 });
        }
        T(gx1, gy - 10, i18n.t('Aquí vuelven más α que en la realidad (allí, 1 de cada 8000) para que se vean.'), { fs: 12.5, a: 'end', c: THEME.paperDim, sys: true });
    } else {
        if (cortada) T(gx + bw + 40, gy - 12, i18n.t('← barra cortada'), { fs: 12, w: 600, c: THEME.paperChange, sys: true });
        if (g.ghost) { forma(R(x + w - 118, y + 33, 14, 9), { s: THEME.huellaGraf, sw: 1.6, dash: [4, 3] }); T(x + w - 98, y + 42, g.ghostCorto, { fs: 11.5, c: pi, sys: true }); }
    }
    // Consulta de una barra (ratón o dedo): recuento y porcentaje
    if (g.hover != null && g.hover >= 0) {
        const i = g.hover, xx = gx + i * bw + bw / 2, txt = `${i * 10}°–${i * 10 + 10}° · ${g.cuentas[i]} α · ${porcentaje(g.n ? g.cuentas[i] / g.n * 100 : 0)} %`;
        const tw = anchoT(txt, { fs: 13.5, w: 600, sys: true }) + 20, lx = Math.max(x + 8, Math.min(x + w - tw - 8, xx - tw / 2)), ly = gb - 34;
        forma(R(lx + 2, ly + 3, tw, 26, 13), { f: ink, op: 0.4 });
        forma(R(lx, ly, tw, 26, 13), { f: THEME.headBg, s: THEME.headEdge, sw: 1.5 });
        T(lx + tw / 2, ly + 18, txt, { fs: 13.5, w: 600, a: 'middle', c: THEME.headText, sys: true });
    }
    return G;
}

// ═════════ SELLO «¡VUELVE!» ═════════
function selloVuelve(x, y, t, sub, t0, movil) {
    const w = movil ? 250 : 300, h = movil ? 68 : 80, ctx = drawingContext, s = salto(t0);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rad(-5)); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
    forma(R(3, 4, w, h, 10), { f: tinta(), op: 0.35 });
    forma(R(0, 0, w, h, 10), { f: '#fff6d6', s: '#a5281b', sw: 3.5 });
    forma(R(5, 5, w - 10, h - 10, 7), { s: '#a5281b', sw: 1.2 });
    T(w / 2, movil ? 31 : 37, t, { fs: movil ? 20 : 24, w: 700, a: 'middle', c: '#a5281b' });
    T(w / 2, movil ? 53 : 62, sub, { fs: movil ? 13 : 15, w: 600, a: 'middle', c: '#a5281b' });
    ctx.restore();
}
