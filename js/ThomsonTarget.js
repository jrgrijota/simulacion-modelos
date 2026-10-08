// Límite de desviación del modelo de Thomson (rad). Medido en todo el rango de Z y
// velocidad: como mucho 4,3° (Z=118, v=4), así que «siempre < 5°» es cierto.
const THOMSON_MAX_RAD = 0.16;
// Radio del núcleo «duro» de la lámina de Rutherford, como fracción del radio atómico.
const RUTHERFORD_CUTOFF_FRAC = 0.075;

class ThomsonTarget {
  constructor(x, y, radius, numElectrons, isSimplified = false, currentModel = "thomson", visualScale = 1.0) {
    this.pos = { x: x, y: y }; // Objeto literal de bajo coste computacional
    this.R = radius;
    // Escala visual independiente de la física: permite reducir el tamaño aparente
    // del átomo en la lámina sin alterar R (que gobierna el potencial y el apantallamiento).
    this.visualScale = visualScale;
    this.isSimplified = isSimplified;
    this.model = currentModel;
    
    // Constante de Coulomb calibrada por modelo:
    // - Rutherford (ke=40000): retrodispersa a b pequeño, decae con Z correcto.
    // - Thomson (ke=8000): deflexiones visibles pero <~3.5° por átomo incluso
    //   en lámina (R=14), cumpliendo el límite pedagógico de ≤5°.
    this.ke = (currentModel === "rutherford") ? 40000.0 : 8000.0;
    this.Z = numElectrons;
    
    this.electrons = [];
    this.nucleons = [];
    this.orbitAngle = 0;
    this._orbitRadii = null;
    this._force = { x: 0, y: 0 };
    
    this.generateAtom();
  }

  generateAtom() {
    this.electrons = [];
    this.nucleons = [];
    this._orbitRadii = null;

    if (this.model === "thomson") {
      let n = this.Z;

      let remaining = n;
      let ringCapacities = [1, 5, 10, 15, 22, 30, 40];
      let ringIndex = 0;
      let targetRings = [];
      
      while (remaining > 0 && ringIndex < ringCapacities.length) {
        let cap = ringCapacities[ringIndex];
        if (remaining <= cap) { targetRings.push(remaining); remaining = 0; }
        else { targetRings.push(cap); remaining -= cap; ringIndex++; }
      }

      let numRings = targetRings.length;
      for (let r = 0; r < numRings; r++) {
        let electronsInRing = targetRings[r];
        let ringRadius = this.R * 0.85; 
        if (numRings > 1) ringRadius = this.R * (0.15 + (0.70 * (r / (numRings - 1))));
        
        for (let i = 0; i < electronsInRing; i++) {
          let initialAngle = (TWO_PI / electronsInRing) * i + (r * 0.25);
          this.electrons.push({
            pos: { x: this.pos.x + ringRadius * Math.cos(initialAngle), y: this.pos.y + ringRadius * Math.sin(initialAngle) },
            vel: { x: 0, y: 0 },
            mass: 1,
            physicsRadius: 0.005,
            rLayer: ringRadius,
            angle: initialAngle,
            isEjected: false
          });
        }
      }

    } else {
      let n = this.Z;
      let coreRadiusBase = 1.6 * Math.sqrt(n * 2);
      this.coreRadius = constrain(coreRadiusBase, 3, 15);

      if (!this.isSimplified) {
        for (let i = 0; i < n; i++) {
          let r = this.coreRadius * Math.sqrt(random(0, 1));
          let angle = random(0, TWO_PI);
          this.nucleons.push({ pos: { x: this.pos.x + r * Math.cos(angle), y: this.pos.y + r * Math.sin(angle) }, type: "proton" });
        }
        for (let i = 0; i < n; i++) {
          let r = this.coreRadius * Math.sqrt(random(0, 1));
          let angle = random(0, TWO_PI);
          this.nucleons.push({ pos: { x: this.pos.x + r * Math.cos(angle), y: this.pos.y + r * Math.sin(angle) }, type: "neutron" });
        }
      }

      // Rutherford no repartió los electrones en capas (eso llegó con Bohr en
      // 1913): giran alrededor del núcleo a distancias variadas, sin órbitas fijas.
      for (let i = 0; i < n; i++) {
        let rE = this.R * Math.sqrt(random(0.09, 0.9));
        let initialAngle = random(TWO_PI);
        this.electrons.push({
          pos: { x: this.pos.x + rE * Math.cos(initialAngle), y: this.pos.y + rE * Math.sin(initialAngle) },
          vel: { x: 0, y: 0 },
          mass: 1,
          physicsRadius: 0.005,
          rLayer: rE,
          angle: initialAngle,
          isEjected: false
        });
      }
    }
  }

  // Devuelve los radios únicos de órbita. Resultado cacheado: O(n) solo la primera vez.
  getOrbitRadii() {
    if (this._orbitRadii) return this._orbitRadii;
    let radii = [];
    for (let e of this.electrons) {
      let found = false;
      for (let r of radii) { if (Math.abs(r - e.rLayer) < 0.5) { found = true; break; } }
      if (!found) radii.push(e.rLayer);
    }
    this._orbitRadii = radii.sort((a, b) => a - b);
    return this._orbitRadii;
  }

  updateElectrons() {
    this.orbitAngle += 0.015;
    for (let e of this.electrons) {
      if (!e.isEjected) {
        let currentAngle = e.angle + (this.orbitAngle * (20.0 / e.rLayer));
        e.pos.x = this.pos.x + e.rLayer * Math.cos(currentAngle);
        e.pos.y = this.pos.y + e.rLayer * Math.sin(currentAngle);
      } else {
        e.pos.x += e.vel.x;
        e.pos.y += e.vel.y;
      }
    }
  }

  // OPTIMIZACIÓN DE COLISIONES: Sin instanciación de vectores, evaluación primaria mediante cuadrados
  checkElectronCollisions(alpha) {
    let _adx = alpha.pos.x - this.pos.x, _ady = alpha.pos.y - this.pos.y;
    if (_adx * _adx + _ady * _ady > this.R * this.R * 4) return;
    for (let e of this.electrons) {
      if (e.isEjected) continue;

      let dx = alpha.pos.x - e.pos.x;
      let dy = alpha.pos.y - e.pos.y;
      let dSq = dx * dx + dy * dy;

      let threshold = alpha.physicsRadius + e.physicsRadius;
      let thresholdSq = threshold * threshold;
      
      if (dSq < thresholdSq && dSq > 0) {
        let d = Math.sqrt(dSq);
        let nx = -dx / d; 
        let ny = -dy / d;
        
        let kx = alpha.vel.x - e.vel.x;
        let ky = alpha.vel.y - e.vel.y;
        let p = 2 * (nx * kx + ny * ky) / (alpha.mass + e.mass);
        
        alpha.vel.x -= p * e.mass * nx;
        alpha.vel.y -= p * e.mass * ny;
        e.vel.x += p * alpha.mass * nx;
        e.vel.y += p * alpha.mass * ny;
        
        e.isEjected = true; 
        e.pos.x += nx * 0.5;
        e.pos.y += ny * 0.5;
      }
    }
  }

  // OPTIMIZACIÓN MATEMÁTICA: Cálculos escalares puros devolviendo Duck-Typing de interfaz vector {x, y}
  calculateNetForce(alpha) {
    let fx = 0, fy = 0;
    let dx = alpha.pos.x - this.pos.x;
    let dy = alpha.pos.y - this.pos.y;
    let rSq = dx * dx + dy * dy;
    let r = Math.sqrt(rSq);

    // Longitud de apantallamiento: propiedad física del átomo, independiente del modo de visualización.
    // Equivale al radio de Debye en escala de simulación.
    let screeningLength = this.R * 1.2;

    if (r > screeningLength) { this._force.x = 0; this._force.y = 0; return this._force; }

    let nx = r > 0 ? dx / r : 0;
    let ny = r > 0 ? dy / r : 0;

    if (this.model === "thomson") {
      let fMag = 0;
      if (r < this.R) {
        // Ley de Gauss: carga encerrada ∝ r³/R³ → fuerza repulsiva ∝ r (lineal dentro de la esfera)
        let qEncl = this.Z * (r * r * r) / (this.R * this.R * this.R);
        fMag = (this.ke * 2.0 * qEncl) / (rSq + 1.0);
      } else {
        fMag = (this.ke * 2.0 * this.Z) / (rSq + 1.0);
      }
      fx += nx * fMag;
      fy += ny * fMag;

      for (let e of this.electrons) {
        if (!e.isEjected) {
          let edx = alpha.pos.x - e.pos.x;
          let edy = alpha.pos.y - e.pos.y;
          let edSq = edx * edx + edy * edy;
          let edist = Math.sqrt(edSq);
          if (edist > screeningLength) continue;

          let fE = (this.ke * 2.0 * -1.0) / (edSq + 1.0);
          let enx = edist > 0 ? edx / edist : 0;
          let eny = edist > 0 ? edy / edist : 0;
          fx += enx * fE;
          fy += eny * fE;
        }
      }

      // Cap de la fuerza total resultante para Thomson.
      // Escala con R²: no afecta al átomo grande de display (R=190, fCap≈ke=8000)
      // pero limita con fuerza los átomos pequeños de lámina (R=14, fCap≈43).
      let fCap = this.ke * (this.R * this.R) / (190.0 * 190.0);
      // Segundo límite, según la velocidad: la desviación es θ ≈ F·t/(m·v), con un
      // tiempo de paso t ≈ 2,4R/v, así que F ≤ θmáx·m·v²/(2,4R) asegura θ < 5°
      // también con α lentas y Z alto (sin él, vista Átomo con v=4 y Z=118: 45°).
      let v2 = alpha.vel.x * alpha.vel.x + alpha.vel.y * alpha.vel.y;
      fCap = Math.min(fCap, THOMSON_MAX_RAD * alpha.mass * v2 / (2.4 * this.R));
      let totalF = Math.sqrt(fx * fx + fy * fy);
      if (totalF > fCap) {
        let scale = fCap / totalF;
        fx *= scale;
        fy *= scale;
      }
    } else {
      if (this.isSimplified) {
        // Lámina Rutherford: corte duro en el radio nuclear.
        // El núcleo ocupa una fracción pequeña del átomo (coreRadius << R),
        // por lo que la mayoría de partículas no lo alcanzan y pasan rectas.
        // Medido con 2000 α en oro (Z=79) a velocidad 10: ~88 % pasan casi rectas,
        // ~7 % se desvían y ~4 % rebotan (más con Z alto o α lentas, menos con Z bajo
        // o α rápidas). En el experimento real rebota 1 de cada 8000: aquí se exagera
        // para que los rebotes se vean en unos minutos de clase.
        let nuclearCutoff = Math.min(this.coreRadius * 0.30, this.R * RUTHERFORD_CUTOFF_FRAC);
        if (r >= nuclearCutoff) return { x: 0, y: 0 };
        let fMag = (this.ke * 2.0 * this.Z) / (rSq + 2.0);
        fx = nx * fMag;
        fy = ny * fMag;
      } else {
        // Átomo aislado: potencial de Yukawa (Coulomb + apantallamiento Thomas-Fermi).
        // Softening=2 (Plummer): fuerza finita y continua en r→0.
        let softening = 2.0;
        let factorAtenuacion = Math.exp(-r / screeningLength);
        let fMag = ((this.ke * 2.0 * this.Z) / (rSq + softening)) * factorAtenuacion;
        fx += nx * fMag;
        fy += ny * fMag;
      }
    }
    
    this._force.x = fx; this._force.y = fy;
    return this._force;
  }

  // Signos «+» repartidos de forma uniforme (patrón de girasol) por la esfera.
  drawPlusSigns(theme) {
    const n = 34, golden = Math.PI * (3 - Math.sqrt(5)), arm = Math.max(3, this.R * 0.035);
    stroke(theme === "light" ? color(170, 95, 0, 200) : color(255, 205, 90, 150));
    strokeWeight(1.4);
    for (let i = 0; i < n; i++) {
      let r = this.R * 0.9 * Math.sqrt((i + 0.5) / n);
      let a = i * golden;
      let x = this.pos.x + r * Math.cos(a), y = this.pos.y + r * Math.sin(a);
      line(x - arm, y, x + arm, y);
      line(x, y - arm, x, y + arm);
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    scale(this.visualScale);
    translate(-this.pos.x, -this.pos.y);

    let theme        = uiCache.theme;
    let protonColor  = uiCache.protonColor;
    let neutronColor = uiCache.neutronColor;
    let visualERadius = uiCache.electronRadius;
    // En modo claro los electrones se oscurecen para garantizar contraste sobre fondos claros
    let electronColor = (theme === "light")
      ? color(red(uiCache.electronColor) * 0.45, green(uiCache.electronColor) * 0.45, blue(uiCache.electronColor) * 0.65)
      : uiCache.electronColor;

    if (this.model === "thomson") {
      if (!this.isSimplified) {
        // La carga positiva repartida por toda la esfera es la idea central del
        // modelo: se pinta bien visible y sembrada de signos «+».
        fill(255, 190, 0, theme === "light" ? 70 : 42);
        stroke(255, 190, 0, theme === "light" ? 170 : 120);
        strokeWeight(1.5);
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
        this.drawPlusSigns(theme);
        // Órbitas de los anillos de electrones
        drawingContext.save();
        drawingContext.setLineDash([5, 7]);
        stroke(theme === "light" ? color(180, 140, 20, 90) : color(255, 200, 50, 55));
        strokeWeight(0.7);
        noFill();
        for (let r of this.getOrbitRadii()) ellipse(this.pos.x, this.pos.y, r * 2, r * 2);
        drawingContext.restore();
      } else {
        if (theme === "light") {
          fill(255, 190, 0, 100);
          stroke(180, 100, 0, 200);
        } else {
          fill(255, 190, 0, 28);   
          stroke(255, 215, 0, 150); 
        }
        strokeWeight(1.2); 
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
      }
    } else {
      if (!this.isSimplified) {
        noStroke();
        for (let nuc of this.nucleons) {
          fill(nuc.type === "proton" ? protonColor : neutronColor);
          ellipse(nuc.pos.x, nuc.pos.y, 3, 3);
        }
      } else {
        if (theme === "light") {
          fill(15, 23, 42, 80);
          stroke(15, 23, 42, 200);
        } else {
          fill(255, 255, 255, 4); 
          stroke(255, 255, 255, 65); 
        }
        strokeWeight(1.0); 
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
        
        fill(protonColor);
        noStroke();
        ellipse(this.pos.x, this.pos.y, 3.5, 3.5);
      }
    }

    if (!this.isSimplified) {
      noStroke();
      for (let e of this.electrons) {
        fill(electronColor);
        ellipse(e.pos.x, e.pos.y, visualERadius * 2, visualERadius * 2);
      }
    }

    pop();
  }
}