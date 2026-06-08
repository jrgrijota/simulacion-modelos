class ThomsonTarget {
  constructor(x, y, radius, numElectrons, isSimplified = false) {
    this.pos = createVector(x, y); 
    this.R = radius;               
    this.isSimplified = isSimplified; 
    
    this.ke = 45.0;          
    this.qAlpha = 2.0;       
    this.Z = numElectrons;   
    
    this.electrons = [];     
    this.positivePoints = [];
    
    if (!this.isSimplified) {
      this.generateDiscretizedAtom();
    }
  }

  generateDiscretizedAtom() {
    this.electrons = [];
    this.positivePoints = [];
    
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
      if (remaining <= cap) {
        targetRings.push(remaining);
        remaining = 0;
      } else {
        targetRings.push(cap);
        remaining -= cap;
        ringIndex++;
      }
    }

    let numRings = targetRings.length;
    for (let r = 0; r < numRings; r++) {
      let electronsInRing = targetRings[r];
      let ringRadius = this.R * 0.85; 
      if (numRings > 1) {
        ringRadius = this.R * (0.15 + (0.70 * (r / (numRings - 1))));
      }

      if (electronsInRing === 1 && r === 0) {
        this.electrons.push(createVector(this.pos.x, this.pos.y));
        continue;
      }

      for (let i = 0; i < electronsInRing; i++) {
        let angle = (TWO_PI / electronsInRing) * i + (r * 0.25);
        let ex = this.pos.x + ringRadius * cos(angle);
        let ey = this.pos.y + ringRadius * sin(angle);
        this.electrons.push(createVector(ex, ey));
      }
    }

    let goldenAngle = 137.5 * (PI / 180); 
    for (let i = 0; i < positiveSlots; i++) {
      let r = this.R * sqrt(i / positiveSlots) * 0.95; 
      let angle = i * goldenAngle;
      let px = this.pos.x + r * cos(angle);
      let py = this.pos.y + r * sin(angle);
      this.positivePoints.push(createVector(px, py));
    }
  }

  calculateNetForce(alpha) {
    let fNet = createVector(0, 0);
    if (alpha.isDead) return fNet;

    let toCenter = p5.Vector.sub(alpha.pos, this.pos);
    let distToCenter = toCenter.mag();
    
    // TEOREMA DE GAUSS: Neutralidad electrostática estricta fuera de la corteza
    if (distToCenter > this.R) {
      return fNet; 
    }

    if (this.isSimplified) {
      let rVec = p5.Vector.sub(alpha.pos, this.pos);
      let fuerzaEfectiva = 18.0 + sin(this.pos.y * 5.0) * 4.0;
      let mag = (fuerzaEfectiva * rVec.mag()) / (this.R * this.R); 
      return rVec.normalize().mult(mag);
    }

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

    return fNet;
  }

  display() {
    if (!this.isSimplified) {
      fill(255, 110, 0, 28); 
      stroke(255, 130, 0, 60);
      strokeWeight(1);
      ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);

      fill(255, 50, 50, 80);
      noStroke();
      ellipse(this.pos.x, this.pos.y, 2, 2);

      fill(0, 160, 255);
      noStroke();
      for (let e of this.electrons) {
        ellipse(e.x, e.y, 1, 1); 
      }
    } else {
      fill(255, 190, 0, 20);
      stroke(255, 180, 0, 35);
      strokeWeight(0.6);
      ellipse(this.pos.x, this.pos.y, this.R * 2, this.R * 2);
    }
  }
}