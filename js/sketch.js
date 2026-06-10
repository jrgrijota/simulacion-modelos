let singleAtom;       
let foilAtoms = [];   
let alphas = [];
let deadImpacts = []; 

let currentMode = "atom";
let currentTrigger = "click"; 
let currentModel = "thomson"; 

let detectorX = 780; // Se recalcula al tamaño real del canvas en setup()/windowResized()
let spawnX = 25;

let statTotal = 0;
let statStraight = 0;
let statDeviated = 0;
let statRebound = 0;

// Histograma de distribución angular: 18 contenedores de 10° (0°–180°).
// Es el dato experimental clave del experimento de Geiger-Marsden.
let angleBins = new Array(18).fill(0);
let showHistogram = true;

let hasClickedInManualMode = false;
let isContinuousPlaying = false;

function setup() {
  // El canvas se ajusta al tamaño real de su contenedor para que nada quede
  // recortado (antes era fijo 870x686 y se cortaba en pantallas más bajas).
  let holder = document.getElementById("canvas-holder");
  let w = holder && holder.offsetWidth ? holder.offsetWidth : 870;
  let h = holder && holder.offsetHeight ? holder.offsetHeight : 686;
  let canvas = createCanvas(w, h);
  canvas.parent("canvas-holder");
  detectorX = width - 90;

  setupAppearanceEventListeners();
  setupUIEventListeners();
  buildEnvironment();
  updateManualHintVisibility();
}

// Reajusta el canvas y reconstruye el escenario cuando cambia el tamaño de la ventana.
function windowResized() {
  let holder = document.getElementById("canvas-holder");
  if (!holder) return;
  resizeCanvas(holder.offsetWidth, holder.offsetHeight);
  detectorX = width - 90;
  buildEnvironment();
}

function draw() {
  let tInput = document.getElementById("ui-theme-select");
  let themeMode = tInput ? tInput.value : "dark";
  
  background(themeMode === "light" ? [248, 250, 252] : [11, 12, 16]);
  
  if (currentTrigger === "click") {
    noStroke();
    fill(0, 160, 255, themeMode === "light" ? 14 : 20); 
    rect(0, 0, spawnX + 15, height);
    stroke(0, 160, 255, themeMode === "light" ? 40 : 55);
    strokeWeight(1);
    for (let y = 0; y < height; y += 10) line(spawnX + 15, y, spawnX + 15, y + 5);
  }

  stroke(themeMode === "light" ? color(203, 213, 225) : color(30, 41, 59));
  strokeWeight(4);
  line(detectorX, 0, detectorX, height);

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
    if (singleAtom) {
      singleAtom.updateElectrons();
      singleAtom.display();
    }
  } else {
    for (let target of foilAtoms) {
      target.updateElectrons();
      target.display();
    }
  }

  for (let imp of deadImpacts) {
    fill(red(imp.color), green(imp.color), blue(imp.color), themeMode === "light" ? 210 : 180);
    ellipse(imp.x, imp.y, 5, 5);
  }

  // OPTIMIZACIÓN: Bucle principal de físicas procesado con matemáticas primitivas y Culling de 2 Radios
  for (let i = alphas.length - 1; i >= 0; i--) {
    let a = alphas[i];
    let targetAtom = null;

    if (currentMode === "atom") {
      targetAtom = singleAtom;
    } else {
      let minDistSq = Infinity;
      let candidate = null;
      let multipleCandidates = false;
      
      // Búsqueda del vecino más cercano utilizando la distancia al cuadrado (Ahorro de Math.sqrt)
      for (let target of foilAtoms) {
        let dx = a.pos.x - target.pos.x;
        let dy = a.pos.y - target.pos.y;
        let dSq = dx * dx + dy * dy;
        
        if (dSq < minDistSq) {
          minDistSq = dSq;
          candidate = target;
          multipleCandidates = false;
        } else if (abs(dSq - minDistSq) < 0.0001) {
          multipleCandidates = true;
        }
      }
      
      if (!multipleCandidates && candidate) {
        // CULLING ESPACIAL: Ignorar si está a más de 2 radios de distancia del centro
        let radioCorte = candidate.R * 2.0;
        if (minDistSq <= (radioCorte * radioCorte)) {
          targetAtom = candidate;
        }
      }
    }

    a.integrate(1.0, targetAtom);
    a.display();

    if (!a.isDead && a.pos.x >= detectorX) {
      a.isDead = true;
      a.pos.x = detectorX; 
      deadImpacts.push({ x: a.pos.x, y: a.pos.y, color: a.particleColor });
      
      if (!a.hasBeenCounted) {
        a.hasBeenCounted = true;
        recordScattering(a.deviationAngle);
      }
      if (deadImpacts.length > 40) deadImpacts.shift(); 
      alphas.splice(i, 1);
      continue;
    }

    if (a.pos.x < -10 || a.pos.y < -50 || a.pos.y > height + 50) {
      if (a.pos.x < -10 && !a.hasBeenCounted) {
        a.hasBeenCounted = true;
        recordScattering(a.deviationAngle);
      }
      alphas.splice(i, 1);
    }
  }

  drawHistogram(themeMode);
}

// Clasifica un proyectil ya detectado: actualiza estadísticas y el histograma angular.
function recordScattering(angleDeg) {
  if (angleDeg < 1.0) statStraight++;
  else if (angleDeg <= 90.0) statDeviated++;
  else statRebound++;

  let binWidth = 180.0 / angleBins.length;
  let bin = Math.floor(angleDeg / binWidth);
  if (bin < 0) bin = 0;
  if (bin >= angleBins.length) bin = angleBins.length - 1;
  angleBins[bin]++;

  updateTelemetryUI();
}

// Histograma de distribución angular superpuesto en el canvas (esquina inferior izquierda).
// Reproduce el gráfico experimental de Geiger-Marsden: número de impactos frente al ángulo de dispersión.
function drawHistogram(themeMode) {
  if (!showHistogram) return;

  let panelW = 300, panelH = 140;
  let px = 16, py = height - panelH - 16;

  push();

  // Tarjeta de fondo
  noStroke();
  fill(themeMode === "light" ? color(255, 255, 255, 225) : color(20, 22, 32, 210));
  rect(px, py, panelW, panelH, 8);
  noFill();
  stroke(themeMode === "light" ? color(203, 213, 225) : color(60, 66, 90));
  strokeWeight(1);
  rect(px, py, panelW, panelH, 8);

  // Título
  noStroke();
  fill(themeMode === "light" ? color(71, 85, 105) : color(148, 163, 184));
  textSize(11);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text("DISTRIBUCIÓN ANGULAR DE DISPERSIÓN", px + 12, py + 9);

  // Geometría del área de barras
  let padL = 12, padR = 12, padTop = 28, padBot = 20;
  let ax = px + padL;
  let ay = py + padTop;
  let aw = panelW - padL - padR;
  let ah = panelH - padTop - padBot;
  let nBins = angleBins.length;
  let barW = aw / nBins;

  let maxBin = 1;
  for (let c of angleBins) if (c > maxBin) maxBin = c;

  // Eje base
  stroke(themeMode === "light" ? color(148, 163, 184) : color(80, 88, 110));
  strokeWeight(1);
  line(ax, ay + ah, ax + aw, ay + ah);

  // Barras coloreadas por categoría (mismo código de color que los datos estadísticos)
  noStroke();
  for (let i = 0; i < nBins; i++) {
    let angleMid = (i + 0.5) * (180.0 / nBins);
    let h = (angleBins[i] / maxBin) * ah;
    if (i === 0) fill(0, 255, 0);                 // Haz directo / ángulos pequeños
    else if (angleMid <= 90.0) fill(255, 176, 0); // Dispersados
    else fill(255, 51, 51);                        // Retrodispersión
    let bx = ax + i * barW;
    rect(bx + 1, ay + ah - h, barW - 2, h, 2);
  }

  // Etiquetas del eje angular
  fill(themeMode === "light" ? color(100, 116, 139) : color(120, 130, 155));
  textSize(9);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  text("0°", ax, ay + ah + 4);
  textAlign(CENTER, TOP);
  text("90°", ax + aw / 2, ay + ah + 4);
  textAlign(RIGHT, TOP);
  text("180°", ax + aw, ay + ah + 4);

  pop();
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
  statTotal = 0; statStraight = 0; statDeviated = 0; statRebound = 0;
  angleBins.fill(0);
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
    let playSpan = playPauseBtn.querySelector("span");
    if(playSpan) playSpan.innerText = "Play";
    playPauseBtn.className = "is-paused";
    updateManualHintVisibility();
    alphas = []; deadImpacts = []; resetTelemetry();
  });
  let playPauseBtn = document.getElementById("ui-btn-playpause");
  playPauseBtn.addEventListener("click", () => {
    isContinuousPlaying = !isContinuousPlaying;
    let btnText = playPauseBtn.querySelector("span");
    if (btnText) btnText.innerText = isContinuousPlaying ? "Pausa" : "Play";
    playPauseBtn.className = isContinuousPlaying ? "" : "is-paused";
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
  }
  document.getElementById("ui-theme-select").addEventListener("change", (e) => {
    document.documentElement.setAttribute("data-theme", e.target.value);
  });
  document.getElementById("ui-radius-electron").addEventListener("input", (e) => {
    document.getElementById("electron-radius-val").innerText = e.target.value + " px";
  });
  let histToggle = document.getElementById("ui-toggle-histogram");
  if (histToggle) {
    histToggle.addEventListener("change", (e) => { showHistogram = e.target.checked; });
  }
}