// ═══════════════════════════════════════════════════════════════════
//  ARRANQUE COMÚN DEL LIENZO (v1.1, 25 de noviembre de 2026)
//  Ajuste del lienzo p5 a la ventana, densidad de píxeles adaptable y
//  vigilancia del rendimiento. Se copia tal cual; no se edita en una escena.
//
//  La escena define ANTES (en js/escena.js, que se carga después):
//    let CV_W = 1330, CV_H = 680, ESC_MOVIL = null;
//    function calcularEscena()  // fija CV_W, CV_H y la retícula; llama a colocarMandos(); devuelve true si cambia escritorio/móvil
//  y en setup() llama a: fitCanvas(); window.addEventListener('resize', ...) no hace falta (usa windowResized).
//  En draw() llama a vigilarRendimiento().
// ═══════════════════════════════════════════════════════════════════

const $ = (id) => document.getElementById(id);
let topeDensidad = 2;
let fpsMarca = { t: 0, f: 0 };

function ajustarEscena(cv) { encajarEscena(cv, CV_W, CV_H, ESC_MOVIL); }
function densidadAdecuada(cv) {
    const visto = cv.getBoundingClientRect().width / CV_W * displayDensity();
    return constrain(Math.ceil(visto * 4) / 4, 1, topeDensidad);
}
function fitCanvas() {
    const cv = document.querySelector('#canvas-container canvas');
    if (!cv) return;
    ajustarEscena(cv);
    const d = densidadAdecuada(cv);
    if (Math.abs(d - pixelDensity()) > 0.01) { pixelDensity(d); ajustarEscena(cv); }
}
// Si la escena va a menos de 40 fps, baja la densidad de píxeles en pasos de 0,25
function vigilarRendimiento() {
    const ahora = performance.now();
    if (!fpsMarca.t) { fpsMarca = { t: ahora, f: frameCount }; return; }
    if (ahora - fpsMarca.t < 3000) return;
    if (ahora - fpsMarca.t > 4500) { fpsMarca = { t: ahora, f: frameCount }; return; }
    const fps = (frameCount - fpsMarca.f) * 1000 / (ahora - fpsMarca.t);
    fpsMarca = { t: ahora, f: frameCount };
    if (document.hidden || fps >= 40 || pixelDensity() <= 1) return;
    topeDensidad = Math.max(1, pixelDensity() - 0.25);
    fitCanvas();
}
function rehacerComposicion() {
    calcularEscena();
    resizeCanvas(CV_W, CV_H);
    fitCanvas();
}
function windowResized() {
    if (calcularEscena()) resizeCanvas(CV_W, CV_H);
    fitCanvas();
}
// Relleno de la pista de un deslizador (variable CSS --fill)
function pintarRelleno(sl) {
    const p = (sl.value - sl.min) / (sl.max - sl.min) * 100;
    sl.style.setProperty('--fill', p.toFixed(1) + '%');
}
