class AlphaParticle {
  constructor(x, y, speed, isFoilMode = false) {
    this.pos = createVector(x, y);
    this.vel = createVector(speed, 0); 
    this.acc = createVector(0, 0);
    this.mass = 4.0;                   
    this.history = [];                 
    this.dt = 1.0;                     
    this.isFoilMode = isFoilMode; 
    this.isDead = false; 
    this.particleColor = color(0, 255, 0);
    this.deviationAngle = 0;
  }

  applyForce(f) {
    let fOverM = p5.Vector.div(f, this.mass);
    this.acc.add(fOverM);
  }

  update() {
    if (this.isDead) return; 

    this.vel.add(p5.Vector.mult(this.acc, this.dt));
    this.pos.add(p5.Vector.mult(this.vel, this.dt));
    this.acc.mult(0); 

    let heading = this.vel.heading(); 
    this.deviationAngle = abs(degrees(heading));

    // RECALIBRACIÓN DEL GRADIENTE: Ajustado el límite a 10 grados para el rojo puro
    let amt = constrain(this.deviationAngle / 10.0, 0, 1);
    this.particleColor = lerpColor(color(0, 255, 0), color(255, 0, 0), amt);

    if (!this.isFoilMode && frameCount % 3 === 0) {
      this.history.push(this.pos.copy());
      if (this.history.length > 35) this.history.shift(); 
    }
  }

  display() {
    if (!this.isFoilMode && !this.isDead) {
      noFill();
      let rastroColor = color(red(this.particleColor), green(this.particleColor), blue(this.particleColor), 60);
      stroke(rastroColor);
      strokeWeight(1.2);
      beginShape();
      for (let p of this.history) {
        vertex(p.x, p.y);
      }
      endShape();
    }

    if (this.isDead) {
      fill(red(this.particleColor), green(this.particleColor), blue(this.particleColor), 200);
      stroke(red(this.particleColor), green(this.particleColor), blue(this.particleColor));
      strokeWeight(1);
      ellipse(this.pos.x, this.pos.y, 7, 7);
    } else {
      fill(this.particleColor);
      noStroke();
      let size = this.isFoilMode ? 2.5 : 4.5;
      ellipse(this.pos.x, this.pos.y, size, size);
    }
  }
}