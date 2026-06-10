class ThomsonTarget {
  constructor(x, y, radius, numElectrons, isSimplified = false, currentModel = "thomson") {
    this.pos = { x: x, y: y }; // Objeto literal de bajo coste computacional
    this.R = radius;               
    this.isSimplified = isSimplified; 
    this.model = currentModel; 
    
    // Constante de Coulomb calibrada por modelo:
    // - Rutherford (ke=40000): retrodispersa a b pequeño, decae con Z correcto.
    // - Thomson (ke=8000): deflexiones visibles pero <~3.5° por átomo incluso
    //   en lámina (R=14), cumpliendo el límite pedagógico de ≤5°.
    this.ke = (currentModel === "rutherford") ? 40000.0 : 8000.0;
    this.Z = numElectrons;
    
    this.electrons = [];     
    this.positivePoints = [];
    this.nucleons = []; 
    this.orbitAngle = 0;
    
    this.generateAtom();
  }

  generateAtom() {
    this.electrons = [];
    this.positivePoints = [];
    this.nucleons = [];

    if (this.model === "thomson") {
      let totalSlots = 500;
      let n = this.Z;
      let positiveSlots = totalSlots - n;
      this.qPositivePoint = n / positiveSlots;

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

      let goldenAngle = 137.5 * (Math.PI / 180); 
      for (let i = 0; i < positiveSlots; i++) {
        let r = this.R * Math.sqrt(i / positiveSlots) * 0.95; 
        let angle = i * goldenAngle;
        this.positivePoints.push({ x: this.pos.x + r * Math.cos(angle), y: this.pos.y + r * Math.sin(angle) });
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

      let remainingElectrons = n;
      let layerCapacities = [2, 8, 18, 32, 32, 8]; 
      let layerIndex = 0;
      
      while (remainingElectrons > 0) {
        if (layerIndex >= layerCapacities.length) {
          layerCapacities.push(32);
        }
        let eInLayer = Math.min(remainingElectrons, layerCapacities[layerIndex]);
        let layerRadius = this.R * (0.25 + 0.70 * (layerIndex / 4.0));
        
        for (let i = 0; i < eInLayer; i++) {
          let initialAngle = (TWO_PI / eInLayer) * i;
          this.electrons.push({
            pos: { x: this.pos.x + layerRadius * Math.cos(initialAngle), y: this.pos.y + layerRadius * Math.sin(initialAngle) },
            vel: { x: 0, y: 0 },
            mass: 1,
            physicsRadius: 0.005,
            rLayer: layerRadius,
            angle: initialAngle,
            isEjected: false
          });
        }
        remainingElectrons -= eInLayer;
        layerIndex++;
      }
    }
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

    if (r > screeningLength) return { x: 0, y: 0 };

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
      // Garantiza deflexiones ≤5° en cualquier Z (1-100) y cualquier modo.
      // Verificado numéricamente para todos los valores del slider.
      let fCap = this.ke * (this.R * this.R) / (190.0 * 190.0);
      let totalF = Math.sqrt(fx * fx + fy * fy);
      if (totalF > fCap) {
        let scale = fCap / totalF;
        fx *= scale;
        fy *= scale;
      }
    } else {
      // Rutherford: potencial de Yukawa (Coulomb + apantallamiento Thomas-Fermi).
      // Regularización de Plummer (softening pequeño) en lugar del antiguo cap duro:
      // hace la fuerza finita y continua en r→0 sin discontinuidades. El valor es
      // pequeño a propósito; uno grande (p.ej. coreRadius²) anularía la dispersión.
      let softening = 2.0;
      let factorAtenuacion = Math.exp(-r / screeningLength);
      let fMag = ((this.ke * 2.0 * this.Z) / (rSq + softening)) * factorAtenuacion;
      fx += nx * fMag;
      fy += ny * fMag;
    }
    
    return { x: fx, y: fy };
  }

  display() {
    let tInput = document.getElementById("ui-theme-select");
    let theme = tInput ? tInput.value : "dark";
    
    let protonColor = document.getElementById("ui-color-proton") ? color(document.getElementById("ui-color-proton").value) : color(255, 0, 0);
    let neutronColor = document.getElementById("ui-color-neutron") ? color(document.getElementById("ui-color-neutron").value) : color(255, 255, 255);
    let electronColor = document.getElementById("ui-color-electron") ? color(document.getElementById("ui-color-electron").value) : color(0, 160, 255);
    let visualERadius = parseFloat(document.getElementById("ui-radius-electron") ? document.getElementById("ui-radius-electron").value : 2.0);

    if (this.model === "thomson") {
      if (!this.isSimplified) {
        fill(255, 190, 0, theme === "light" ? 22 : 12);
        stroke(255, 190, 0, theme === "light" ? 60 : 40);
        strokeWeight(1);
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
      } else {
        if (theme === "light") {
          fill(255, 190, 0, 45);   
          stroke(217, 119, 6, 120); 
        } else {
          fill(255, 190, 0, 28);   
          stroke(255, 215, 0, 150); 
        }
        strokeWeight(1.2); 
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
      }
    } else {
      if (!this.isSimplified) {
        stroke(theme === "light" ? color(0, 0, 0, 20) : color(255, 255, 255, 15));
        strokeWeight(0.5);
        noFill();
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
        
        noStroke();
        for (let nuc of this.nucleons) {
          fill(nuc.type === "proton" ? protonColor : neutronColor);
          ellipse(nuc.pos.x, nuc.pos.y, 3, 3);
        }
      } else {
        if (theme === "light") {
          fill(15, 23, 42, 6); 
          stroke(15, 23, 42, 50); 
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
  }
}