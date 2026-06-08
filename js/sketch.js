let singleAtom;       
let foilAtoms = [];   
let alphas = [];
let deadImpacts = []; 

let currentMode = "atom";
let currentTrigger = "click"; 
let canvasWidth = 870;
let canvasHeight = 686;
let detectorX = 810; 
let spawnX = 25; // Coordenada horizontal de inicio visible y estable

function setup() {
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvas-holder");

  buildEnvironment();
  setupUIEventListeners();
}

function draw() {
  background(11, 12, 16);
  
  // RENDERIZADO DE LA FRANJA TÁCTIL (Solo en disparo manual por clic)
  if (currentTrigger === "click") {
    noStroke();
    fill(0, 160, 255, 15); 
    rect(0, 0, spawnX + 15, height);
    
    stroke(0, 160, 255, 45);
    strokeWeight(1);
    for (let y = 0; y < height; y += 10) {
      line(spawnX + 15, y, spawnX + 15, y + 5);
    }
  }

  // Placa de colisión derecha
  stroke(40, 45, 65);
  strokeWeight(3);
  line(detectorX, 40, detectorX, height - 20);
  noStroke();
  fill(94, 109, 133);
  textSize(10);
  textAlign(CENTER);
  text("DETECTOR", detectorX + 25, 30);
  textAlign(LEFT);

  // MODO RÁFAGA AUTOMÁTICA: Alturas aleatorias en base a la frecuencia indicada
  if (currentTrigger === "continuous") {
    let rate = parseInt(document.getElementById("ui-rate-slider").value);
    if (random(0, 1) < (rate / 60.0)) {
      // Si es un átomo individual, acotamos la ráfaga al diámetro crítico. Si es lámina, ocupa todo el alto.
      let spawnY = currentMode === "atom" ? random(height / 2 - 140, height / 2 + 140) : random(40, height - 40);
      let v0 = parseFloat(document.getElementById("ui-speed-slider").value);
      alphas.push(new AlphaParticle(spawnX, spawnY, v0, 0));
    }
  }

  // Renderizado de blancos según la escala de laboratorio
  if (currentMode === "atom") {
    singleAtom.display();
  } else {
    for (let target of foilAtoms) {
      target.display();
    }
  }

  // Dibujo del registro histórico de impactos
  for (let imp of deadImpacts) {
    fill(red(imp.color), green(imp.color), blue(imp.color), 180);
    ellipse(imp.x, imp.y, 5, 5);
  }

  // Integración cinemática diferencial
  for (let i = alphas.length - 1; i >= 0; i--) {
    let a = alphas[i];
    let fNeta = createVector(0, 0);

    if (currentMode === "atom") {
      fNeta = singleAtom.calculateNetForce(a);
    } else {
      for (let target of foilAtoms) {
        fNeta.add(target.calculateNetForce(a));
      }
    }

    a.applyForce(fNeta);
    a.update();
    a.display();

    // Captura e inactivación en el detector
    if (!a.isDead && a.pos.x >= detectorX) {
      a.isDead = true;
      a.pos.x = detectorX; 
      deadImpacts.push({ x: a.pos.x, y: a.pos.y, color: a.particleColor });
      
      if (deadImpacts.length > 40) deadImpacts.shift(); // Borrado rápido a la derecha
      alphas.splice(i, 1);
      continue;
    }

    // Recolector de fugas periféricas
    if (a.pos.y < -10 || a.pos.y > height + 10 || a.pos.x < -10) {
      alphas.splice(i, 1);
    }
  }
}

// CAPTURA DE INTERACCIÓN POR CLIC DIRECTO: Altura exacta Y del ratón
function mousePressed() {
  if (currentTrigger === "click" && mouseX >= 0 && mouseX <= spawnX + 15 && mouseY >= 0 && mouseY <= height) {
    let v0 = parseFloat(document.getElementById("ui-speed-slider").value);
    alphas.push(new AlphaParticle(spawnX, mouseY, v0, 0));
  }
}

function buildEnvironment() {
  let z = parseInt(document.getElementById("ui-z-slider").value);
  singleAtom = new ThomsonTarget(width / 2 + 40, height / 2, 190, z, false);

  foilAtoms = [];
  let atomRadius = 14; 
  let startX = width / 2 - 40; 
  let numColumnas = 6;         
  
  for (let col = 0; col < numColumnas; col++) {
    let x = startX + col * (atomRadius * 1.6); 
    let yOffset = (col % 2 === 0) ? 0 : atomRadius; 
    for (let y = atomRadius + 40; y < height - 20; y += atomRadius * 2) {
      foilAtoms.push(new ThomsonTarget(x, y + yOffset, atomRadius, z, true));
    }
  }
}

function setupUIEventListeners() {
  document.getElementById("ui-mode-select").addEventListener("change", (e) => {
    currentMode = e.target.value;
    alphas = [];
    deadImpacts = [];
    buildEnvironment();
  });

  document.getElementById("ui-trigger-select").addEventListener("change", (e) => {
    currentTrigger = e.target.value;
    let groupRate = document.getElementById("group-rate");
    let shootBtn = document.getElementById("ui-btn-shoot");
    
    if (currentTrigger === "continuous") {
      groupRate.style.opacity = "1.0";
      groupRate.style.pointerEvents = "auto";
      shootBtn.disabled = true; 
      shootBtn.style.opacity = 0.4;
    } else {
      groupRate.style.opacity = "0.3";
      groupRate.style.pointerEvents = "none";
      shootBtn.disabled = false; 
      shootBtn.style.opacity = 1.0;
    }
    alphas = [];
    deadImpacts = [];
  });

  document.getElementById("ui-z-slider").addEventListener("input", (e) => {
    document.getElementById("z-val").innerText = e.target.value;
    buildEnvironment();
  });

  document.getElementById("ui-rate-slider").addEventListener("input", (e) => {
    document.getElementById("rate-val").innerText = e.target.value;
  });

  document.getElementById("ui-speed-slider").addEventListener("input", (e) => {
    document.getElementById("speed-val").innerText = parseFloat(e.target.value).toFixed(1);
  });

  // El botón físico del panel efectúa un lanzamiento por la línea central (b=0) como alternativa táctil
  document.getElementById("ui-btn-shoot").addEventListener("click", () => {
    if (currentTrigger === "click") {
      let v0 = parseFloat(document.getElementById("ui-speed-slider").value);
      alphas.push(new AlphaParticle(spawnX, height / 2, v0, 0));
    }
  });

  document.getElementById("ui-btn-reset").addEventListener("click", () => {
    alphas = [];
    deadImpacts = [];
  });
}