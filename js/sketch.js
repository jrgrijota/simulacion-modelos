let singleAtom;       
let foilAtoms = [];   
let alphas = [];
let deadImpacts = []; 

let currentMode = "atom";
let currentTrigger = "click"; 
let currentModel = "thomson"; 

let canvasWidth = 870;
let canvasHeight = 686;
let detectorX = 810; 
let spawnX = 25; 

function setup() {
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvas-holder");

  setupAppearanceEventListeners();
  setupUIEventListeners();
  buildEnvironment();
}

function draw() {
  let tInput = document.getElementById("ui-theme-select");
  let themeMode = tInput ? tInput.value : "dark";
  
  if (themeMode === "light") {
    background(248, 250, 252); 
  } else {
    background(11, 12, 16);    
  }
  
  if (currentTrigger === "click") {
    noStroke();
    fill(0, 160, 255, themeMode === "light" ? 10 : 15); 
    rect(0, 0, spawnX + 15, height);
    
    stroke(0, 160, 255, themeMode === "light" ? 35 : 45);
    strokeWeight(1);
    for (let y = 0; y < height; y += 10) {
      line(spawnX + 15, y, spawnX + 15, y + 5);
    }
  }

  stroke(themeMode === "light" ? color(148, 163, 184) : color(40, 45, 65));
  strokeWeight(3);
  line(detectorX, 40, detectorX, height - 20);
  noStroke();
  fill(themeMode === "light" ? color(71, 85, 105) : color(94, 109, 133));
  textSize(10);
  textAlign(CENTER);
  text("DETECTOR", detectorX + 25, 30);
  textAlign(LEFT);

  if (currentTrigger === "continuous") {
    let rSlider = document.getElementById("ui-rate-slider");
    let rate = rSlider ? parseInt(rSlider.value) : 20;
    if (random(0, 1) < (rate / 60.0)) {
      let spawnY = currentMode === "atom" ? random(height / 2 - 140, height / 2 + 140) : random(40, height - 40);
      let sSlider = document.getElementById("ui-speed-slider");
      let v0 = sSlider ? parseFloat(sSlider.value) : 10.0;
      alphas.push(new AlphaParticle(spawnX, spawnY, v0, 0));
    }
  }

  if (currentMode === "atom") {
    if (singleAtom) singleAtom.display();
  } else {
    for (let target of foilAtoms) {
      target.display();
    }
  }

  for (let imp of deadImpacts) {
    fill(red(imp.color), green(imp.color), blue(imp.color), themeMode === "light" ? 210 : 180);
    ellipse(imp.x, imp.y, 5, 5);
  }

  for (let i = alphas.length - 1; i >= 0; i--) {
    let a = alphas[i];
    let fNeta = createVector(0, 0);

    if (currentMode === "atom") {
      if (singleAtom) fNeta = singleAtom.calculateNetForce(a);
    } else {
      for (let target of foilAtoms) {
        fNeta.add(target.calculateNetForce(a));
      }
    }

    a.applyForce(fNeta);
    a.update();
    a.display();

    if (!a.isDead && a.pos.x >= detectorX) {
      a.isDead = true;
      a.pos.x = detectorX; 
      deadImpacts.push({ x: a.pos.x, y: a.pos.y, color: a.particleColor });
      
      if (deadImpacts.length > 40) deadImpacts.shift(); 
      alphas.splice(i, 1);
      continue;
    }

    if (a.pos.y < -50 || a.pos.y > height + 50 || a.pos.x < -50) {
      alphas.splice(i, 1);
    }
  }
}

function mousePressed() {
  if (currentTrigger === "click" && mouseX >= 0 && mouseX <= spawnX + 15 && mouseY >= 0 && mouseY <= height) {
    let sSlider = document.getElementById("ui-speed-slider");
    let v0 = sSlider ? parseFloat(sSlider.value) : 10.0;
    alphas.push(new AlphaParticle(spawnX, mouseY, v0, 0));
  }
}

function buildEnvironment() {
  let zSlider = document.getElementById("ui-z-slider");
  let z = zSlider ? parseInt(zSlider.value) : 14;
  
  singleAtom = new ThomsonTarget(width / 2 + 40, height / 2, 190, z, false, currentModel);

  foilAtoms = [];
  let atomRadius = 14; 
  let atomDiameter = atomRadius * 2; 
  let lSlider = document.getElementById("ui-layers-slider");
  let numColumnas = lSlider ? parseInt(lSlider.value) : 3;
  
  let totalFoilWidth = (numColumnas - 1) * atomDiameter;
  let startX = (width / 2) - (totalFoilWidth / 2) + 20;
  
  for (let col = 0; col < numColumnas; col++) {
    let x = startX + col * atomDiameter; 
    for (let y = atomRadius + 40; y < height - 20; y += atomDiameter) {
      foilAtoms.push(new ThomsonTarget(x, y, atomRadius, z, true, currentModel));
    }
  }
}

function setupUIEventListeners() {
  document.getElementById("ui-atom-model").addEventListener("change", (e) => {
    currentModel = e.target.value;
    alphas = [];
    deadImpacts = [];
    buildEnvironment();
  });

  document.getElementById("ui-mode-select").addEventListener("change", (e) => {
    currentMode = e.target.value;
    let groupLayers = document.getElementById("group-layers");
    if (groupLayers) {
      groupLayers.style.display = currentMode === "foil" ? "block" : "none";
    }
    alphas = [];
    deadImpacts = [];
    buildEnvironment();
  });

  document.getElementById("ui-trigger-select").addEventListener("change", (e) => {
    currentTrigger = e.target.value;
    let groupRate = document.getElementById("group-rate");
    let shootBtn = document.getElementById("ui-btn-shoot");
    
    if (currentTrigger === "continuous") {
      if (groupRate) { groupRate.style.opacity = "1.0"; groupRate.style.pointerEvents = "auto"; }
      if (shootBtn) shootBtn.disabled = true; 
    } else {
      if (groupRate) { groupRate.style.opacity = "0.3"; groupRate.style.pointerEvents = "none"; }
      if (shootBtn) shootBtn.disabled = false; 
    }
    alphas = [];
    deadImpacts = [];
  });

  document.getElementById("ui-layers-slider").addEventListener("input", (e) => {
    document.getElementById("layers-val").innerText = e.target.value;
    buildEnvironment();
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

  document.getElementById("ui-btn-shoot").addEventListener("click", () => {
    if (currentTrigger === "click") {
      let sSlider = document.getElementById("ui-speed-slider");
      let v0 = sSlider ? parseFloat(sSlider.value) : 10.0;
      alphas.push(new AlphaParticle(spawnX, height / 2, v0, 0));
    }
  });

  document.getElementById("ui-btn-reset").addEventListener("click", () => {
    alphas = [];
    deadImpacts = [];
  });
}

function setupAppearanceEventListeners() {
  let trigger = document.getElementById("ui-dropdown-trigger");
  let container = document.getElementById("ui-dropdown-container");
  
  if (trigger && container) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      container.classList.toggle("is-active");
    });

    document.addEventListener("click", () => {
      container.classList.remove("is-active");
    });
    
    container.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  let themeSelect = document.getElementById("ui-theme-select");
  if (themeSelect) {
    themeSelect.addEventListener("change", (e) => {
      document.documentElement.setAttribute("data-theme", e.target.value);
    });
  }

  let radiusInput = document.getElementById("ui-radius-electron");
  if (radiusInput) {
    radiusInput.addEventListener("input", (e) => {
      let valLabel = document.getElementById("electron-radius-val");
      if (valLabel) valLabel.innerText = e.target.value + " px";
    });
  }
}
