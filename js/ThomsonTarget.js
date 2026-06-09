class ThomsonTarget {
  constructor(x, y, radius, numElectrons, isSimplified = false, currentModel = "thomson") {
    this.pos = createVector(x, y); 
    this.R = radius;               
    this.isSimplified = isSimplified; 
    this.model = currentModel; 
    
    this.ke = 1500.0; // Escala óptima de acoplamiento dieléctrico       
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
            pos: createVector(this.pos.x + ringRadius * cos(initialAngle), this.pos.y + ringRadius * sin(initialAngle)),
            vel: createVector(0, 0),
            mass: 1,
            physicsRadius: 0.005,
            rLayer: ringRadius,
            angle: initialAngle,
            isEjected: false
          });
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
      this.coreRadius = constrain(coreRadiusBase, 3, 15);

      if (!this.isSimplified) {
        for (let i = 0; i < n; i++) {
          let r = this.coreRadius * sqrt(random(0, 1));
          let angle = random(0, TWO_PI);
          this.nucleons.push({ pos: createVector(this.pos.x + r * cos(angle), this.pos.y + r * sin(angle)), type: "proton" });
        }
        for (let i = 0; i < n; i++) {
          let r = this.coreRadius * sqrt(random(0, 1));
          let angle = random(0, TWO_PI);
          this.nucleons.push({ pos: createVector(this.pos.x + r * cos(angle), this.pos.y + r * sin(angle)), type: "neutron" });
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
            pos: createVector(this.pos.x + layerRadius * cos(initialAngle), this.pos.y + layerRadius * sin(initialAngle)),
            vel: createVector(0, 0),
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
        e.pos.x = this.pos.x + e.rLayer * cos(currentAngle);
        e.pos.y = this.pos.y + e.rLayer * sin(currentAngle);
      } else {
        e.pos.add(e.vel);
      }
    }
  }

  checkElectronCollisions(alpha) {
    let isFoil = (typeof currentMode !== 'undefined' && currentMode === "foil");
    let scaleFactor = isFoil ? (1.0 / 30.0) : 1.0;
    
    for (let e of this.electrons) {
      if (e.isEjected) continue;
      
      let d = p5.Vector.dist(alpha.pos, e.pos);
      let threshold = (alpha.physicsRadius + e.physicsRadius) * scaleFactor;
      
      if (d < threshold) {
        let normal = p5.Vector.sub(e.pos, alpha.pos).normalize();
        let kx = alpha.vel.x - e.vel.x;
        let ky = alpha.vel.y - e.vel.y;
        let p = 2 * (normal.x * kx + normal.y * ky) / (alpha.mass + e.mass);
        
        alpha.vel.x -= p * e.mass * normal.x;
        alpha.vel.y -= p * e.mass * normal.y;
        e.vel.x += p * alpha.mass * normal.x;
        e.vel.y += p * alpha.mass * normal.y;
        
        e.isEjected = true; 
        e.pos.add(p5.Vector.mult(normal, 0.5));
      }
    }
  }

  calculateNetForce(alpha) {
    let fNet = createVector(0, 0);
    let rVec = p5.Vector.sub(alpha.pos, this.pos);
    let r = rVec.mag();

    let isFoil = (typeof currentMode !== 'undefined' && currentMode === "foil");
    let screeningLength = isFoil ? this.R * 0.4 : this.R * 1.2;
    
    if (r > screeningLength && isFoil) return fNet; 

    if (this.model === "thomson") {
      if (r < this.R) {
        let qEncl = this.Z * pow(r / this.R, 3);
        let fMag = (this.ke * 2.0 * qEncl) / (r * r + 1.0); 
        fNet.add(rVec.copy().normalize().mult(fMag));
      } else {
        let fMag = (this.ke * 2.0 * this.Z) / (r * r + 1.0);
        fNet.add(rVec.copy().normalize().mult(fMag));
      }
      for (let e of this.electrons) {
        if (!e.isEjected) {
          let eVec = p5.Vector.sub(alpha.pos, e.pos);
          let eDist = eVec.mag();
          if (eDist > screeningLength) continue;
          let fE = (this.ke * 2.0 * -1.0) / (eDist * eDist + 1.0);
          fNet.add(eVec.normalize().mult(fE));
        }
      }
    } else {
      let factorAtenuacion = exp(-r / screeningLength);
      let fMag = ((this.ke * 2.0 * this.Z) / (r * r + 0.1)) * factorAtenuacion;
      
      if (fMag > 90000) fMag = 90000; 
      fNet.add(rVec.copy().normalize().mult(fMag));
    }
    return fNet;
  }

  display() {
    let tInput = document.getElementById("ui-theme-select");
    let theme = tInput ? tInput.value : "dark";
    
    let protonColor = document.getElementById("ui-color-proton") ? color(document.getElementById("ui-color-proton").value) : color(255, 0, 0);
    let neutronColor = document.getElementById("ui-color-neutron") ? color(document.getElementById("ui-color-neutron").value) : color(255, 255, 255);
    let electronColor = document.getElementById("ui-color-electron") ? color(document.getElementById("ui-color-electron").value) : color(0, 160, 255);
    let visualERadius = parseFloat(document.getElementById("ui-radius-electron") ? document.getElementById("ui-radius-electron").value : 2.0);

    // CONTROL DEL MODELO EN FUNCIÓN DE LA VISTA SELECCIONADA
    if (this.model === "thomson") {
      if (!this.isSimplified) {
        // Modo Átomo Aislado de Thomson
        fill(255, 190, 0, theme === "light" ? 22 : 12);
        stroke(255, 190, 0, theme === "light" ? 60 : 40);
        strokeWeight(1);
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
      } else {
        // MODO LÁMINA: Incremento sustancial del contraste de fondo del "pudín" de Thomson
        if (theme === "light") {
          fill(255, 190, 0, 45);   // Opacidad reforzada para proyectores en fondo claro
          stroke(217, 119, 6, 120); // Trazo ámbar oscuro bien delimitado
        } else {
          fill(255, 190, 0, 28);   // Opacidad luminosa incrementada para fondo oscuro
          stroke(255, 215, 0, 150); // Trazo dorado eléctrico de alto contraste
        }
        strokeWeight(1.2); 
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
      }
    } else {
      // Modelo de Rutherford
      if (!this.isSimplified) {
        // Modo Átomo Aislado de Rutherford
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
        // MODO LÁMINA: Incremento radical del contraste de fondo de la red vacía de Rutherford
        if (theme === "light") {
          fill(37, 99, 235, 18);   // Relleno azulino translúcido nítido para resaltar el espacio confinado
          stroke(29, 78, 216, 140); // Trazo azul oscuro denso y definido
        } else {
          fill(0, 160, 255, 14);   // Relleno cian sutil de alta luminiscencia interna
          stroke(0, 190, 255, 160); // Trazo cian brillante para destacar contra el fondo negro
        }
        strokeWeight(1.2); 
        ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
        
        // Núcleo central de Rutherford fijo
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