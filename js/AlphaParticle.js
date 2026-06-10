class AlphaParticle {
  constructor(x, y, vx, vy = 0) {
    this.pos = { x: x, y: y }; // Optimizado a objeto literal internamente para las operaciones matemáticas masivas
    this.vel = { x: vx, y: vy };
    this.acc = { x: 0, y: 0 };
    
    this.mass = 7350; 
    this.visualRadius = 3.5; 
    this.physicsRadius = 0.005; 
    
    this.history = [];
    this.isDead = false;
    this.hasEnteredDetector = false;
    this.deviationAngle = 0;
    this.hasBeenCounted = false;

    let colorInput = document.getElementById("ui-color-alpha");
    this.baseColorHex = colorInput ? colorInput.value : "#00ff00";
    this.particleColor = color(this.baseColorHex);
  }

  // Integrador de Verlet por desdoblamiento primitivo. Evita la instanciación de clases de p5.Vector
  integrate(dt, targetAtom) {
    if (this.isDead) return;

    let subSteps = 10;
    let subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.acc.x = 0;
      this.acc.y = 0;
      
      if (targetAtom) {
        let fElectrica = targetAtom.calculateNetForce(this);
        // Apply Force en línea para ahorrar llamadas a función
        this.acc.x += fElectrica.x / this.mass;
        this.acc.y += fElectrica.y / this.mass;
        
        targetAtom.checkElectronCollisions(this);
      }

      // Integración simplética cruda
      this.pos.x += this.vel.x * subDt + 0.5 * this.acc.x * subDt * subDt;
      this.pos.y += this.vel.y * subDt + 0.5 * this.acc.y * subDt * subDt;
      this.vel.x += this.acc.x * subDt;
      this.vel.y += this.acc.y * subDt;
    }

    // Ángulo de desviación respecto a la dirección inicial (+x): 0°=recto, 180°=retrodispersión
    let vLen = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
    if (vLen > 0) {
      let cosTheta = Math.max(-1, Math.min(1, this.vel.x / vLen));
      this.deviationAngle = Math.acos(cosTheta) * (180 / Math.PI);
    }
    
    let amt = constrain(this.deviationAngle / 35.0, 0, 1);
    let colorInput = document.getElementById("ui-color-alpha");
    let baseColor = colorInput ? color(colorInput.value) : color(0, 255, 0);
    this.particleColor = lerpColor(baseColor, color(255, 0, 0), amt);

    if (frameCount % 2 === 0) {
      this.history.push({ x: this.pos.x, y: this.pos.y });
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