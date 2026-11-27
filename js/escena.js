// ═══════════════════════════════════════════════════════════════════
//  ESCENA DE «MODELOS ATÓMICOS» (plantilla común v1.1)
//  Común: js/escena-comun.js, arranque-comun.js, dibujo-comun.js, retos-comun.js.
//  Aquí: retícula A (aparato · modelo · panel de estado + tira de ángulos),
//  el móvil, los mandos y el momento clave «¡VUELVE!». La física es la de
//  siempre (js/ThomsonTarget.js y js/AlphaParticle.js, que mueve js/fisica.js)
//  y los dibujos del boceto aprobado están en js/dibujo.js.
// ═══════════════════════════════════════════════════════════════════
let CV_W = 1330, CV_H = 680;       // usados por arranque-comun.js
let ESC_MOVIL = null;
let LAY = null;
const elId = (id) => document.getElementById(id);

// Colores propios de cada tema
const TEMA_PROPIO = {
    pizarra:   { estela: '#ffe9c7', estelaLuz: '#fff4d6', avisoModelo: '#8fb3d1', vuelveTxt: '#ffb4b4', huellaGraf: '#5b6b7a', paperDim: '#4a5b6b', foco: 1 },
    dia:       { estela: '#9a5b12', estelaLuz: '#6b3500', avisoModelo: '#4d6b85', vuelveTxt: '#c0262d', huellaGraf: '#5b6b7a', paperDim: '#4a5b6b', foco: 0 },
    marca:     { estela: '#9a5b12', estelaLuz: '#6b3500', avisoModelo: '#64748b', vuelveTxt: '#c0262d', huellaGraf: '#64748b', paperDim: '#475569', foco: 0 },
    contraste: { estela: '#ffffff', estelaLuz: '#ffff00', avisoModelo: '#cccccc', vuelveTxt: '#ff8080', huellaGraf: '#aaaaaa', paperDim: '#cccccc', foco: 0 },
};

// Elementos (los nombres se traducen con i18n, como antes)
const ELEMENT_NAMES = {
  1:"Hidrógeno",2:"Helio",3:"Litio",4:"Berilio",5:"Boro",6:"Carbono",7:"Nitrógeno",
  8:"Oxígeno",9:"Flúor",10:"Neón",11:"Sodio",12:"Magnesio",13:"Aluminio",14:"Silicio",
  15:"Fósforo",16:"Azufre",17:"Cloro",18:"Argón",19:"Potasio",20:"Calcio",
  21:"Escandio",22:"Titanio",23:"Vanadio",24:"Cromo",25:"Manganeso",26:"Hierro",
  27:"Cobalto",28:"Níquel",29:"Cobre",30:"Zinc",31:"Galio",32:"Germanio",
  33:"Arsénico",34:"Selenio",35:"Bromo",36:"Criptón",37:"Rubidio",38:"Estroncio",
  39:"Itrio",40:"Circonio",41:"Niobio",42:"Molibdeno",43:"Tecnecio",44:"Rutenio",
  45:"Rodio",46:"Paladio",47:"Plata",48:"Cadmio",49:"Indio",50:"Estaño",
  51:"Antimonio",52:"Teluro",53:"Yodo",54:"Xenón",55:"Cesio",56:"Bario",
  57:"Lantano",58:"Cerio",59:"Praseodimio",60:"Neodimio",61:"Prometio",62:"Samario",
  63:"Europio",64:"Gadolinio",65:"Terbio",66:"Disprosio",67:"Holmio",68:"Erbio",
  69:"Tulio",70:"Iterbio",71:"Lutecio",72:"Hafnio",73:"Tántalo",74:"Wolframio",
  75:"Renio",76:"Osmio",77:"Iridio",78:"Platino",79:"Oro",80:"Mercurio",
  81:"Talio",82:"Plomo",83:"Bismuto",84:"Polonio",85:"Ástato",86:"Radón",
  87:"Francio",88:"Radio",89:"Actinio",90:"Torio",91:"Protactinio",92:"Uranio",
  93:"Neptunio",94:"Plutonio",95:"Americio",96:"Curio",97:"Berkelio",98:"Californio",
  99:"Einstenio",100:"Fermio",101:"Mendelevio",102:"Nobelio",103:"Laurencio",
  104:"Rutherfordio",105:"Dubnio",106:"Seaborgio",107:"Bohrio",108:"Hasio",
  109:"Meitnerio",110:"Darmstadtio",111:"Roentgenio",112:"Copernicio",113:"Nihonio",
  114:"Flerovio",115:"Moscovio",116:"Livermorio",117:"Teneso",118:"Oganesón"
};
const NO_METALES = new Set([1, 2, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 33, 34, 35, 36, 52, 53, 54, 85, 86, 117, 118]);
const nombreEl = (z) => i18n.t(ELEMENT_NAMES[z] || 'Z=' + z);
const nombreMin = (z) => { const n = nombreEl(z); return n.charAt(0).toLowerCase() + n.slice(1); };
// Electrones por capa (llenado por orden de energía, con las excepciones conocidas)
const EXCEPCIONES = { 24: [2, 8, 13, 1], 29: [2, 8, 18, 1], 41: [2, 8, 18, 12, 1], 42: [2, 8, 18, 13, 1], 44: [2, 8, 18, 15, 1], 45: [2, 8, 18, 16, 1], 46: [2, 8, 18, 18], 47: [2, 8, 18, 18, 1], 78: [2, 8, 18, 32, 17, 1], 79: [2, 8, 18, 32, 18, 1] };
function capasDe(z) {
    if (EXCEPCIONES[z]) return EXCEPCIONES[z];
    const orden = [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [3, 2], [4, 1], [5, 0], [4, 2], [5, 1], [6, 0], [4, 3], [5, 2], [6, 1], [7, 0], [5, 3], [6, 2], [7, 1]];
    const capas = []; let r = z;
    for (const [n, l] of orden) { if (r <= 0) break; const k = Math.min(r, 4 * l + 2); capas[n - 1] = (capas[n - 1] || 0) + k; r -= k; }
    return capas.map(v => v || 0).filter((v, i, a) => v > 0 || i < a.length - 1);
}

// ── Estado ───────────────────────────────────────────────────────────
const S = {
    exp: null, lanz: 'lluvia', enMarcha: true, v0: 10, ritmo: 20, h: -0.004,
    cuentas: new Array(18).fill(0), c3: [0, 0, 0], n: 0, maxDev: 0,
    guardadas: { atom: {}, foil: {} },           // la última gráfica de cada modelo, para la huella
    huella: null, nHuella: 0, destellos: [], trazas: [], celebra: null, yaCelebrado: false,
    ultima: null, tTag: 0, tagAntes: '', hover: -1, arrastre: null, disparos: 0,
    tirosZ: {}, tirosV: {}, anuncioClave: '',
};
const R_VISTA = { atom: 200, foil: 57 };          // radio del mundo que cabe en el círculo del modelo

// ── Retícula ─────────────────────────────────────────────────────────
function calcularEscena() {
    const movil = esMovil(), antes = CV_W + 'x' + CV_H;
    ESC_MOVIL = movil;
    if (!movil) {
        CV_W = 1330; CV_H = 680;
        LAY = {
            tarjetas: [{ x: 0, y: 0, w: 1330, h: 540 }], ap: { x: 0, y: 0, s: 1 }, leyAp: { x: 22, y: 379 },
            mo: { cx: 662, cy: 232, r: 182 }, leyMo: { x: 488, y: 452 }, panel: { x: 902, y: 24, w: 400, h: 492 },
            graf: { x: 0, y: 552, w: 1330, h: 128 }, sello: { x: 952, y: 436 },
            mAp: { x: 22, y: 394, w: 400 }, mMo: { x: 492, y: 490, w: 340 },
        };
    } else {
        CV_W = 370; CV_H = 1680;
        LAY = {
            tarjetas: [{ x: 0, y: 0, w: 370, h: 488 }, { x: 0, y: 504, w: 370, h: 470 }], ap: { x: 16, y: 4, s: 0.84 }, leyAp: { x: 10, y: 328 },
            mo: { cx: 185, cy: 678, r: 160 }, leyMo: { x: 16, y: 884 }, panel: { x: 0, y: 990, w: 370, h: 500 },
            graf: { x: 0, y: 1508, w: 370, h: 170 }, sello: { x: 60, y: 1396 },
            mAp: { x: 14, y: 344, w: 342 }, mMo: { x: 14, y: 918, w: 342 },
        };
    }
    colocarMandos();
    return antes !== CV_W + 'x' + CV_H;
}
function colocarMandos() {
    if (!LAY) return;
    colocarSobreLienzo(elId('mandos-aparato'), LAY.mAp, CV_W, CV_H);
    colocarSobreLienzo(elId('mandos-modelo'), LAY.mMo, CV_W, CV_H);
}

// ── Del mundo a la escena ─────────────────────────────────────────────
const escalaModelo = () => LAY.mo.r / R_VISTA[S.exp.vista];
function aModelo(wx, wy) { const k = escalaModelo(); return [LAY.mo.cx + (wx - S.exp.cx) * k, LAY.mo.cy + (wy - S.exp.cy) * k]; }
// Dónde se dibuja una α dentro del aparato (coordenadas del aparato)
function enAparato(a) {
    const X = S.exp;
    if (a.fase === 0) {
        const p = constrain((a.pos.x - (X.cx - X.detR)) / X.detR, 0, 1);
        return [BOQUILLA_X + p * (AX - BOQUILLA_X), AY];
    }
    const d = Math.hypot(a.pos.x - X.cx, a.pos.y - X.cy), f = constrain((d - a.dCambio) / Math.max(1, X.detR - a.dCambio), 0, 1);
    return posA(anguloSalida(a), f * RZ);
}
const alturaModelo = () => S.h * LAY.mo.r * 0.92;           // altura de la mirilla en el círculo
const alturaMundo = () => S.h * LAY.mo.r * 0.92 / escalaModelo();

// ── Experimento ──────────────────────────────────────────────────────
function borrarResultados() {
    S.cuentas = new Array(18).fill(0); S.c3 = [0, 0, 0]; S.n = 0; S.maxDev = 0;
    S.huella = new Path2D(); S.nHuella = 0; S.destellos = []; S.trazas = []; S.celebra = null; S.yaCelebrado = false;
    S.ultima = null; S.exp.alphas = [];
}
function guardarGrafica() {
    if (S.n >= 20) S.guardadas[S.exp.vista][S.exp.modelo] = { cuentas: S.cuentas.slice(), n: S.n };
}
function cambiarModelo(m, sinGuardar) {
    if (m === S.exp.modelo) return;
    if (!sinGuardar) guardarGrafica();
    S.exp.modelo = m; S.exp.construir(); borrarResultados(); actualizarUI();
}
function cambiarVista(v) {
    if (v === S.exp.vista) return;
    guardarGrafica();
    S.exp.vista = v; S.exp.construir(); borrarResultados(); actualizarUI();
}
function cambiarZ(z) {
    z = constrain(Math.round(z), 1, 118);
    if (z === S.exp.z) { actualizarUI(); return; }
    S.exp.z = z; S.exp.construir(); S.guardadas = { atom: {}, foil: {} }; borrarResultados(); actualizarUI();
}
function lanzarUna() {
    if (S.lanz !== 'una') return;
    S.exp.lanzar(alturaMundo(), S.v0, { disparo: true, h: S.h });
    S.disparos++;
}
function alLlegar(a) {
    const dev = a.deviationAngle, ang = anguloSalida(a), tramo = dev < 10 ? 0 : dev <= 90 ? 1 : 2;
    let bin = Math.floor(dev / 10); bin = constrain(bin, 0, 17);
    S.cuentas[bin]++; S.c3[tramo]++; S.n++; S.maxDev = Math.max(S.maxDev, dev);
    const ahora = millis();
    // destello en la pantalla (no hay pantalla junto a la fuente) y su huella
    if (Math.abs(ang) <= 180 - HUECO) {
        S.destellos.push({ a: ang, t: ahora });
        if (S.destellos.length > 40) S.destellos.shift();
        if (S.nHuella < 1500) { const [x, y] = posA(ang + (Math.random() - 0.5) * 1.2, RZ + (Math.random() - 0.5) * 7); S.huella.moveTo(x + 1.5, y); S.huella.arc(x, y, 1.5, 0, 6.29); S.nHuella++; }
    }
    // trayectoria que se queda dibujada en el modelo
    const pts = a.history.map(p => [p.x, p.y]).concat([[a.pos.x, a.pos.y]]);
    const rv = R_VISTA[S.exp.vista] + 8, visible = pts.some(([x, y]) => Math.hypot(x - S.exp.cx, y - S.exp.cy) < rv);
    let traza = null;
    if (visible) { traza = { pts, t: ahora, luz: false }; S.trazas.push(traza); if (S.trazas.length > 8) S.trazas.shift(); }
    // el momento clave: vuelve hacia atrás
    if (dev > 90) {
        const grande = !!a.disparo || !S.yaCelebrado;
        S.celebra = { a: Math.abs(ang) <= 180 - HUECO ? ang : null, t0: ahora, grande, dev, bin, dur: grande ? 4200 : 1600 };
        if (grande) { S.yaCelebrado = true; S.tTag = ahora; if (traza) traza.luz = true; }
    }
    if (a.disparo || !S.ultima || S.lanz === 'lluvia') S.ultima = { dev, tramo, disparo: !!a.disparo, t: ahora };
    comprobarRetos(a, dev);
}

// ── Retos ────────────────────────────────────────────────────────────
function comprobarRetos(a, dev) {
    if (a.disparo && dev > 90) RETOS_ESCENA.hecho('nucleo');
    if (dev > 170) RETOS_ESCENA.hecho('casi');
    if (S.exp.modelo === 'thomson' && S.n >= 500 && S.maxDev < 5) RETOS_ESCENA.hecho('thomson');
    if (!a.disparo || S.exp.modelo !== 'rutherford') return;
    const kz = `${S.exp.vista}|${a.h.toFixed(3)}|${a.v0}`;
    const t = S.tirosZ[kz] = S.tirosZ[kz] || {};
    t[S.exp.z] = dev > 90;
    if (t[79] === true && t[1] === false) RETOS_ESCENA.hecho('ligero');
    const kv = `${S.exp.vista}|${S.exp.z}|${a.h.toFixed(3)}`;
    const l = S.tirosV[kv] = S.tirosV[kv] || [];
    l.push({ v: a.v0, dev });
    if (l.some(p => p.dev >= 10 && l.some(q => q.v > p.v && q.dev < p.dev - 2))) RETOS_ESCENA.hecho('velocidad');
}

// ── Panel de estado ──────────────────────────────────────────────────
const textoAngulo = (d) => (d < 10 ? i18n.num(d, 1) : Math.round(d)) + '°';
const TRAMO_UNO = ['pasa casi recta', 'se desvía', 'vuelve hacia atrás'];
function estadoPanel() {
    const thom = S.exp.modelo === 'thomson';
    const e = { tag: thom ? i18n.t('CARGA REPARTIDA') : i18n.t('NÚCLEO DIMINUTO'), col: thom ? CF.thom : CF.prot, n: S.n, c: S.c3, t0: S.tTag };
    const u = S.ultima, ahora = millis(), cel = S.celebra && ahora - S.celebra.t0 < S.celebra.dur ? S.celebra : null;
    if (u) e.ult = [textoAngulo(u.dev), i18n.t(TRAMO_UNO[u.tramo])];
    if (cel && cel.grande) { e.sinUlt = true; e.luz = true; e.luzTramo = 2; }
    if (S.lanz === 'una' && u && u.disparo) {
        const a = textoAngulo(u.dev);
        if (u.tramo === 2) e.msg = i18n.t('Esta α ha vuelto hacia atrás: {a}. No ha tocado el núcleo: la repulsión eléctrica la ha frenado y la ha devuelto.', { a });
        else if (thom) e.msg = i18n.t('Esta α ha pasado casi recta ({a}): la carga positiva está repartida y apenas la desvía.', { a });
        else if (u.tramo === 1) e.msg = i18n.t('Esta α se ha desviado {a}: ha pasado cerca del núcleo y la repulsión eléctrica la ha apartado.', { a });
        else e.msg = i18n.t('Esta α ha pasado casi recta ({a}): lejos del núcleo, el átomo está casi vacío.', { a });
        e.clave = 'uno' + S.disparos;
    } else if (S.n === 0) {
        e.msg = S.lanz === 'una'
            ? i18n.t('Arrastra la mirilla del modelo para apuntar y pulsa «Lanzar α». Mira dónde destella la pantalla.')
            : i18n.t('Las α salen de la fuente hacia la lámina. Mira dónde destella la pantalla: cada destello es una α que llega.');
        e.clave = 'vacio' + S.lanz;
    } else if (thom) {
        if (S.n >= 200 && S.c3[2] === 0) { e.msg = i18n.t('{n} α y ninguna vuelve hacia atrás: es lo que predice Thomson. La carga repartida solo las desvía un poco. En 1909, alguna volvió.', { n: S.n }); e.clave = 'thom200'; }
        else { e.msg = i18n.t('Todas pasan casi rectas: la carga positiva está repartida por todo el átomo y ninguna zona empuja fuerte a las α.'); e.clave = 'thom'; }
    } else {
        const huellaT = S.guardadas[S.exp.vista].thomson;
        if (S.c3[2] > 0 && huellaT && S.n >= 30) { e.msg = i18n.t('Alguna vuelve hacia atrás, como en 1909. Thomson explicaba lo que se sabía hasta entonces; este experimento pidió un modelo nuevo.'); e.clave = 'ruthT'; }
        else if (S.c3[2] > 0) { e.msg = i18n.t('Casi todas pasan rectas: el átomo está casi vacío. Las que pasan cerca del núcleo se desvían, y alguna vuelve hacia atrás.'); e.clave = 'ruthV'; }
        else { e.msg = i18n.t('Casi todas pasan rectas: el átomo está casi vacío. Las que pasan cerca del núcleo se desvían.'); e.clave = 'ruth'; }
    }
    if (e.tag !== S.tagAntes) { S.tagAntes = e.tag; S.tTag = ahora; e.t0 = ahora; }
    if (e.clave !== S.anuncioClave) { S.anuncioClave = e.clave; const el = elId('anuncio'); if (el) el.textContent = `${e.tag}. ${e.msg}`; }
    return e;
}
function datosGrafica() {
    const n = S.n, p = S.cuentas.map(c => n ? c / n * 100 : 0);
    const otro = S.exp.modelo === 'thomson' ? 'rutherford' : 'thomson', gd = S.guardadas[S.exp.vista][otro];
    let ghost = null, ghostTxt = '', ghostCorto = '';
    if (gd) {
        ghost = gd.cuentas.map(c => c / gd.n * 100);
        if (otro === 'thomson') {
            const todas = gd.cuentas[0] === gd.n;
            ghostTxt = todas ? i18n.t('lo que dio Thomson: todas en la primera barra') : i18n.t('lo que dio Thomson');
            ghostCorto = i18n.t('Thomson');
        } else { ghostTxt = i18n.t('lo que dio Rutherford'); ghostCorto = i18n.t('Rutherford'); }
    }
    const resto = Math.max(...p.slice(1), ...(ghost ? ghost.slice(1) : [0]));
    const top = [10, 20, 50, 100].find(t => t >= resto * 1.1) || 100;
    const cel = S.celebra && millis() - S.celebra.t0 < S.celebra.dur && S.celebra.grande ? S.celebra : null;
    return { n, p, top, ghost, ghostTxt, ghostCorto, luz: cel ? cel.bin : null, hover: S.hover, cuentas: S.cuentas };
}

// ── Dibujo ───────────────────────────────────────────────────────────
function setup() {
    if (document.fonts) { document.fonts.load('600 16px Fredoka'); document.fonts.load('700 16px Fredoka'); }
    S.exp = new Experimento();
    S.exp.alLlegar = alLlegar;
    S.huella = new Path2D();
    calcularEscena();
    const cv = createCanvas(CV_W, CV_H);
    cv.parent('canvas-container');
    cv.elt.setAttribute('tabindex', '0');
    cv.elt.setAttribute('role', 'application');
    cv.elt.setAttribute('aria-label', i18n.t('Experimento de Rutherford. Con «Una a una», las flechas arriba y abajo mueven la mirilla e Intro lanza una α.'));
    iniciarSelectorTema();
    iniciarEventos(cv.elt);
    fitCanvas();
    actualizarUI();
}
function draw() {
    actualizarTema(TEMA_PROPIO);
    if (COLORES.alfaPropio) THEME.estela = COLORES.alfa;
    vigilarRendimiento();
    clear();
    if (S.enMarcha && S.lanz === 'lluvia') S.exp.lanzarLluvia(S.v0, S.ritmo);
    S.exp.paso();
    LAY.tarjetas.forEach(t => tarjeta(t));
    dibujarAparato();
    dibujarModelo();
    const e = estadoPanel();
    panelEstado(LAY.panel.x, LAY.panel.y, LAY.panel.w, LAY.panel.h, e, ESC_MOVIL);
    const cel = S.celebra && millis() - S.celebra.t0 < S.celebra.dur ? S.celebra : null;
    if (cel && cel.grande) selloVuelve(LAY.sello.x, LAY.sello.y, i18n.t('¡VUELVE!'), i18n.t('desviada {a}, sin tocar el núcleo', { a: textoAngulo(cel.dev) }), cel.t0, ESC_MOVIL);
    grafica(LAY.graf.x, LAY.graf.y, LAY.graf.w, LAY.graf.h, datosGrafica(), ESC_MOVIL);
}
function dibujarAparato() {
    const L = LAY.ap, ahora = millis();
    push(); translate(L.x, L.y); scale(L.s);
    const alfas = S.exp.alphas.map(enAparato).filter(([x]) => x > BOQUILLA_X + 2);
    const cel = S.celebra && S.celebra.a != null && ahora - S.celebra.t0 < S.celebra.dur ? S.celebra : null;
    S.destellos = S.destellos.filter(d => ahora - d.t < 1400);
    aparato({ huella: S.huella, destellos: S.destellos, alfas, celebra: cel, marca: !ESC_MOVIL });
    pop();
    leyendaAparato(LAY.leyAp.x, LAY.leyAp.y, !ESC_MOVIL, ESC_MOVIL);
}
function dibujarModelo() {
    const { cx, cy, r } = LAY.mo, X = S.exp, thom = X.modelo === 'thomson', k = escalaModelo(), sc = r / 182, t = millis() / 1000;
    marcoFondo(cx, cy, r, ESC_MOVIL ? null : [AX, AY]);
    recortar(circ(cx, cy, r), () => {
        if (X.vista === 'atom') {
            const rA = X.atomo.R * k;
            if (thom) atomoThom(cx, cy, rA, X.atomo.electrons.map(e => aModelo(e.pos.x, e.pos.y)), sc);
            else atomoRuthFondo(cx, cy, rA, capasDe(X.z), sc);
        } else {
            const ar = 14 * 0.6 * k;
            X.lamina.forEach((a, i) => {
                const [x, y] = aModelo(a.pos.x, a.pos.y);
                if (Math.hypot(x - cx, y - cy) > r + ar) return;
                if (thom) esferaThom(x, y, ar, sc, X.z, 200 + i * 7); else atomoRuthPeq(x, y, ar, sc, X.z, 300 + i * 7);
            });
        }
        // trayectorias que se quedan, y las α que vuelan ahora
        const ahora = millis();
        S.trazas = S.trazas.filter(tr => ahora - tr.t < 9000 || (tr.luz && S.celebra && ahora - S.celebra.t0 < S.celebra.dur));
        S.trazas.forEach(tr => {
            const pts = tr.pts.map(([x, y]) => aModelo(x, y));
            if (tr.luz && S.celebra && ahora - S.celebra.t0 < S.celebra.dur) estelaLuz(pts);
            else estela(pts, 0.45 * Math.max(0, 1 - (ahora - tr.t) / 9000) + 0.05, 2.2);
        });
        X.alphas.forEach(a => {
            const pts = a.history.map(p => aModelo(p.x, p.y)); const cab = aModelo(a.pos.x, a.pos.y); pts.push(cab);
            estela(pts, 0.85, 2.4);
        });
        if (X.vista === 'atom' && !thom) { atomoRuthElectrones(cx, cy, X.atomo.R * k, capasDe(X.z), sc, t); nucleo(cx, cy, sc * 0.78, X.z); }
        X.alphas.forEach(a => { const [x, y] = aModelo(a.pos.x, a.pos.y); if (Math.hypot(x - cx, y - cy) < r + 10) alfa(x, y, sc * 1.1); });
    });
    const el = nombreMin(X.z), nm = NO_METALES.has(X.z);
    const rot = ESC_MOVIL
        ? (X.vista === 'atom' ? i18n.t('Modelo de un átomo de {el}', { el }) : nm ? i18n.t('Modelo de átomos de {el}', { el }) : i18n.t('Modelo de la lámina de {el}', { el }))
        : (X.vista === 'atom' ? i18n.t('Modelo: así imaginamos un átomo de {el}', { el }) : nm ? i18n.t('Modelo: así imaginamos átomos de {el}', { el }) : i18n.t('Modelo: así imaginamos la lámina de {el}', { el }));
    marcoBorde(cx, cy, r, rot, ESC_MOVIL ? 14.5 : 16);
    if (S.lanz === 'una') {
        const yb = alturaModelo(), x = cx - Math.sqrt(Math.max(0, r * r - yb * yb));
        const lat = MOV_REDUCIDO ? 1 : 1 + 0.08 * Math.sin(millis() / 300);
        mirilla(x, cy + yb, cx + Math.sqrt(Math.max(0, r * r - yb * yb)) - 6, lat);
        LAY.mirilla = [x, cy + yb];
    } else LAY.mirilla = null;
    leyendaModelo(LAY.leyMo.x, LAY.leyMo.y, thom, ESC_MOVIL, thom ? i18n.t('Thomson (1904): los electrones, encajados como pasas') : i18n.t('Núcleo dibujado enorme: a escala sería invisible'));
}

// ── Interfaz ─────────────────────────────────────────────────────────
function marcar(sel, on) { document.querySelectorAll(sel).forEach(b => { const a = on(b); b.classList.toggle('active', a); b.setAttribute(b.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-checked', String(a)); }); }
function actualizarUI() {
    const X = S.exp;
    marcar('[data-modelo]', b => b.dataset.modelo === X.modelo);
    marcar('[data-vista]', b => b.dataset.vista === X.vista);
    marcar('[data-lanz]', b => b.dataset.lanz === S.lanz);
    marcar('[data-z]', b => +b.dataset.z === X.z);
    elId('btn-otro').classList.toggle('active', ![79, 47, 29, 13].includes(X.z));
    elId('fila-ritmo').hidden = S.lanz !== 'lluvia';
    elId('fila-altura').hidden = S.lanz !== 'una';
    const bl = elId('btn-lanzar');
    bl.innerHTML = S.lanz === 'una' ? i18n.t('▶ Lanzar α') : S.enMarcha ? i18n.t('❚❚ Parar') : i18n.t('▶ Lanzar');
    bl.setAttribute('aria-pressed', S.lanz === 'lluvia' ? String(S.enMarcha) : 'false');
    elId('sl-z').value = X.z;
    elId('val-z').textContent = `${X.z} · ${nombreEl(X.z)}`;
    elId('val-energia').textContent = i18n.num(S.v0, 1);
    elId('val-ritmo').textContent = `${S.ritmo} α/s`;
    elId('val-altura').textContent = (S.h <= -0.005 ? '−' : '') + i18n.num(Math.abs(S.h), 2);
    ['sl-energia', 'sl-ritmo', 'sl-altura', 'sl-z'].forEach(id => pintarRelleno(elId(id)));
    const el = nombreMin(X.z);
    elId('frase').innerHTML = NO_METALES.has(X.z)
        ? `<strong>${i18n.t('α contra átomos de {el} (en 1909 se usó una lámina de oro).', { el })}</strong><br><em>${i18n.t('Cada destello en la pantalla es una α que llega.')}</em>`
        : `<strong><span class="solo-ancho">${i18n.t('1909: α contra una lámina de {el} de más de mil átomos de grosor.', { el })}</span><span class="solo-movil">${i18n.t('1909: α contra una lámina de {el} de más de mil átomos.', { el })}</span></strong><br><em>${i18n.t('Cada destello en la pantalla es una α que llega.')}</em>`;
}
function cambiarLanz(m) {
    if (m === S.lanz) return;
    S.lanz = m; S.enMarcha = m === 'lluvia'; S.exp.alphas = []; S.ultima = null; S.yaCelebrado = false;
    actualizarUI();
}
function coordsLienzo(e) {
    const cv = document.querySelector('#canvas-container canvas'), r = cv.getBoundingClientRect();
    const t = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0]) || e;
    return { x: (t.clientX - r.left) / r.width * CV_W, y: (t.clientY - r.top) / r.height * CV_H };
}
function fijarAltura(h) { S.h = constrain(h, -1, 1); elId('sl-altura').value = (S.h * 100).toFixed(1); actualizarUI(); }
function binBajo(p) {
    const g = LAY.graf, G = geomGrafica(g.x, g.y, g.w, g.h, ESC_MOVIL);
    if (p.y < G.gy - 4 || p.y > G.gb + 6 || p.x < G.gx || p.x > G.gx1) return -1;
    return constrain(Math.floor((p.x - G.gx) / G.bw), 0, 17);
}
function iniciarEventos(cv) {
    document.querySelectorAll('[data-modelo]').forEach(b => b.addEventListener('click', () => cambiarModelo(b.dataset.modelo)));
    document.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => cambiarVista(b.dataset.vista)));
    document.querySelectorAll('[data-lanz]').forEach(b => b.addEventListener('click', () => cambiarLanz(b.dataset.lanz)));
    document.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => cambiarZ(+b.dataset.z)));
    elId('btn-lanzar').addEventListener('click', () => { if (S.lanz === 'una') lanzarUna(); else { S.enMarcha = !S.enMarcha; actualizarUI(); } });
    elId('btn-reiniciar').addEventListener('click', () => { borrarResultados(); actualizarUI(); });
    elId('sl-energia').addEventListener('input', () => { S.v0 = +elId('sl-energia').value; S.yaCelebrado = false; actualizarUI(); });
    elId('sl-ritmo').addEventListener('input', () => { S.ritmo = +elId('sl-ritmo').value; actualizarUI(); });
    elId('sl-altura').addEventListener('input', () => { S.h = +elId('sl-altura').value / 100; actualizarUI(); });
    elId('sl-z').addEventListener('input', () => cambiarZ(+elId('sl-z').value));
    // Mirilla: se arrastra; un toque sin arrastrar lanza. Tocar el círculo la lleva a esa altura.
    const pulsar = (e) => {
        const p = coordsLienzo(e);
        const bin = binBajo(p);
        if (bin >= 0) { S.hover = (e.touches && S.hover === bin) ? -1 : bin; return; }
        if (S.lanz !== 'una' || !LAY.mirilla) return;
        const { cx, cy, r } = LAY.mo, [mx, my] = LAY.mirilla;
        if (Math.hypot(p.x - mx, p.y - my) < 26) { S.arrastre = { y0: p.y, movido: false }; if (e.cancelable) e.preventDefault(); }
        else if (Math.hypot(p.x - cx, p.y - cy) < r) { fijarAltura((p.y - cy) / (r * 0.92)); if (e.cancelable) e.preventDefault(); }
    };
    const mover = (e) => {
        const p = coordsLienzo(e);
        if (!S.arrastre) { if (!e.touches) { const b = binBajo(p); if (b !== S.hover) S.hover = b; } return; }
        if (Math.abs(p.y - S.arrastre.y0) > 3) S.arrastre.movido = true;
        if (S.arrastre.movido) fijarAltura((p.y - LAY.mo.cy) / (LAY.mo.r * 0.92));
        if (e.cancelable) e.preventDefault();
    };
    const soltar = () => { if (S.arrastre && !S.arrastre.movido) lanzarUna(); S.arrastre = null; };
    cv.addEventListener('mousedown', pulsar); window.addEventListener('mousemove', mover); window.addEventListener('mouseup', soltar);
    cv.addEventListener('mouseleave', () => { if (!S.arrastre) S.hover = -1; });
    cv.addEventListener('touchstart', pulsar, { passive: false }); cv.addEventListener('touchmove', mover, { passive: false });
    cv.addEventListener('touchend', soltar); cv.addEventListener('touchcancel', () => { S.arrastre = null; });
    cv.addEventListener('keydown', (e) => {
        if (S.lanz !== 'una') return;
        const paso = e.shiftKey ? 0.05 : 0.005;
        if (e.key === 'ArrowUp') { fijarAltura(S.h - paso); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { fijarAltura(S.h + paso); e.preventDefault(); }
        else if (e.key === 'Enter' || e.key === ' ') { lanzarUna(); e.preventDefault(); }
    });
    // Paneles, pantalla completa, tema recordado
    iniciarPopover('btn-ayuda', 'panel-ayuda');
    iniciarPopover('btn-otro', 'panel-z');
    elId('check-pantalla').addEventListener('change', (e) => {
        try {
            if (e.target.checked && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
            else if (!e.target.checked && document.fullscreenElement) document.exitFullscreen();
        } catch (err) { /* nada */ }
    });
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => fitCanvas()); document.querySelectorAll('.barra-sup, .barra-sus').forEach(n => ro.observe(n)); }
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) elId('check-pantalla').checked = false; setTimeout(fitCanvas, 100); });
    document.querySelectorAll('.theme-opt').forEach(b => b.addEventListener('click', () => { try { localStorage.setItem('sim-modelos-tema', b.dataset.theme); } catch (e) { /* nada */ } }));
    const clave = { pizarra: 'dark', dia: 'light', marca: 'marca', contraste: 'contrast' }[temaActual()];
    document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === clave));
    // Colores y tamaño de los electrones (⚙)
    [['col-alfa', 'alfa'], ['col-prot', 'prot'], ['col-neut', 'neut'], ['col-elec', 'elec']].forEach(([id, k]) => elId(id).addEventListener('input', (e) => {
        COLORES[k] = e.target.value; if (k === 'alfa') COLORES.alfaPropio = true; CACHE_BOLAS.clear();
    }));
    elId('sl-tam-e').addEventListener('input', (e) => { COLORES.tamE = +e.target.value; elId('val-tam-e').textContent = e.target.value; pintarRelleno(e.target); });
    // En los grupos de opciones, las flechas pasan a la opción vecina
    document.querySelectorAll('.carril[role="radiogroup"], .carril[role="tablist"]').forEach(grupo => {
        grupo.addEventListener('keydown', (e) => {
            const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            if (!paso) return;
            const bs = [...grupo.querySelectorAll('.carril-btn')], i = bs.indexOf(document.activeElement);
            if (i < 0) return;
            e.preventDefault(); const b = bs[(i + paso + bs.length) % bs.length]; b.focus(); b.click();
        });
    });
    // Dirección con ajustes (fichas del alumnado): los mismos parámetros que antes. Ver js/parametros.js
    const si = (v) => ['1', 'si', 'sí', 'true'].includes(v);
    aplicarParametrosUrl({
        tema:        (v) => { const t = { simulaciencia: 'marca', marca: 'marca', claro: 'light', oscuro: 'dark', contraste: 'contrast' }[v]; const b = t && document.querySelector(`.theme-opt[data-theme="${t}"]`); if (b) b.click(); },
        modelo:      (v) => { if (v === 'thomson' || v === 'rutherford') cambiarModelo(v, true); },
        vista:       (v) => { const m = { atom: 'atom', atomo: 'atom', 'átomo': 'atom', foil: 'foil', lamina: 'foil', 'lámina': 'foil' }[v]; if (m) cambiarVista(m); },
        z:           (v) => { const n = parseInt(v, 10); if (isFinite(n)) cambiarZ(n); },
        lanzamiento: (v) => { const m = { click: 'una', clic: 'una', una: 'una', continuous: 'lluvia', lluvia: 'lluvia' }[v]; if (m) cambiarLanz(m); },
        ritmo:       urlParam.range('sl-ritmo'),
        velocidad:   urlParam.range('sl-energia'),
        emision:     (v) => { if (S.lanz === 'lluvia') { S.enMarcha = si(v); actualizarUI(); } },
        grafico:     () => {},                     // la gráfica ya está siempre a la vista
        retos:       (v) => { if (si(v)) abrirRetos(); },
    });
}
