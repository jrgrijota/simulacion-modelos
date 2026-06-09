class AlphaParticle {
  constructor(x, y, vx, vy = 0) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy); 
    this.acc = createVector(0, 0);
    this.mass = 4.0;                   
    this.history = [];                 
    this.dt = 1.0;                     
    this.isDead = false; 
    
    let colorInput = document.getElementById("ui-color-alpha");
    this.baseColorHex = colorInput ? colorInput.value : "#00ff00";
    this.particleColor = color(this.baseColorHex);
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

    let amt = constrain(this.deviationAngle / 20.0, 0, 1);
    let colorInput = document.getElementById("ui-color-alpha");
    let baseColor = colorInput ? color(colorInput.value) : color(0, 255, 0);
    this.particleColor = lerpColor(baseColor, color(255, 0, 0), amt);

    if (frameCount % 3 === 0) {
      this.history.push(this.pos.copy());
      if (this.history.length > 35) this.history.shift(); 
    }
  }

  display() {
    if (!this.isDead) {
      noFill();
      let rastroColor = color(red(this.particleColor), green(this.particleColor), blue(this.particleColor), 70);
      stroke(rastroColor);
      strokeWeight(1.4);
      beginShape();
      for (let p of this.history) {
        vertex(p.x, p.y);
      }
      endShape();
    }

    fill(this.particleColor);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 4.5, 4.5);
  }
}