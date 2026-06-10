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

  updateSidebarHistogram();
}

function updateSidebarHistogram() {
  let hCanvas = document.getElementById("histogram-canvas");
  if (!hCanvas) return;

  let tInput = document.getElementById("ui-theme-select");
  let dark = !tInput || tInput.value !== "light";

  let W = hCanvas.offsetWidth || 240;
  hCanvas.width = W;
  let H = hCanvas.height;

  let ctx = hCanvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  let padL = 8, padR = 8, padTop = 20, padBot = 18;
  let aw = W - padL - padR;
  let ah = H - padTop - padBot;
  let ax = padL, ay = padTop;
  let nBins = angleBins.length;
  let barW = aw / nBins;

  let maxBin = 1;
  for (let c of angleBins) if (c > maxBin) maxBin = c;

  // Encabezado: título y contador total
  ctx.font = "bold 10px sans-serif";
  ctx.fillStyle = dark ? "rgba(148,163,184,1)" : "rgba(71,85,105,1)";
  ctx.textAlign = "left";
  ctx.fillText("ÁNGULO DE DISPERSIÓN", ax, 14);
  ctx.font = "10px monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = dark ? "rgba(100,120,160,1)" : "rgba(100,116,139,1)";
  ctx.fillText("n=" + statTotal, W - padR, 14);

  // Eje base
  ctx.strokeStyle = dark ? "rgba(80,88,110,1)" : "rgba(148,163,184,1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ax, ay + ah);
  ctx.lineTo(ax + aw, ay + ah);
  ctx.stroke();

  // Barras
  for (let i = 0; i < nBins; i++) {
    let angleMid = (i + 0.5) * (180.0 / nBins);
    let h = (angleBins[i] / maxBin) * ah;
    if (i === 0) ctx.fillStyle = "#00ff00";
    else if (angleMid <= 90.0) ctx.fillStyle = "#ffb000";
    else ctx.fillStyle = "#ff3333";
    let bx = ax + i * barW;
    if (h > 0) {
      ctx.beginPath();
      ctx.roundRect(bx + 1, ay + ah - h, barW - 2, h, 2);
      ctx.fill();
    }
  }

  // Etiquetas eje X
  ctx.font = "9px sans-serif";
  ctx.fillStyle = dark ? "rgba(120,130,155,1)" : "rgba(100,116,139,1)";
  ctx.textAlign = "left";
  ctx.fillText("0°", ax, ay + ah + 13);
  ctx.textAlign = "center";
  ctx.fillText("90°", ax + aw / 2, ay + ah + 13);
  ctx.textAlign = "right";
  ctx.fillText("180°", ax + aw, ay + ah + 13);
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
    updateSidebarHistogram();
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

function resetTelemetry() {
  statTotal = 0; statStraight = 0; statDeviated = 0; statRebound = 0;
  angleBins.fill(0);
  updateSidebarHistogram();
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
  let histCard = document.getElementById("ui-panel-histogram");
  document.getElementById("ui-histogram-trigger").addEventListener("click", () => {
    histCard.classList.toggle("is-expanded");
    updateSidebarHistogram();
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
    updateSidebarHistogram();
  });
  document.getElementById("ui-radius-electron").addEventListener("input", (e) => {
    document.getElementById("electron-radius-val").innerText = e.target.value + " px";
  });
}