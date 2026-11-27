// ═══════════════════════════════════════════════════════════════════
//  EL EXPERIMENTO (física sin cambios)
//  Es el mismo bucle de la versión anterior (sketch.js), con las clases
//  ThomsonTarget y AlphaParticle intactas. Corre en un «mundo» fijo de
//  870 por 686 unidades (el lienzo de la versión anterior), así que los
//  resultados no dependen del tamaño de la pantalla. La escena solo lo dibuja:
//  el aparato con sus destellos y el círculo del modelo con las trayectorias.
// ═══════════════════════════════════════════════════════════════════
const MUNDO_W = 870, MUNDO_H = 686;
const EMITTER_H_FRAC = 0.80;                          // como en la versión anterior

class Experimento {
    constructor() {
        this.cx = MUNDO_W / 2; this.cy = MUNDO_H / 2;
        const bodyW = Math.round(MUNDO_H * EMITTER_H_FRAC * 0.10);
        this.detR = Math.min(MUNDO_H / 2 - 6, MUNDO_W / 2 - bodyW - 10);   // radio del detector
        this.openHH = MUNDO_H * EMITTER_H_FRAC / 2;                         // media altura del haz
        this.modelo = 'rutherford'; this.vista = 'atom'; this.z = 79;
        this.alphas = [];
        this.alLlegar = () => {};
        this.construir();
    }
    // Radio con que se dibuja (y calcula) el átomo aislado: crece con Z^(1/3)
    radioAtomo(z) { return Math.round(constrain(50 + 145 * Math.pow(z / 118, 1 / 3), 60, 195)); }
    construir() {
        this.alphas = [];
        const z = this.z;
        this.atomo = new ThomsonTarget(this.cx, this.cy, this.radioAtomo(z), z, false, this.modelo);
        this.lamina = [];
        const atomRadius = 14, ESCALA = 0.6;
        const step = Math.round(atomRadius * 2 * ESCALA);   // 16
        const cols = 3, startX = this.cx - (cols - 1) * step / 2;
        const filas = Math.max(1, Math.floor(this.openHH * 2 / step));
        const startY = this.cy - (filas - 1) * step / 2;
        for (let c = 0; c < cols; c++) for (let f = 0; f < filas; f++)
            this.lamina.push(new ThomsonTarget(startX + c * step, startY + f * step, atomRadius, z, true, this.modelo, ESCALA));
        this.paso_lamina = step;
    }
    // Una α a la altura «b» (unidades del mundo, desde el centro), con rapidez v0
    lanzar(b, v0, extra) {
        const a = new AlphaParticle(this.cx - this.detR, this.cy + b, v0, 0);
        a.b = b; a.v0 = v0; a.fase = 0; a.dCambio = 0;
        Object.assign(a, extra || {});
        this.alphas.push(a);
        return a;
    }
    lanzarLluvia(v0, ritmo) {
        if (random(0, 1) < ritmo / 60.0) this.lanzar(random(-this.openHH, this.openHH), v0, { lluvia: true });
    }
    paso() {
        for (let i = this.alphas.length - 1; i >= 0; i--) {
            const a = this.alphas[i];
            let target = null;
            if (this.vista === 'atom') target = this.atomo;
            else {
                let minDistSq = Infinity, cand = null, varios = false;
                for (const t of this.lamina) {
                    const dx = a.pos.x - t.pos.x, dy = a.pos.y - t.pos.y, dSq = dx * dx + dy * dy;
                    if (dSq < minDistSq) { minDistSq = dSq; cand = t; varios = false; }
                    else if (abs(dSq - minDistSq) < 0.0001) varios = true;
                }
                if (!varios && cand) { const rc = cand.R * 2.0; if (minDistSq <= rc * rc) target = cand; }
            }
            a.integrate(1.0, target);
            const adx = a.pos.x - this.cx, ady = a.pos.y - this.cy, d = Math.sqrt(adx * adx + ady * ady);
            // Fase del dibujo en el aparato: 0 = va hacia la lámina; 1 = ya ha salido de ella
            if (a.fase === 0 && (adx >= 0 || a.deviationAngle >= 3)) { a.fase = 1; a.dCambio = d; }
            if (!a.hasEnteredDetector && d < this.detR * 0.85) a.hasEnteredDetector = true;
            if (!a.isDead && a.hasEnteredDetector && d >= this.detR) {
                a.isDead = true;
                if (!a.hasBeenCounted) { a.hasBeenCounted = true; this.alLlegar(a); }
                this.alphas.splice(i, 1);
                continue;
            }
            if (d > this.detR * 1.5) this.alphas.splice(i, 1);
        }
    }
}
// Ángulo con signo de la α (hacia arriba, positivo), en grados: el que marca el destello
function anguloSalida(a) { return -Math.atan2(a.vel.y, a.vel.x) * 180 / Math.PI; }
