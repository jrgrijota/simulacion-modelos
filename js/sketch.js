let singleAtom;       
let foilAtoms = [];   
let alphas = [];
let deadImpacts = []; 

let currentMode = "atom";
let currentTrigger = "click"; 
let currentModel = "thomson"; 

let canvasWidth = 870;
let canvasHeight = 686;
let detectorX = 780; 
let spawnX = 25; 

let statTotal = 0;
let statStraight = 0;
let statDeviated = 0;
let statRebound = 0;

let hasClickedInManualMode = false;
let isContinuousPlaying = false; 

function setup() {
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvas-holder");

  setupAppearanceEventListeners();
  setupUIEventListeners();
  buildEnvironment();
  updateManualHintVisibility();
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
    fill(0, 160, 255, themeMode === "light" ? 14 : 20); 
    rect(0, 0, spawnX + 15, height);
    
    stroke(0, 160, 255, themeMode === "light" ? 40 : 55);
    strokeWeight(1);
    for (let y = 0; y < height; y += 10) {
      line(spawnX + 15, y, spawnX + 15, y + 5);
    }
    
    push();
    translate(spawnX - 6, height / 2);
    rotate(-HALF_PI);
    noStroke();
    fill(0, 160, 255, themeMode === "light" ? 140 : 180);
    textSize(10);
    textAlign(CENTER);
    text("ZONA DE DISPARO (CLIC)", 0, 0);
    pop();
  }

  // Detector Fijo
  stroke(themeMode === "light" ? color(203, 213, 225) : color(30, 41, 59));
  strokeWeight(4);
  line(detectorX, 0, detectorX, height);
  
  push();
  translate(detectorX - 15, height / 2);
  rotate(-HALF_PI);
  noStroke();
  fill(themeMode === "light" ? color(148, 163, 184) : color(51, 65, 85));
  textSize(24);
  textFont('monospace');
  textStyle(BOLD);
  textAlign(CENTER);
  text("DETECTOR", 0, 0);
  pop();

  if (currentTrigger === "continuous" && isContinuousPlaying) {
    let rSlider = document.getElementById("ui-rate-slider");
    let rate = rSlider ? parseInt(rSlider.value) : 20;
    if (random(0, 1) < (rate / 60.0)) {
      let spawnY = random(40, height - 40); 
      let sSlider = document.getElementById("ui-speed-slider");
      let v0 = sSlider ? parseFloat(sSlider.value) : 10.0;
      alphas.push(new AlphaParticle(spawnX, spawnY, v0, 0));
      statTotal++;
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
        let fNet = target.calculateNetForce(a);
        fNeta.add(fNet);
      }
    }

    a.applyForce(fNeta);
    a.update();
    a.display();

    if (!a.isDead && a.pos.x >= detectorX) {
      a.isDead = true;
      a.pos.x = detectorX; 
      deadImpacts.push({ x: a.pos.x, y: a.pos.y, color: a.particleColor });
      
      if (!a.hasBeenCounted) {
        a.hasBeenCounted = true;
        let finalAngle = a.deviationAngle; 
        if (finalAngle < 1.0) {
          statStraight++;
        } else if (finalAngle >= 1.0 && finalAngle <= 90.0) {
          statDeviated++;
        } else {
          statRebound++;
        }
        updateTelemetryUI();
      }
      
      if (deadImpacts.length > 40) deadImpacts.shift(); 
      alphas.splice(i, 1);
      continue;
    }

    if (a.pos.x < -10 || a.pos.y < -50 || a.pos.y > height + 50) {
      if (a.pos.x < -10 && !a.hasBeenCounted) {
        a.hasBeenCounted = true;
        statRebound++;
        updateTelemetryUI();
      }
      alphas.splice(i, 1);
    }
  }
}

function mousePressed() {
  if (currentTrigger === "click" && mouseX >= 0 && mouseX <= spawnX + 15 && mouseY >= 0 && mouseY <= height) {
    if (!hasClickedInManualMode) {
      hasClickedInManualMode = true;
      updateManualHintVisibility();
    }

    let sSlider = document.getElementById("ui-speed-slider");
    let v0 = sSlider ? parseFloat(sSlider.value) : 10.0;
    alphas.push(new AlphaParticle(spawnX, mouseY, v0, 0));
    statTotal++;
    updateTelemetryUI();
  }
}

function buildEnvironment() {
  let zSlider = document.getElementById("ui-z-slider");
  let z = zSlider ? parseInt(zSlider.value) : 14;
  
  singleAtom = new ThomsonTarget(width / 2, height / 2, 190, z, false, currentModel);

  foilAtoms = [];
  let atomRadius = 14; 
  let atomDiameter = atomRadius * 2; 
  let lSlider = document.getElementById("ui-layers-slider");
  let numColumnas = lSlider ? parseInt(lSlider.value) : 3;
  
  let totalFoilWidth = (numColumnas - 1) * atomDiameter;
  let startX = (width / 2) - (totalFoilWidth / 2) - 40; 
  
  for (let col = 0; col < numColumnas; col++) {
    let x = startX + col * atomDiameter; 
    for (let y = atomRadius + 40; y < height - 20; y += atomDiameter) {
      foilAtoms.push(new ThomsonTarget(x, y, atomRadius, z, true, currentModel));
    }
  }
}

function updateTelemetryUI() {
  let tElem = document.getElementById("stat-total");
  let sElem = document.getElementById("stat-straight");
  let dElem = document.getElementById("stat-deviated");
  let rElem = document.getElementById("stat-rebound");

  if(tElem) tElem.innerText = statTotal;
  if (statTotal > 0) {
    if(sElem) sElem.innerText = ((statStraight / statTotal) * 100).toFixed(1) + "%";
    if(dElem) dElem.innerText = ((statDeviated / statTotal) * 100).toFixed(1) + "%";
    if(rElem) rElem.innerText = ((statRebound / statTotal) * 100).toFixed(1) + "%";
  } else {
    if(sElem) sElem.innerText = "0%";
    if(dElem) dElem.innerText = "0%";
    if(rElem) rElem.innerText = "0%";
  }
}

function resetTelemetry() {
  statTotal = 0;
  statStraight = 0;
  statDeviated = 0;
  statRebound = 0;
  updateTelemetryUI();
}

function updateManualHintVisibility() {
  let hintBanner = document.getElementById("ui-manual-hint");
  if (hintBanner) {
    hintBanner.style.display = (currentTrigger === "click" && !hasClickedInManualMode) ? "block" : "none";
    hintBanner.style.opacity = (currentTrigger === "click" && !hasClickedInManualMode) ? "1.0" : "0.0";
  }
}

function setupUIEventListeners() {
  document.getElementById("ui-atom-model").addEventListener("change", (e) => {
    currentModel = e.target.value;
    alphas = []; deadImpacts = []; resetTelemetry(); buildEnvironment();
  });

  document.getElementById("ui-mode-select").addEventListener("change", (e) => {
    currentMode = e.target.value;
    let groupLayers = document.getElementById("group-layers");
    if (groupLayers) groupLayers.style.display = currentMode === "foil" ? "block" : "none";
    alphas = []; deadImpacts = []; resetTelemetry(); buildEnvironment();
  });

  document.getElementById("ui-trigger-select").addEventListener("change", (e) => {
    currentTrigger = e.target.value;
    let groupRate = document.getElementById("group-rate");
    let groupEnergy = document.getElementById("group-energy");
    let playPauseBtn = document.getElementById("ui-btn-playpause");
    
    if (currentTrigger === "click") {
      hasClickedInManualMode = false;
      if (groupRate) groupRate.style.display = "none"; 
      if (groupEnergy) groupEnergy.style.gridColumn = "span 2"; 
      if (playPauseBtn) { playPauseBtn.disabled = true; isContinuousPlaying = false; }
    } else {
      if (groupRate) groupRate.style.display = "block"; 
      if (groupEnergy) groupEnergy.style.gridColumn = "span 1"; 
      if (playPauseBtn) playPauseBtn.disabled = false;
    }
    
    let btnText = playPauseBtn.querySelector("span");
    let btnIcon = playPauseBtn.querySelector("svg");
    if(btnText) btnText.innerText = "Play";
    if(btnIcon) btnIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    playPauseBtn.className = "is-paused";

    updateManualHintVisibility();
    alphas = []; deadImpacts = []; resetTelemetry();
  });

  let playPauseBtn = document.getElementById("ui-btn-playpause");
  playPauseBtn.addEventListener("click", () => {
    isContinuousPlaying = !isContinuousPlaying;
    let btnText = playPauseBtn.querySelector("span");
    let btnIcon = playPauseBtn.querySelector("svg");
    if (isContinuousPlaying) {
      if(btnText) btnText.innerText = "Pausa";
      if(btnIcon) btnIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
      playPauseBtn.className = "";
    } else {
      if(btnText) btnText.innerText = "Play";
      if(btnIcon) btnIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      playPauseBtn.className = "is-paused";
    }
  });

  document.getElementById("ui-layers-slider").addEventListener("input", (e) => {
    document.getElementById("layers-val").innerText = e.target.value;
    resetTelemetry(); buildEnvironment();
  });

  document.getElementById("ui-z-slider").addEventListener("input", (e) => {
    document.getElementById("z-val").innerText = e.target.value;
    resetTelemetry(); buildEnvironment();
  });

  document.getElementById("ui-rate-slider").addEventListener("input", (e) => {
    document.getElementById("rate-val").innerText = e.target.value;
  });

  document.getElementById("ui-speed-slider").addEventListener("input", (e) => {
    document.getElementById("speed-val").innerText = parseFloat(e.target.value).toFixed(1);
  });

  document.getElementById("ui-btn-reset").addEventListener("click", () => {
    alphas = []; deadImpacts = []; resetTelemetry();
  });

  let statsCard = document.getElementById("ui-panel-stats");
  document.getElementById("ui-stats-trigger").addEventListener("click", () => {
    statsCard.classList.toggle("is-expanded");
  });
}

function setupAppearanceEventListeners() {
  let trigger = document.getElementById("ui-dropdown-trigger");
  let container = document.getElementById("ui-dropdown-container");
  
  if (trigger && container) {
    trigger.addEventListener("click", (e) => { e.stopPropagation(); container.classList.toggle("is-active"); });
    document.addEventListener("click", () => { container.classList.remove("is-active"); });
    container.addEventListener("click", (e) => { e.stopPropagation(); });
  }

  document.getElementById("ui-theme-select").addEventListener("change", (e) => {
    document.documentElement.setAttribute("data-theme", e.target.value);
  });

  document.getElementById("ui-radius-electron").addEventListener("input", (e) => {
    document.getElementById("electron-radius-val").innerText = e.target.value + " px";
  });
}