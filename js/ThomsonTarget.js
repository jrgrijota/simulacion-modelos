class ThomsonTarget {
  constructor(x, y, radius, numElectrons, isSimplified = false, currentModel = "thomson") {
    this.pos = createVector(x, y); 
    this.R = radius;               
    this.isSimplified = isSimplified; 
    this.model = currentModel; 
    
    this.ke = 45.0;          
    this.qAlpha = 2.0;       
    this.Z = numElectrons;   
    
    this.electrons = [];     
    this.positivePoints = [];
    this.nucleons = []; 
    
    if (!this.isSimplified) {
      this.generateAtom();
    }
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
      this.qElectronPoint = -1.0;

      let remaining = n;
      let ringCapacities = [1, 5, 10, 15, 22, 30, 40];
      let ringIndex = 0;
      let targetRings = [];
      
      while (remaining > 0) {
        let cap = ringCapacities[ringIndex];
        if (remaining <= cap) { targetRings.push(remaining); remaining = 0; }
        else { targetRings.push(cap); remaining -= cap; ringIndex++; }
      }

      let numRings = targetRings.length;
      for (let r = 0; r < numRings; r++) {
        let electronsInRing = targetRings[r];
        let ringRadius = this.R * 0.85; 
        if (numRings > 1) ringRadius = this.R * (0.15 + (0.70 * (r / (numRings - 1))));
        if (electronsInRing === 1 && r === 0) {
          this.electrons.push(createVector(this.pos.x, this.pos.y));
          continue;
        }
        for (let i = 0; i < electronsInRing; i++) {
          let angle = (TWO_PI / electronsInRing) * i + (r * 0.25);
          this.electrons.push(createVector(this.pos.x + ringRadius * cos(angle), this.pos.y + ringRadius * sin(angle)));
        }
      }

      let goldenAngle = 137.5 * (PI / 180); 
      for (let i = 0; i < positiveSlots; i++) {
        let r = this.R * sqrt(i / positiveSlots) * 0.95; 
        let angle = i * goldenAngle;
        this.positivePoints.push(createVector(this.pos.x + r * cos(angle), this.pos.y + r * sin(angle)));
      }

    } else {
      let n = this.Z;
      let coreRadiusBase = 1.6 * sqrt(n * 2);
      let coreRadius = constrain(coreRadiusBase, 3, 15);

      for (let i = 0; i < n; i++) {
        let r = coreRadius * sqrt(random(0, 1));
        let angle = random(0, TWO_PI);
        this.nucleons.push({
          pos: createVector(this.pos.x + r * cos(angle), this.pos.y + r * sin(angle)),
          type: "proton"
        });
      }
      for (let i = 0; i < n; i++) {
        let r = coreRadius * sqrt(random(0, 1));
        let angle = random(0, TWO_PI);
        this.nucleons.push({
          pos: createVector(this.pos.x + r * cos(angle), this.pos.y + r * sin(angle)),
          type: "neutron"
        });
      }

      let remainingElectrons = n;
      let layerCapacities = [2, 8, 18, 32, 32, 8]; 
      let layerIndex = 0;
      
      while (remainingElectrons > 0) {
        let eInLayer = Math.min(remainingElectrons, layerCapacities[layerIndex]);
        let layerRadius = this.R * (0.25 + 0.70 * (layerIndex / 4.0));
        
        for (let i = 0; i < eInLayer; i++) {
          let angle = (TWO_PI / eInLayer) * i + (layerIndex * 0.5);
          this.electrons.push(createVector(this.pos.x + layerRadius * cos(angle), this.pos.y + layerRadius * sin(angle)));
        }
        remainingElectrons -= eInLayer;
        layerIndex++;
      }
    }
  }

  calculateNetForce(alpha) {
    let fNet = createVector(0, 0);
    if (alpha.isDead) return fNet;

    let toCenter = p5.Vector.sub(alpha.pos, this.pos);
    let distToCenter = toCenter.mag();

    // 1. COMPORTAMIENTO EN MODO LÁMINA MACROSCÓPICA (ORTOGONAL CÚBICA)
    if (this.isSimplified) {
      let rVec = p5.Vector.sub(alpha.pos, this.pos);
      
      if (this.model === "thomson") {
        // Si está fuera de las fronteras físicas del átomo, no hay fuerza confinante (Gauss)
        if (distToCenter > this.R) return fNet; 
        
        // Masa positiva diluida estable: permite avance lineal limpio sin oscilaciones
        let fuerzaEfectiva = 0.8; 
        let mag = (fuerzaEfectiva * rVec.mag()) / (this.R * this.R); 
        return rVec.normalize().mult(mag);
      } else {
        // Rutherford lámina: Campo de Coulomb extendido para compensar la escala del píxel central
        if (distToCenter > this.R * 2.5) return fNet; 
        
        let rDistSq = rVec.magSq();
        let softeningFoilSq = pow(1.5, 2); 
        let magRutherford = (this.ke * this.qAlpha * this.Z) / (rDistSq + softeningFoilSq);
        
        return rVec.normalize().mult(magRutherford);
      }
    }

    // 2. COMPORTAMIENTO EN VISTA ATÓMICA AISLADA (Física intacta)
    if (this.model === "thomson") {
      if (distToCenter > this.R) return fNet;

      let softeningSq = pow(14.0, 2); 
      for (let pPos of this.positivePoints) {
        let rVec = p5.Vector.sub(alpha.pos, pPos);
        let rDistSq = rVec.magSq(); 
        let magP = (this.ke * this.qAlpha * this.qPositivePoint) / (rDistSq + softeningSq);
        fNet.add(rVec.normalize().mult(magP));
      }
      for (let ePos of this.electrons) {
        let rVec = p5.Vector.sub(alpha.pos, ePos);
        let rDistSq = rVec.magSq();
        let magE = (this.ke * this.qAlpha * this.qElectronPoint) / (rDistSq + softeningSq);
        fNet.add(rVec.normalize().mult(magE));
      }
    } else {
      let rVec = p5.Vector.sub(alpha.pos, this.pos);
      let rDistSq = rVec.magSq();
      
      let minimalCoreRadius = constrain(0.4 * sqrt(this.Z * 2), 2.5, 10);
      if (distToCenter < minimalCoreRadius) {
        alpha.vel.x *= -1; 
        alpha.vel.y *= random([1, -1]) * random(0.2, 0.8); 
        alpha.pos.add(alpha.vel); 
        return fNet;
      }

      let softeningRutherford = pow(2.5, 2); 
      let magNucleus = (this.ke * this.qAlpha * this.Z) / (rDistSq + softeningRutherford);
      fNet.add(rVec.normalize().mult(magNucleus));

      for (let ePos of this.electrons) {
        let eVec = p5.Vector.sub(alpha.pos, ePos);
        let eDistSq = eVec.magSq();
        let magE = (this.ke * this.qAlpha * -1.0) / (eDistSq + pow(8.0, 2));
        fNet.add(eVec.normalize().mult(magE));
      }
    }

    return fNet;
  }

  display() {
    let pInput = document.getElementById("ui-color-proton");
    let nInput = document.getElementById("ui-color-neutron");
    let eInput = document.getElementById("ui-color-electron");
    let tInput = document.getElementById("ui-theme-select");
    let rInput = document.getElementById("ui-radius-electron");

    let protonColor = pInput ? pInput.value : "#ff0000";
    let neutronColor = nInput ? nInput.value : "#ffffff";
    let electronColor = eInput ? eInput.value : "#00a0ff";
    let themeMode = tInput ? tInput.value : "dark";
    let eRadius = rInput ? parseFloat(rInput.value) : 2;

    if (!this.isSimplified) {
      if (this.model === "thomson") {
        fill(255, 110, 0, themeMode === "light" ? 55 : 70); 
        stroke(255, 90, 0, themeMode === "light" ? 140 : 160);
        strokeWeight(1.5);
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);

        fill(255, 50, 50, 120);
        noStroke();
        ellipse(this.pos.x, this.pos.y, 3, 3);
      } else {
        noFill();
        stroke(themeMode === "light" ? color(15, 23, 42, 28) : color(255, 255, 255, 25));
        strokeWeight(0.8);
        let layersToShow = Math.ceil(this.Z / 15.0);
        for (let l = 0; l <= layersToShow + 1; l++) {
          ellipse(this.pos.x, this.pos.y, this.R * (0.25 + 0.70 * (l / 4.0)) * 2);
        }

        noStroke();
        for (let nuc of this.nucleons) {
          if (nuc.type === "proton") fill(protonColor); 
          else fill(neutronColor); 
          ellipse(nuc.pos.x, nuc.pos.y, 3, 3); 
        }
      }

      fill(electronColor);
      noStroke();
      for (let e of this.electrons) {
        ellipse(e.x, e.y, eRadius * 2, eRadius * 2); 
      }
    } else {
      if (this.model === "thomson") {
        fill(255, 190, 0, themeMode === "light" ? 50 : 60);
        stroke(255, 160, 0, themeMode === "light" ? 130 : 150);
      } else {
        let c = color(electronColor);
        fill(red(c), green(c), blue(c), themeMode === "light" ? 40 : 45);
        stroke(red(c), green(c), blue(c), themeMode === "light" ? 110 : 120);
      }
      strokeWeight(1.5); 
      ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);

      if (this.model === "rutherford") {
        noStroke();
        fill(protonColor);
        ellipse(this.pos.x, this.pos.y, 3, 3); 
      }
    }
  }
}
