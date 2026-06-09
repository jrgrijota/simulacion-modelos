class AlphaParticle {
  constructor(x, y, vx, vy = 0) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.acc = createVector(0, 0);
    
    this.mass = 7350; 
    this.visualRadius = 3.5; 
    this.physicsRadius = 0.005; 
    
    this.history = [];
    this.isDead = false;
    this.deviationAngle = 0;
    this.hasBeenCounted = false;
    this.dt = 1.0;

    let colorInput = document.getElementById("ui-color-alpha");
    this.baseColorHex = colorInput ? colorInput.value : "#00ff00";
    this.particleColor = color(this.baseColorHex);
  }

  applyForce(f) {
    let fOverM = p5.Vector.div(f, this.mass);
    this.acc.add(fOverM);
  }

  integrate(dt, targetAtom) {
    if (this.isDead) return;

    let subSteps = 10;
    let subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.acc.mult(0);
      
      if (targetAtom) {
        let fElectrica = targetAtom.calculateNetForce(this);
        this.applyForce(fElectrica);
        targetAtom.checkElectronCollisions(this);
      }

      this.pos.add(p5.Vector.mult(this.vel, subDt).add(p5.Vector.mult(this.acc, 0.5 * subDt * subDt)));
      this.vel.add(p5.Vector.mult(this.acc, subDt));
    }

    let heading = this.vel.heading();
    this.deviationAngle = abs(degrees(heading));
    
    let amt = constrain(this.deviationAngle / 35.0, 0, 1);
    let colorInput = document.getElementById("ui-color-alpha");
    let baseColor = colorInput ? color(colorInput.value) : color(0, 255, 0);
    this.particleColor = lerpColor(baseColor, color(255, 0, 0), amt);

    if (frameCount % 2 === 0) {
      this.history.push(this.pos.copy());
      if (this.history.length > 45) this.history.shift();
    }
  }

  display() {
    noStroke();
    fill(this.particleColor);
    ellipse(this.pos.x, this.pos.y, this.visualRadius * 2, this.visualRadius * 2);
    
    for (let i = 0; i < this.history.length; i++) {
      let p = this.history[i];
      fill(red(this.particleColor), green(this.particleColor), blue(this.particleColor), map(i, 0, this.history.length, 5, 80));
      ellipse(p.x, p.y, 2, 2);
    }
  }
}