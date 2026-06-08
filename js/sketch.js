let singleAtom;       
let foilAtoms = [];   
let alphas = [];
let deadImpacts = []; 
let initialSpeed = 10.0; // Inercia incrementada para equilibrar la integración temporal del motor físico

// Componentes del DOM
let modeSelect;
let triggerSelect; 
let sliderRate;
let sliderElectrons; 
let lastZ = 14;      

let currentMode = "atomic";
let currentTrigger = "click"; 

function setup() {
  let canvas = createCanvas(900, 560);
  canvas.parent("canvas-container");

  singleAtom = new ThomsonTarget(width / 2 - 20, height / 2 + 30, 95, 14, false);

  let atomRadius = 9; 
  let startX = width / 2 - 40; 
  let numColumnas = 6;         
  
  for (let col = 0; col < numColumnas; col++) {
    let x = startX + col * (atomRadius * 1.6); 
    let yOffset = (col % 2 === 0) ? 0 : atomRadius; 
    
    for (let y = atomRadius + 80; y < height; y += atomRadius * 2) {
      foilAtoms.push(new ThomsonTarget(x, y + yOffset, atomRadius, 4, true));
    }
  }

  modeSelect = createSelect();
  modeSelect.position(25, 65);
  modeSelect.option("Vista Atómica Individual", "atomic");
  modeSelect.option("Vista de Lámina (Mucho menos zoom)", "foil");
  modeSelect.changed(onModeChange);

  triggerSelect = createSelect();
  triggerSelect.position(260, 65);
  triggerSelect.option("Modo de Disparo: Clic Manual", "click");
  triggerSelect.option("Modo de Disparo: Ráfaga Continua", "continuous");
  triggerSelect.changed(onTriggerChange);

  sliderRate = createSlider(1, 60, 20);
  sliderRate.position(25, 120);

  sliderElectrons = createSlider(1, 100, 14);
  sliderElectrons.position(540, 120);
}

function draw() {
  background(12);
  
  stroke(60);
  strokeWeight(2);
  line(820, 80, 820, height);
  noStroke();
  fill(80);
  textSize(10);
  text("DETECTOR", 830, 95);

  if (currentMode === "atomic" && sliderElectrons.value() !== lastZ) {
    lastZ = sliderElectrons.value();
    singleAtom = new ThomsonTarget(width / 2 - 20, height / 2 + 30, 95, lastZ, false);
    alphas = []; 
    deadImpacts = [];
  }

  if (currentMode === "foil" || (currentMode === "atomic" && currentTrigger === "continuous")) {
    autoEmitParticles();
  }

  if (currentMode === "atomic") {
    singleAtom.display();
  } else {
    for (let target of foilAtoms) {
      target.display();
    }
  }

  for (let imp of deadImpacts) {
    fill(red(imp.color), green(imp.color), blue(imp.color), 180);
    ellipse(imp.x, imp.y, 6, 6);
  }

  for (let i = alphas.length - 1; i >= 0; i--) {
    let a = alphas[i];
    
    let fNeta = createVector(0, 0);
    if (currentMode === "atomic") {
      fNeta = singleAtom.calculateNetForce(a);
    } else {
      for (let target of foilAtoms) {
        fNeta.add(target.calculateNetForce(a));
      }
    }

    a.applyForce(fNeta);
    a.update();
    a.display();

    if (!a.isDead && a.pos.x >= 820) {
      a.isDead = true;
      a.pos.x = 820; 
      deadImpacts.push({
        x: a.pos.x,
        y: a.pos.y,
        color: a.particleColor
      });
      
      if (deadImpacts.length > 40) deadImpacts.shift();
      
      alphas.splice(i, 1);
      continue;
    }

    if (a.pos.y < 80 || a.pos.y > height + 20 || a.pos.x < -20) {
      alphas.splice(i, 1);
    }
  }

  drawUI();
}

function autoEmitParticles() {
  let rate = sliderRate.value(); 
  let probability = rate / 60.0;
  
  if (random(0, 1) < probability) {
    let spawnY = random(95, height - 20);
    if (currentMode === "atomic") {
      alphas.push(new AlphaParticle(0, spawnY, initialSpeed, false));
    } else {
      alphas.push(new AlphaParticle(0, spawnY, initialSpeed, true));
    }
  }
}

function onModeChange() {
  currentMode = modeSelect.value();
  alphas = []; 
  deadImpacts = []; 
  
  if (currentMode === "foil") {
    triggerSelect.hide(); 
    sliderElectrons.hide(); 
  } else {
    triggerSelect.show();
    sliderElectrons.show();
  }
}

function onTriggerChange() {
  currentTrigger = triggerSelect.value();
  alphas = [];
  deadImpacts = [];
}

function mousePressed() {
  if (mouseY < 160) return;

  if (currentMode === "atomic" && currentTrigger === "click" && mouseX < 200) {
    alphas.push(new AlphaParticle(0, mouseY, initialSpeed, false));
  }
}

function drawUI() {
  fill(20);
  rect(0, 0, width, 155);

  fill(240);
  noStroke();
  textSize(14);
  text("Simulador Físico: Experimento de Rutherford vs Hipótesis de Thomson", 25, 35);
  
  fill(180);
  textSize(11);
  text("Frecuencia de ráfaga (Partículas/seg): " + sliderRate.value(), 165, 133);
  
  if (currentMode === "atomic") {
    text("Número de electrones (Carga Z): " + sliderElectrons.value(), 680, 133);
  }

  text("Gradiente de desviación:", 540, 35);
  fill(0, 255, 0); rect(680, 24, 12, 12); fill(160); text("0º (Sin deflexión)", 700, 34);
  fill(255, 0, 0); rect(800, 24, 12, 12); fill(160); text("≥20º (Desviación notable)", 820, 34);

  stroke(40);
  line(0, 155, width, 155);
  noStroke();

  fill(200);
  if (currentMode === "atomic") {
    if (currentTrigger === "click") {
      text("Modo: Átomo aislado. Disparo por Clic Manual habilitado.", 25, 175);
      text("Haz clic abajo a la izquierda (X < 200) para lanzar y analizar el rastro.", 25, 192);
    } else {
      text("Modo: Átomo aislado. Disparo por Flujo Continuo habilitado.", 25, 175);
      text("Mueve el deslizador derecho para observar cómo se autoorganizan los electrones en capas concéntricas.", 25, 192);
    }
  } else {
    text("Modo: Lámina de Oro con bajo zoom (6 capas sucesivas de átomos densos).", 25, 175);
    text("Observa el camino largo: el flujo continuo impacta en el detector sin encender luces rojas.", 25, 192);
  }
}