let singleAtom;       
let foilAtoms = [];   
let alphas = [];
let deadImpacts = []; 

let currentMode = "atom";
let currentTrigger = "click"; 
let currentModel = "thomson"; 

let detectorRadius = 300; // Se recalcula en setup()/windowResized()
const OPENING_HALF_ANGLE_DEG = 20; // semiapertura del detector en grados

let statTotal = 0;
let statStraight = 0;
let statDeviated = 0;
let statRebound = 0;

// Histograma de distribución angular: 18 contenedores de 10° (0°–180°).
// Es el dato experimental clave del experimento de Geiger-Marsden.
let angleBins = new Array(18).fill(0);

let hasClickedInManualMode = false;
let isContinuousPlaying = false;

// Índice de la barra del histograma bajo el cursor (-1 = ninguna).
let histogramHoverBin = -1;

function setup() {
  // El canvas se ajusta al tamaño real de su contenedor para que nada quede
  // recortado (antes era fijo 870x686 y se cortaba en pantallas más bajas).
  let holder = document.getElementById("canvas-holder");
  let w = holder && holder.offsetWidth ? holder.offsetWidth : 870;
  let h = holder && holder.offsetHeight ? holder.offsetHeight : 686;
  let canvas = createCanvas(w, h);
  canvas.parent("canvas-holder");
  detectorRadius = Math.min(width, height) * 0.42;
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
  detectorRadius = Math.min(width, height) * 0.42;
  buildEnvironment();
}

function draw() {
  let tInput = document.getElementById("ui-theme-select");
  let themeMode = tInput ? tInput.value : "dark";
  
  background(themeMode === "light" ? [248, 250, 252] : [11, 12, 16]);
  
  // Geometría del detector circular (apertura en el lado izquierdo, ángulo PI)
  let openAngleRad = OPENING_HALF_ANGLE_DEG * (PI / 180.0);
  let openHH = detectorRadius * Math.sin(openAngleRad);
  let openX = width / 2 - detectorRadius; // borde izquierdo de la apertura

  // Arco detector — cubre todo menos la apertura izquierda (PI ± openAngleRad)
  stroke(themeMode === "light" ? color(150, 170, 200) : color(50, 70, 110));
  strokeWeight(2.5);
  noFill();
  arc(width / 2, height / 2, detectorRadius * 2, detectorRadius * 2,
      PI + openAngleRad, PI * 3 - openAngleRad, OPEN);

  // Etiqueta del detector en la parte superior del arco
  noStroke();
  textSize(10);
  textAlign(CENTER, BOTTOM);
  fill(themeMode === "light" ? color(100, 116, 139) : color(100, 116, 139, 200));
  text("Detector de Geiger-Marsden", width / 2, height / 2 - detectorRadius - 5);

  // Zona de lanzamiento (apertura izquierda) en modo manual
  if (currentTrigger === "click") {
    noStroke();
    fill(0, 160, 255, themeMode === "light" ? 14 : 20);
    rect(0, height / 2 - openHH, openX + 25, openHH * 2, 4);
    stroke(0, 160, 255, themeMode === "light" ? 40 : 55);
    strokeWeight(1);
    for (let y = height / 2 - openHH; y < height / 2 + openHH; y += 10) {
      line(openX, y, openX, y + 5);
    }
  }

  // Fuente radiactiva: las partículas emergen de su colimador en ambos modos.
  drawEmitter(themeMode, openX, openHH);

  if (currentTrigger === "continuous" && isContinuousPlaying) {
    let rSlider = document.getElementById("ui-rate-slider");
    let rate = rSlider ? parseInt(rSlider.value) : 20;
    if (random(0, 1) < (rate / 60.0)) {
      let openHHc = detectorRadius * Math.sin(OPENING_HALF_ANGLE_DEG * Math.PI / 180.0);
      let spawnY = random(height / 2 - openHHc, height / 2 + openHHc);
      let sSlider = document.getElementById("ui-speed-slider");
      let v0 = sSlider ? parseFloat(sSlider.value) : 10.0;
      alphas.push(new AlphaParticle(width / 2 - detectorRadius, spawnY, v0, 0));
      statTotal++;
    }
  }

  if (currentMode === "atom") {
    if (singleAtom) {
      singleAtom.updateElectrons();
      singleAtom.display();
      drawAtomLabel(themeMode, singleAtom);
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

    let adx = a.pos.x - width / 2, ady = a.pos.y - height / 2;
    let adist = Math.sqrt(adx * adx + ady * ady);

    if (!a.hasEnteredDetector && adist < detectorRadius * 0.85) {
      a.hasEnteredDetector = true;
    }

    if (!a.isDead && a.hasEnteredDetector && adist >= detectorRadius) {
      a.isDead = true;
      let ux = adx / adist, uy = ady / adist;
      deadImpacts.push({ x: width / 2 + ux * detectorRadius, y: height / 2 + uy * detectorRadius, color: a.particleColor });
      if (!a.hasBeenCounted) {
        a.hasBeenCounted = true;
        recordScattering(a.deviationAngle);
      }
      if (deadImpacts.length > 40) deadImpacts.shift();
      alphas.splice(i, 1);
      continue;
    }

    if (adist > detectorRadius * 1.5) {
      alphas.splice(i, 1);
    }
  }

}

// Nombres de elementos más comunes (Z 1–36 + algunos relevantes).
const ELEMENT_NAMES = {
  1:"H", 2:"He", 3:"Li", 4:"Be", 5:"B", 6:"C", 7:"N", 8:"O", 9:"F", 10:"Ne",
  11:"Na", 12:"Mg", 13:"Al", 14:"Si", 15:"P", 16:"S", 17:"Cl", 18:"Ar",
  19:"K", 20:"Ca", 26:"Fe", 27:"Co", 28:"Ni", 29:"Cu", 30:"Zn",
  47:"Ag", 50:"Sn", 79:"Au", 82:"Pb", 92:"U"
};

// Anotación didáctica superpuesta al átomo en modo átomo aislado.
// Muestra el símbolo del elemento (si está en la tabla) o Z, el modelo y una
// flecha punteada que conecta la etiqueta con el átomo para que el alumno
// identifique inmediatamente de qué se trata.
function drawAtomLabel(themeMode, atom) {
  let cx = atom.pos.x;
  let cy = atom.pos.y;
  let edgeY = cy - atom.R - 8;
  let labelY = edgeY - 22;
  let sym = ELEMENT_NAMES[atom.Z] ? ELEMENT_NAMES[atom.Z] : "Z=" + atom.Z;
  let modelName = atom.model === "rutherford" ? "Rutherford" : "Thomson";
  let labelText = "Átomo de " + sym + "  ·  Modelo " + modelName;

  push();
  textSize(11.5);
  textStyle(NORMAL);
  let tw = textWidth(labelText);
  let padX = 10, padY = 6;
  let boxW = tw + padX * 2;
  let boxH = 20;
  let boxX = cx - boxW / 2;
  let boxY = labelY - boxH / 2;

  // Línea de puntero (dashes via drawingContext)
  drawingContext.save();
  drawingContext.setLineDash([4, 4]);
  stroke(themeMode === "light" ? color(100, 116, 139, 160) : color(148, 163, 184, 140));
  strokeWeight(1);
  line(cx, boxY + boxH, cx, edgeY);
  drawingContext.restore();

  // Cuerpo de la etiqueta
  noStroke();
  fill(themeMode === "light" ? color(255, 255, 255, 230) : color(22, 26, 42, 230));
  rect(boxX, boxY, boxW, boxH, 5);
  stroke(themeMode === "light" ? color(203, 213, 225) : color(55, 65, 95));
  strokeWeight(1);
  noFill();
  rect(boxX, boxY, boxW, boxH, 5);

  // Texto
  noStroke();
  fill(themeMode === "light" ? color(30, 41, 59) : color(203, 213, 225));
  textAlign(CENTER, CENTER);
  text(labelText, cx, labelY);

  pop();
}

// Fuente radiactiva de partículas α: blindaje de plomo + colimador, situada a la
// izquierda de la apertura del detector. Las partículas emergen de su ranura, lo que
// evita que aparezcan "de la nada" en mitad del canvas. La ranura se alinea con el haz.
function drawEmitter(themeMode, openX, openHH) {
  let cy = height / 2;
  let nozzleW = 7;
  let bodyW = 26;
  let bodyH = openHH * 2 + 18;
  let nozzleX = openX - nozzleW;
  let bodyX = nozzleX - bodyW;

  push();
  noStroke();

  // Cuerpo (blindaje)
  fill(themeMode === "light" ? color(100, 116, 139) : color(60, 70, 95));
  rect(bodyX, cy - bodyH / 2, bodyW, bodyH, 4);
  // Rebordes para dar volumen
  fill(themeMode === "light" ? color(71, 85, 105) : color(40, 48, 68));
  rect(bodyX, cy - bodyH / 2, bodyW, 4, 4, 4, 0, 0);
  rect(bodyX, cy + bodyH / 2 - 4, bodyW, 4, 0, 0, 4, 4);

  // Colimador (ranura de salida alineada con el haz)
  fill(themeMode === "light" ? color(148, 163, 184) : color(90, 100, 130));
  rect(nozzleX, cy - openHH, nozzleW, openHH * 2);

  // Símbolo "α"
  fill(themeMode === "light" ? color(248, 250, 252) : color(226, 232, 240));
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(13);
  text("α", bodyX + bodyW / 2, cy);

  // Etiqueta
  fill(themeMode === "light" ? color(100, 116, 139) : color(130, 140, 165));
  textStyle(NORMAL);
  textSize(9);
  textAlign(CENTER, TOP);
  text("Fuente α", bodyX + bodyW / 2, cy + bodyH / 2 + 4);

  pop();
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

  // Resalte de la barra bajo el cursor
  if (histogramHoverBin >= 0 && histogramHoverBin < nBins) {
    let i = histogramHoverBin;
    let h = Math.max((angleBins[i] / maxBin) * ah, 2);
    let bx = ax + i * barW;
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.85)" : "rgba(15,23,42,0.85)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 1, ay + ah - h, barW - 2, h);
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
  let openHHm = detectorRadius * Math.sin(OPENING_HALF_ANGLE_DEG * Math.PI / 180.0);
  let clickX = width / 2 - detectorRadius;
  if (currentTrigger === "click" && mouseX >= 0 && mouseX <= clickX + 30 &&
      mouseY >= height / 2 - openHHm && mouseY <= height / 2 + openHHm) {
    if (!hasClickedInManualMode) {
      hasClickedInManualMode = true;
      updateManualHintVisibility();
    }
    let sSlider = document.getElementById("ui-speed-slider");
    let v0 = sSlider ? parseFloat(sSlider.value) : 10.0;
    alphas.push(new AlphaParticle(clickX, mouseY, v0, 0));
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
  let startX = (width / 2) - (totalFoilWidth / 2);

  // La lámina se centra verticalmente y se limita a una altura menor que el radio
  // del detector, de modo que no se solape con el arco (las "paredes") del detector.
  let foilHalfHeight = detectorRadius * 0.6;
  let numFilas = Math.max(1, Math.floor((foilHalfHeight * 2) / atomDiameter));
  let usedHeight = (numFilas - 1) * atomDiameter;
  let startY = (height / 2) - (usedHeight / 2);

  for (let col = 0; col < numColumnas; col++) {
    let x = startX + col * atomDiameter;
    for (let fila = 0; fila < numFilas; fila++) {
      let y = startY + fila * atomDiameter;
      foilAtoms.push(new ThomsonTarget(x, y, atomRadius, z, true, currentModel, 0.6));
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

  // Tooltip del histograma: muestra recuento y porcentaje de la barra bajo el cursor.
  let hCanvas = document.getElementById("histogram-canvas");
  let tooltip = document.getElementById("histogram-tooltip");
  if (hCanvas && tooltip) {
    hCanvas.style.cursor = "crosshair";
    hCanvas.addEventListener("mousemove", (e) => {
      let rect = hCanvas.getBoundingClientRect();
      let mx = (e.clientX - rect.left) * (hCanvas.width / rect.width);
      let padL = 8, padR = 8;
      let aw = hCanvas.width - padL - padR;
      let nBins = angleBins.length;
      let barW = aw / nBins;
      let b = Math.floor((mx - padL) / barW);

      if (mx >= padL && mx <= padL + aw && b >= 0 && b < nBins) {
        if (b !== histogramHoverBin) { histogramHoverBin = b; updateSidebarHistogram(); }
        let lo = Math.round(b * 180 / nBins);
        let hi = Math.round((b + 1) * 180 / nBins);
        let count = angleBins[b];
        let pct = statTotal > 0 ? (count / statTotal * 100) : 0;
        tooltip.innerHTML = "<strong>" + lo + "°–" + hi + "°</strong>" +
          "<br>" + count + " / " + statTotal +
          "<br><span class='tt-pct'>" + pct.toFixed(1) + "%</span>";
        tooltip.style.display = "block";
        let tw = tooltip.offsetWidth;
        let left = e.clientX + 14;
        if (left + tw > window.innerWidth - 8) left = e.clientX - tw - 14;
        tooltip.style.left = left + "px";
        tooltip.style.top = (e.clientY - 12) + "px";
      } else {
        if (histogramHoverBin !== -1) { histogramHoverBin = -1; updateSidebarHistogram(); }
        tooltip.style.display = "none";
      }
    });
    hCanvas.addEventListener("mouseleave", () => {
      if (histogramHoverBin !== -1) { histogramHoverBin = -1; updateSidebarHistogram(); }
      tooltip.style.display = "none";
    });
  }
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