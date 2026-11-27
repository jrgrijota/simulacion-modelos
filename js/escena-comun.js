// ═══════════════════════════════════════════════════════════════════
//  ESCENA COMÚN DE SIMULACIENCIA · v1.0 (20 de noviembre de 2026)
//
//  Piezas que se repiten en todas las simulaciones rediseñadas como
//  escenas (ver la guía de diseño v2, «simulaciones como escenas»).
//  Este archivo es IDÉNTICO en todas las simulaciones: no se edita en una
//  sola. Si hay que cambiar algo, se cambia en el original y se copia a
//  todas (como i18n.js o sello.js). Lo propio de cada simulación va en sus
//  archivos (escena.js, retos.js…).
//
//  Necesita p5.js en modo global y el objeto global «i18n».
//  Se carga después de p5 y antes de los archivos propios de la simulación.
//
//  Contenido
//    1. Constantes        FUENTE_TEXTO, MOV_REDUCIDO, ANCHO_MOVIL, esMovil()
//    2. Temas             TEMAS_ESCENA, actualizarTema(), iniciarSelectorTema()
//    3. Lienzo y mandos   encajarEscena(), colocarSobreLienzo()
//    4. Texto             fuenteJuego(), partirLineas(), trozosRicos(),
//                         partirRico(), textoRico()
//    5. Dibujos comunes   tarjeta(), etiquetaRotulo(), insignia(), chispa(),
//                         estrella(), medirSello(), sello(), salto()
//    6. Accesibilidad     anunciar()
//    7. Paneles           iniciarPopover(), cerrar con [data-cerrar]
//    8. Retos y álbum     crearAlmacen(), iniciarPanelRetos(),
//                         abrirRetos(), cerrarRetos(), abrirAlbum(), cerrarAlbum()
// ═══════════════════════════════════════════════════════════════════

const ESCENA_COMUN_VERSION = '1.0';

// ── 1. Constantes ────────────────────────────────────────────────
const FUENTE_TEXTO = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MOV_REDUCIDO = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const ANCHO_MOVIL = 760;    // por debajo, composición vertical (móvil)

function esMovil() { return window.matchMedia(`(max-width: ${ANCHO_MOVIL}px)`).matches; }

// ── 2. Temas ─────────────────────────────────────────────────────
// Colores del lienzo de cada tema. Los colores de estado (sólido, líquido,
// gas y cambio) y de energía (heat, cold) son los mismos en todas las
// simulaciones. Cada simulación añade los de sus objetos (termómetro,
// placa, muelle…) con actualizarTema(PROPIOS), donde PROPIOS tiene las
// mismas cuatro claves: pizarra, dia, marca, contraste.
let THEME = {};

const TEMAS_ESCENA = {
    // Pizarra (tema por defecto): azules de SimulaCiencia, oscuro de tono medio
    pizarra: {
        cardBg: '#123a5c', cardEdge: '#2b5f88', headBg: '#0e2238', headEdge: '#9fb9cc', headText: '#ffffff',
        pillBg: '#0f2c45', modelBg: '#111e2a', hundido: '#0e2b45', changeInk: '#061523',
        paper: '#d6e6f3', paperGrid: '#b9cfe2', paperInk: '#24323f', paperLine: '#061523', paperChange: '#a5281b',
        paperSolid: '#1a5f99', paperLiquid: '#0a6b4c', paperGas: '#b4500e', pen: '#ff7a59',
        curveSolid: '#4aa8f0', curveLiquid: '#1fcf8f', curveGas: '#ff9a4a',
        canvasBg: '#11314f', panelBg: '#15395a', border: '#2d6996',
        text: '#eef7ff', textDim: '#b5d3ec', accent: '#00c8ff', title: '#ffffff',
        solid: '#9ec9ff', liquid: '#34e3a8', gas: '#ffa25a', change: '#ffd84a',
        heat: '#ff7043', cold: '#4aa8ff',
        lensBg: '#0f2d49', grid: '#1c4366', axis: '#b5d3ec',
        particle: '#f4fbff', particleEdge: '#071a2b', bond: 'rgba(0,200,255,0.6)',
        ink: '#071a2b', fun: true,
    },
    // Día: claro pero no blanco, con el azul de la marca
    dia: {
        cardBg: '#e9f2fa', cardEdge: '#a9c6de', headBg: '#13304a', headEdge: '#13304a', headText: '#ffffff',
        pillBg: '#f7fbff', modelBg: '#e4eff8', hundido: '#d3e2ef', changeInk: '#ffffff',
        paper: '#d6e6f3', paperGrid: '#b9cfe2', paperInk: '#24323f', paperLine: '#13304a', paperChange: '#a5281b',
        paperSolid: '#1a5f99', paperLiquid: '#0a6b4c', paperGas: '#b4500e', pen: '#ff7a59',
        curveSolid: '#4aa8f0', curveLiquid: '#1fcf8f', curveGas: '#ff9a4a',
        canvasBg: '#eef5fb', panelBg: '#f7fbff', border: '#a9c6de',
        text: '#13304a', textDim: '#3f5f7a', accent: '#0369a1', title: '#0b2236',
        solid: '#1f5fbf', liquid: '#0a7d58', gas: '#c2410c', change: '#b45309',
        heat: '#e0401e', cold: '#1a72d0',
        lensBg: '#e4eff8', grid: '#d3e2ef', axis: '#3f5f7a',
        particle: '#fffaf0', particleEdge: '#13304a', bond: 'rgba(3,105,161,0.55)',
        ink: '#13304a', fun: true,
    },
    // SimulaCiencia: la paleta de simulaciencia.es y de los vídeos del canal
    marca: {
        cardBg: '#ffffff', cardEdge: '#e2e8f0', headBg: '#1e293b', headEdge: '#1e293b', headText: '#ffffff',
        pillBg: '#ffffff', modelBg: '#f1f5f9', hundido: '#e2e8f0', changeInk: '#ffffff',
        paper: '#eef4fa', paperGrid: '#d5e1ec', paperInk: '#1e293b', paperLine: '#1e293b', paperChange: '#6d28d9',
        paperSolid: '#0369a1', paperLiquid: '#0f766e', paperGas: '#c2410c', pen: '#dc2626',
        canvasBg: '#f8fafc', panelBg: '#ffffff', border: '#e2e8f0',
        text: '#1e293b', textDim: '#64748b', accent: '#0369a1',
        solid: '#0369a1', liquid: '#0f766e', gas: '#c2410c', change: '#6d28d9',
        heat: '#dc2626', cold: '#0284c7',
        lensBg: '#f1f5f9', grid: '#e2e8f0', axis: '#64748b',
        particle: '#334155', particleEdge: '#0f172a', bond: 'rgba(3,105,161,0.55)',
    },
    // Alto contraste: negro, blanco y amarillo
    contraste: {
        cardBg: '#000000', cardEdge: '#ffff00', headBg: '#000000', headEdge: '#ffffff', headText: '#ffffff',
        pillBg: '#000000', modelBg: '#000000', hundido: '#222222', changeInk: '#000000',
        paper: '#000000', paperGrid: '#333300', paperInk: '#ffffff', paperLine: '#ffffff', paperChange: '#ffff00',
        paperSolid: '#88aaff', paperLiquid: '#00ff88', paperGas: '#ffaa00', pen: '#ff5533',
        canvasBg: '#000000', panelBg: '#000000', border: '#ffff00',
        text: '#ffffff', textDim: '#cccccc', accent: '#00ffff',
        solid: '#88aaff', liquid: '#00ff88', gas: '#ffaa00', change: '#ffff00',
        heat: '#ff5533', cold: '#33aaff',
        lensBg: '#000000', grid: '#333300', axis: '#ffffff',
        particle: '#ffffff', particleEdge: '#000000', bond: '#00ffff',
    },
};

// Nombre del tema activo según las clases del <body>
function temaActual() {
    const c = document.body.classList;
    if (c.contains('theme-marca')) return 'marca';
    if (c.contains('theme-contrast')) return 'contraste';
    if (c.contains('theme-light')) return 'dia';
    return 'pizarra';
}

// Rellena THEME con los colores comunes del tema activo y los propios de la
// simulación (opcional). Se llama al principio de cada draw().
function actualizarTema(propios) {
    const t = temaActual();
    THEME = Object.assign({}, TEMAS_ESCENA[t], propios && propios[t]);
}

// Botón de ajustes (⚙): abre el panel con los temas y las casillas propias.
// Los botones .theme-opt llevan data-theme = dark | light | marca | contrast.
function iniciarSelectorTema() {
    const themeBtn = document.getElementById('theme-btn');
    const themePanel = document.getElementById('theme-panel');
    const themeOpts = document.querySelectorAll('.theme-opt');
    if (!themeBtn || !themePanel) return;

    const closePanel = () => {
        themePanel.classList.remove('open');
        themePanel.setAttribute('aria-hidden', 'true');
        themeBtn.classList.remove('active');
        themeBtn.setAttribute('aria-expanded', 'false');
    };
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = themePanel.classList.toggle('open');
        themeBtn.classList.toggle('active', isOpen);
        themeBtn.setAttribute('aria-expanded', String(isOpen));
        themePanel.setAttribute('aria-hidden', String(!isOpen));
    });
    document.addEventListener('click', (e) => {
        if (!themeBtn.contains(e.target) && !themePanel.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && themePanel.classList.contains('open')) { closePanel(); themeBtn.focus(); }
    });
    themeOpts.forEach(btn => btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.body.classList.remove('theme-light', 'theme-contrast', 'theme-marca');
        // El tema SimulaCiencia parte del claro y cambia sus colores por los de la marca.
        if (theme === 'marca') document.body.classList.add('theme-light', 'theme-marca');
        else if (theme !== 'dark') document.body.classList.add('theme-' + theme);
        themeOpts.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        closePanel();
    }));
}

// ── 3. Lienzo y mandos ───────────────────────────────────────────
// Escala la escena (#escena) para que quepa entera en la ventana (apaisada)
// o a lo ancho (móvil). Fija la variable CSS --u = 1 unidad del lienzo, con
// la que se miden los mandos HTML colocados encima.
function encajarEscena(cv, ancho, alto, movil) {
    const esc = document.getElementById('escena');
    const main = esc.parentElement;
    const cs = getComputedStyle(main);
    const w = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    let s = w / ancho;
    if (!movil) {
        const top = esc.getBoundingClientRect().top + window.scrollY;
        const h = window.innerHeight - top - 40;
        s = Math.min(s, h / alto);
    }
    s = Math.max(0.2, s);
    esc.style.width = Math.floor(ancho * s) + 'px';
    esc.style.setProperty('--u', s + 'px');
    cv.style.width = '100%';
    cv.style.height = 'auto';
}

// Coloca un elemento HTML sobre el lienzo en { x, y, w } (unidades del lienzo)
function colocarSobreLienzo(el, r, ancho, alto) {
    if (!el) return;
    el.style.left = (100 * r.x / ancho) + '%';
    el.style.top = (100 * r.y / alto) + '%';
    if (r.w != null) el.style.width = (100 * r.w / ancho) + '%';
}

// ── 4. Texto ─────────────────────────────────────────────────────
// Fredoka en los temas del juego (Pizarra y Día); fuente del sistema en los demás
function fuenteJuego() { textFont(THEME.fun ? 'Fredoka' : FUENTE_TEXTO); }

// El número y su unidad no se separan nunca al partir una línea
// (°C y atm se pegan siempre, aunque el número venga de una variable: «{T} °C»)
const UNIDADES_PEGADAS = /(\d) (K|kPa|Pa|mmHg|kg|g|L|mL|cm³|m³|m\/s²|m\/s|km\/h|m|cm|mm|km|s|min|h|N|J|W|V|A|Ω|Hz|nm|%)(?=$|[\s.,;:)])/g;
function pegarUnidades(txt) {
    return String(txt).replace(/ (°C|atm)/g, '\u00a0$1').replace(UNIDADES_PEGADAS, '$1\u00a0$2');
}

// Parte un texto en líneas que caben en «w» (con la fuente y el tamaño actuales)
function partirLineas(txt, w) {
    const palabras = pegarUnidades(txt).split(/[ \t\n]+/);
    const lineas = [];
    let l = '';
    for (const p of palabras) {
        const prueba = l ? l + ' ' + p : p;
        if (l && textWidth(prueba) > w) { lineas.push(l); l = p; } else l = prueba;
    }
    if (l) lineas.push(l);
    return lineas;
}

// Texto con <strong> → trozos { s, b } (b = negrita)
function trozosRicos(html) {
    const out = [];
    String(html).split(/(<strong>|<\/strong>)/).reduce((neg, parte) => {
        if (parte === '<strong>') return true;
        if (parte === '</strong>') return false;
        if (parte) out.push({ s: parte.replace(/<[^>]+>/g, ''), b: neg });
        return neg;
    }, false);
    return out;
}

// Parte los trozos en líneas (palabra a palabra), respetando las negritas
function partirRico(trozos, w) {
    const palabras = [];
    trozos.forEach(t => pegarUnidades(t.s).split(/([ \t\n]+)/).forEach(p => { if (p) palabras.push({ s: p, b: t.b }); }));
    const lineas = []; let l = [], ancho = 0;
    for (const p of palabras) {
        textStyle(p.b ? BOLD : NORMAL);
        const wp = textWidth(p.s);
        if (/^[ \t\n]+$/.test(p.s)) { if (l.length) { l.push(p); ancho += wp; } continue; }
        if (ancho + wp > w && l.length) {
            while (l.length && /^[ \t\n]+$/.test(l[l.length - 1].s)) l.pop();
            lineas.push(l); l = []; ancho = 0;
        }
        l.push(p); ancho += wp;
    }
    if (l.length) lineas.push(l);
    textStyle(NORMAL);
    return lineas;
}

// Escribe las líneas de partirRico() desde (x, y) con interlineado «lead».
// Devuelve la y siguiente. Usa textAlign(LEFT, TOP) y el color actual.
function textoRico(lineas, x, y, lead) {
    textAlign(LEFT, TOP);
    lineas.forEach(l => {
        let xx = x;
        for (const t of l) { textStyle(t.b ? BOLD : NORMAL); text(t.s, xx, y); xx += textWidth(t.s); }
        y += lead;
    });
    textStyle(NORMAL);
    return y;
}

// ── 5. Dibujos comunes ───────────────────────────────────────────
// Escala de un «salto» (pop) que dura ~0,45 s desde t0 (sin movimiento si el
// sistema pide movimiento reducido)
function salto(t0) {
    if (MOV_REDUCIDO) return 1;
    const e = (millis() - t0) / 450;
    if (e >= 1) return 1;
    return 1 + 0.35 * sin(e * PI) * (1 - e);
}

// Tarjeta de la escena: radio 24, borde fino y, en Pizarra/Día, sombra
// sólida 5 px abajo. t = { x, y, w, h }. Nunca una tarjeta dentro de otra.
function tarjeta(t, relleno, radio = 24) {
    if (THEME.fun) { noStroke(); fill(THEME.ink); rect(t.x, t.y + 5, t.w, t.h, radio); }
    stroke(THEME.cardEdge || THEME.border); strokeWeight(1.5); fill(relleno || THEME.cardBg || THEME.panelBg);
    rect(t.x + 1, t.y + 1, t.w - 2, t.h - 2, radio);
}

// Rótulo de tramo o de estado: píldora del color del estado con el texto en
// negrita, que da un pequeño salto cuando cambia (t0 = momento del cambio).
// (x, y) es la esquina superior izquierda. Devuelve { w, h }.
function etiquetaRotulo(txt, col, x, y, fs, t0) {
    const ink = THEME.ink || '#061523';
    textSize(fs); textStyle(BOLD);
    const w = textWidth(txt) + 2 * fs, h = fs * 2;
    push();
    translate(x + w / 2, y + h / 2);
    scale(salto(t0));
    if (THEME.fun) { noStroke(); fill(ink); rect(-w / 2, -h / 2 + 3, w, h, h / 2); stroke(ink); strokeWeight(2.5); }
    else noStroke();
    fill(col); rect(-w / 2, -h / 2, w, h, h / 2);
    noStroke(); fill(lightness(color(col)) > 55 ? ink : '#ffffff');
    textAlign(CENTER, CENTER); text(txt, 0, 1);
    pop();
    textStyle(NORMAL);
    return { w, h };
}

// Insignia de lectura en un eje (valor + unidad), en el color de acento.
// alin = CENTER (centrada en x) o LEFT (empieza en x).
function insignia(txt, x, y, alin, wMin, fs = 14) {
    textFont('Fredoka'); textStyle(BOLD); textSize(fs);
    const w = max(wMin || 0, textWidth(txt) + 20), h = fs + 12;
    const xr = alin === CENTER ? x - w / 2 : x;
    stroke(THEME.ink || '#061523'); strokeWeight(2); fill(THEME.accent || '#00c8ff');
    rect(xr, y - h / 2, w, h, h / 2);
    noStroke(); fill(THEME.ink || '#061523'); textAlign(CENTER, CENTER); text(txt, xr + w / 2, y + 1);
    textStyle(NORMAL);
}

// Chispa de celebración (estrella de 4 puntas con contorno). Va siempre
// fuera de las partículas y de los objetos: nunca representa «calor».
function chispa(x, y, r) {
    stroke(THEME.ink || '#061523'); strokeWeight(1.8); fill(THEME.change || '#ffd84a');
    beginShape();
    for (let i = 0; i < 8; i++) { const a = i * PI / 4, rr = i % 2 ? r * 0.42 : r; vertex(x + cos(a) * rr, y + sin(a) * rr); }
    endShape(CLOSE);
}

// Estrella de 5 puntas (marcas de la gráfica)
function estrella(x, y, r1, r2) {
    beginShape();
    for (let i = 0; i < 10; i++) {
        const a = -HALF_PI + i * PI / 5, r = i % 2 ? r2 : r1;
        vertex(x + cos(a) * r, y + sin(a) * r);
    }
    endShape(CLOSE);
}

// Sello del momento clave: tarjeta crema con borde rojo, girada −5°, con el
// título en mayúsculas (Fredoka) y una frase corta debajo.
function medirSello(titulo, sub, movil) {
    textFont('Fredoka'); textStyle(BOLD); textSize(movil ? 18 : 22);
    const wT = textWidth(titulo);
    textFont(FUENTE_TEXTO); textStyle(BOLD); textSize(movil ? 13 : 15);
    const wS = sub ? textWidth(sub) : 0;
    textStyle(NORMAL);
    return { w: max(movil ? 160 : 224, wT + 40, wS + 36), h: sub ? (movil ? 56 : 64) : (movil ? 40 : 46) };
}
function sello(titulo, sub, x, y, t0, movil) {
    const { w, h } = medirSello(titulo, sub, movil);
    push();
    translate(x, y); rotate(radians(-5)); scale(salto(t0));
    stroke('#a5281b'); strokeWeight(3.5); fill('#fff6d6'); rect(-w / 2, -h / 2, w, h, 10);
    noStroke(); fill('#a5281b'); textFont('Fredoka'); textStyle(BOLD); textSize(movil ? 18 : 22);
    if (sub) {
        textAlign(CENTER, BASELINE); text(titulo, 0, movil ? 0 : 2);
        fill('#5a1a10'); textFont(FUENTE_TEXTO); textSize(movil ? 13 : 15);
        text(sub, 0, movil ? 20 : 24);
    } else {
        textAlign(CENTER, CENTER); text(titulo, 0, 1);
    }
    pop();
    textStyle(NORMAL);
}

// ── 6. Accesibilidad ─────────────────────────────────────────────
// Los lectores de pantalla anuncian el mensaje del panel de estado cuando
// cambia el rótulo (no en cada fotograma). Necesita <div id="anuncio"
// aria-live="polite"> en la página. m = { tag, txt }.
let ultimoAnuncio = '';
function anunciar(m) {
    if (!m || m.tag === ultimoAnuncio) return;
    ultimoAnuncio = m.tag;
    const el = document.getElementById('anuncio');
    if (el) el.textContent = `${m.tag}. ${m.txt}`;
}

// ── 7. Paneles flotantes («?», «Cómo leer»…) ─────────────────────
// Un botón suelto abre y cierra su panel. Se cierra al pulsar fuera, con
// Escape o con su botón [data-cerrar]. Devuelve { abrir, cerrar }.
function iniciarPopover(botonId, panelId) {
    const panel = document.getElementById(panelId), boton = document.getElementById(botonId);
    if (!panel || !boton) return null;
    const marcar = (abierto) => {
        panel.hidden = !abierto;
        boton.setAttribute('aria-expanded', String(abierto));
        boton.classList.toggle('active', abierto);
    };
    boton.addEventListener('click', (e) => { e.stopPropagation(); marcar(panel.hidden); });
    document.addEventListener('click', (e) => {
        if (!panel.hidden && !panel.contains(e.target) && !boton.contains(e.target)) marcar(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panel.hidden) { marcar(false); boton.focus(); }
    });
    panel.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => { marcar(false); boton.focus(); }));
    return { abrir: () => marcar(true), cerrar: () => marcar(false) };
}

// ── 8. Retos y álbum ─────────────────────────────────────────────
// Ocultos por defecto: el botón «★ Retos» los despliega (o ?retos=1).
// Al volver a abrir la simulación aparecen otra vez ocultos. Lo conseguido
// se guarda en este navegador con localStorage (sin cookies y sin enviar
// nada a ningún sitio). «Borrar lo conseguido» lo vacía tras confirmar.
//
// Página: #btn-retos (con .btn-retos-txt), aside#panel-retos, #lista-retos,
// #btn-ver-album, #btn-borrar, #confirmar-borrar, #btn-borrar-si,
// #btn-borrar-no y div#album (modal) con #album-tabla.

// Almacén en localStorage. vacio() devuelve la estructura inicial.
// Uso: const ALMACEN = crearAlmacen('simulaciencia-<sim>-retos', () => ({ retos: {}, sellos: {} }));
function crearAlmacen(clave, vacio) {
    return {
        vacio,
        leer() {
            try {
                const d = JSON.parse(localStorage.getItem(clave));
                if (d && typeof d === 'object') return Object.assign(vacio(), d);
            } catch (e) { /* sin almacenamiento: se juega igual, sin guardar */ }
            return vacio();
        },
        guardar(datos) { try { localStorage.setItem(clave, JSON.stringify(datos)); } catch (e) { /* nada */ } },
        borrar() { try { localStorage.removeItem(clave); } catch (e) { /* nada */ } },
    };
}

// Lo que pinta cada simulación (se fija con iniciarPanelRetos)
let RETOS_CFG = { pintar: () => {}, pintarAlbum: () => {}, alBorrar: () => {} };

function abrirRetos() {
    const p = document.getElementById('panel-retos'), b = document.getElementById('btn-retos');
    if (!p) return;
    RETOS_CFG.pintar();
    p.hidden = false;
    document.body.classList.add('retos-abiertos');
    b.setAttribute('aria-expanded', 'true'); b.classList.add('active');
    b.querySelector('.btn-retos-txt').textContent = i18n.t('Ocultar');
}
function cerrarRetos() {
    const p = document.getElementById('panel-retos'), b = document.getElementById('btn-retos');
    if (!p) return;
    p.hidden = true;
    const conf = document.getElementById('confirmar-borrar');
    if (conf) conf.hidden = true;
    document.body.classList.remove('retos-abiertos');
    b.setAttribute('aria-expanded', 'false'); b.classList.remove('active');
    b.querySelector('.btn-retos-txt').textContent = i18n.t('Retos');
}
function abrirAlbum() {
    const a = document.getElementById('album');
    if (!a) return;
    RETOS_CFG.pintarAlbum();
    a.hidden = false;
    a.querySelector('.boton-cerrar').focus();
}
function cerrarAlbum() {
    const a = document.getElementById('album');
    if (!a) return;
    a.hidden = true;
    const b = document.getElementById('btn-ver-album');
    if (b) b.focus();
}

// cfg = { pintar(), pintarAlbum(), alBorrar() }: alBorrar vacía los datos
// de la simulación (el almacén ya se ha borrado) y vuelve a pintar.
function iniciarPanelRetos(cfg, almacen) {
    RETOS_CFG = Object.assign(RETOS_CFG, cfg);
    const b = document.getElementById('btn-retos');
    if (!b) return;
    b.addEventListener('click', () => { if (document.getElementById('panel-retos').hidden) abrirRetos(); else cerrarRetos(); });
    const verAlbum = document.getElementById('btn-ver-album');
    if (verAlbum) verAlbum.addEventListener('click', abrirAlbum);
    const album = document.getElementById('album');
    if (album) album.addEventListener('click', (e) => { if (e.target.id === 'album') cerrarAlbum(); });
    document.querySelectorAll('#panel-retos [data-cerrar], #album [data-cerrar]').forEach(x => x.addEventListener('click', () => {
        if (x.closest('#album')) cerrarAlbum(); else { cerrarRetos(); b.focus(); }
    }));
    const conf = document.getElementById('confirmar-borrar');
    const borrar = document.getElementById('btn-borrar');
    if (conf && borrar) {
        borrar.addEventListener('click', () => { conf.hidden = false; document.getElementById('btn-borrar-no').focus(); });
        document.getElementById('btn-borrar-no').addEventListener('click', () => { conf.hidden = true; borrar.focus(); });
        document.getElementById('btn-borrar-si').addEventListener('click', () => {
            if (almacen) almacen.borrar();
            conf.hidden = true;
            RETOS_CFG.alBorrar();
            borrar.focus();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (album && !album.hidden) cerrarAlbum();
        else if (!document.getElementById('panel-retos').hidden) { cerrarRetos(); b.focus(); }
    });
}
