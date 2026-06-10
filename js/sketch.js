let singleAtom;       
let foilAtoms = [];   
let alphas = [];
let deadImpacts = []; 

let currentMode = "atom";
let currentTrigger = "click"; 
let currentModel = "thomson"; 

let detectorRadius = 300; // Se recalcula en setup()/windowResized()

// El radio del detector se maximiza dejando margen para el emisor (izq) y el borde (resto).
// Apertura del detector = altura completa del emisor (partículas salen a cualquier altura).
const EMITTER_H_FRAC = 0.80; // altura del emisor como fracción del canvas

function computeDetectorRadius() {
  let emitterBodyH = height * EMITTER_H_FRAC;
  let bodyW = Math.round(emitterBodyH * 0.10);
  return Math.min(height / 2 - 6, width / 2 - bodyW - 10);
}

function getOpenHH() {
  return height * EMITTER_H_FRAC / 2; // = height × 0.40 — coincide con la mitad del emisor
}

// Trayectorias persistentes: se guardan al morir cada partícula alfa (solo modo átomo).
let savedTrails = [];

// Caché centralizado de valores de UI leídos desde el DOM.
// Se reconstruye en setup() y cada vez que un control de color/radio cambia.
// Elimina cientos de getElementById() por frame en display() e integrate().
const uiCache = {
  theme: "dark",
  protonColor: null, neutronColor: null, electronColor: null,
  electronRadius: 2.0,
  protonR: 255, protonG: 60, protonB: 60,
};

function refreshColorCache() {
  let el;
  el = document.getElementById("ui-color-proton");
  if (el) {
    uiCache.protonColor = color(el.value);
    uiCache.protonR = red(uiCache.protonColor);
    uiCache.protonG = green(uiCache.protonColor);
    uiCache.protonB = blue(uiCache.protonColor);
  }
  el = document.getElementById("ui-color-neutron");   if (el) uiCache.neutronColor  = color(el.value);
  el = document.getElementById("ui-color-electron");  if (el) uiCache.electronColor = color(el.value);
  el = document.getElementById("ui-radius-electron"); if (el) uiCache.electronRadius = parseFloat(el.value);
}

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
  detectorRadius = computeDetectorRadius();
  setupAppearanceEventListeners();
  setupUIEventListeners();
  refreshColorCache();
  buildEnvironment();
}

// Reajusta el canvas y reconstruye el escenario cuando cambia el tamaño de la ventana.
function windowResized() {
  let holder = document.getElementById("canvas-holder");
  if (!holder) return;
  resizeCanvas(holder.offsetWidth, holder.offsetHeight);
  detectorRadius = computeDetectorRadius();
  buildEnvironment();
}

function draw() {
  let themeMode = uiCache.theme;
  
  background(themeMode === "light" ? [248, 250, 252] : [11, 12, 16]);
  
  // Geometría del detector circular — apertura izquierda alineada con la ranura del emisor
  let openHH = getOpenHH();
  let openAngleRad = Math.asin(constrain(openHH / detectorRadius, 0, 0.9999));
  let openX = width / 2 - detectorRadius; // borde izquierdo de la apertura

  // Arco detector — cubre todo menos la apertura izquierda (PI ± openAngleRad)
  stroke(themeMode === "light" ? color(150, 170, 200) : color(50, 70, 110));
  strokeWeight(2.5);
  noFill();
  arc(width / 2, height / 2, detectorRadius * 2, detectorRadius * 2,
      PI + openAngleRad, PI * 3 - openAngleRad, OPEN);
  drawDetectorLabel(themeMode);

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
  if (currentTrigger === "click" && !hasClickedInManualMode) drawClickHint(themeMode, openX, openHH);
  drawEmitter(themeMode, openX, openHH);

  if (currentTrigger === "continuous" && isContinuousPlaying) {
    let rSlider = document.getElementById("ui-rate-slider");
    let rate = rSlider ? parseInt(rSlider.value) : 20;
    if (random(0, 1) < (rate / 60.0)) {
      let spawnY = random(height / 2 - openHH, height / 2 + openHH);
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

  // Trayectorias persistentes de partículas ya detectadas (solo modo átomo)
  drawSavedTrails();

  for (let imp of deadImpacts) {
    fill(imp.r, imp.g, imp.b, themeMode === "light" ? 210 : 180);
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

      // Comprobar si la salida es por la apertura (zona sin detector).
      // La apertura está centrada en el ángulo PI y abarca ±openAngleRad.
      let exitAngle = Math.atan2(ady, adx); // rango (-PI, PI]
      let inAperture = Math.abs(exitAngle) > (Math.PI - openAngleRad);

      if (!inAperture) {
        // Partícula detectada: impacto en color de los protones + recuento
        deadImpacts.push({ x: width / 2 + ux * detectorRadius, y: height / 2 + uy * detectorRadius, r: uiCache.protonR, g: uiCache.protonG, b: uiCache.protonB });
        if (deadImpacts.length > 40) deadImpacts.shift();
        if (!a.hasBeenCounted) {
          a.hasBeenCounted = true;
          recordScattering(a.deviationAngle);
        }
      }
      // El trail se guarda siempre en modo átomo, tanto si fue detectada como si salió por la apertura
      if (currentMode === "atom" && a.history.length > 1) {
        savedTrails.push({ points: [...a.history, { x: a.pos.x, y: a.pos.y }], framesLeft: 300, r: uiCache.protonR, g: uiCache.protonG, b: uiCache.protonB });
        if (savedTrails.length > 6) savedTrails.shift();
      }
      alphas.splice(i, 1);
      continue;
    }

    if (adist > detectorRadius * 1.5) {
      alphas.splice(i, 1);
    }
  }

}

// Tabla completa de elementos Z 1–118 en español.
const ELEMENT_NAMES = {
  1:"Hidrógeno",2:"Helio",3:"Litio",4:"Berilio",5:"Boro",6:"Carbono",7:"Nitrógeno",
  8:"Oxígeno",9:"Flúor",10:"Neón",11:"Sodio",12:"Magnesio",13:"Aluminio",14:"Silicio",
  15:"Fósforo",16:"Azufre",17:"Cloro",18:"Argón",19:"Potasio",20:"Calcio",
  21:"Escandio",22:"Titanio",23:"Vanadio",24:"Cromo",25:"Manganeso",26:"Hierro",
  27:"Cobalto",28:"Níquel",29:"Cobre",30:"Zinc",31:"Galio",32:"Germanio",
  33:"Arsénico",34:"Selenio",35:"Bromo",36:"Criptón",37:"Rubidio",38:"Estroncio",
  39:"Itrio",40:"Circonio",41:"Niobio",42:"Molibdeno",43:"Tecnecio",44:"Rutenio",
  45:"Rodio",46:"Paladio",47:"Plata",48:"Cadmio",49:"Indio",50:"Estaño",
  51:"Antimonio",52:"Teluro",53:"Yodo",54:"Xenón",55:"Cesio",56:"Bario",
  57:"Lantano",58:"Cerio",59:"Praseodimio",60:"Neodimio",61:"Prometio",62:"Samario",
  63:"Europio",64:"Gadolinio",65:"Terbio",66:"Disprosio",67:"Holmio",68:"Erbio",
  69:"Tulio",70:"Iterbio",71:"Lutecio",72:"Hafnio",73:"Tántalo",74:"Wolframio",
  75:"Renio",76:"Osmio",77:"Iridio",78:"Platino",79:"Oro",80:"Mercurio",
  81:"Talio",82:"Plomo",83:"Bismuto",84:"Polonio",85:"Ástato",86:"Radón",
  87:"Francio",88:"Radio",89:"Actinio",90:"Torio",91:"Protactinio",92:"Uranio",
  93:"Neptunio",94:"Plutonio",95:"Americio",96:"Curio",97:"Berkelio",98:"Californio",
  99:"Einstenio",100:"Fermio",101:"Mendelevio",102:"Nobelio",103:"Laurencio",
  104:"Rutherfordio",105:"Dubnio",106:"Seaborgio",107:"Bohrio",108:"Hasio",
  109:"Meitnerio",110:"Darmstadtio",111:"Roentgenio",112:"Copernicio",113:"Nihonio",
  114:"Flerovio",115:"Moscovio",116:"Livermorio",117:"Teneso",118:"Oganesón"
};

// Etiqueta del átomo en la esquina superior derecha del canvas.
// Una línea punteada diagonal señala desde la caja hasta el borde del átomo.
// Etiqueta "Detector" en la esquina inferior derecha, con línea punteada al arco.
function drawDetectorLabel(themeMode) {
  let labelText = "Detector";
  push();
  textSize(11.5);
  textStyle(NORMAL);
  let tw = textWidth(labelText);
  let padX = 10;
  let boxW = tw + padX * 2;
  let boxH = 20;
  let boxX = width - boxW - 14;
  let boxY = height - boxH - 14;
  let labelX = boxX + boxW / 2;
  let labelY = boxY + boxH / 2;

  // Línea punteada desde la caja hasta el arco del detector (esquina inferior derecha)
  let arcAngle = PI * 0.25; // ~45° en el cuadrante inferior derecho del arco
  let arcPx = width / 2 + detectorRadius * Math.cos(arcAngle);
  let arcPy = height / 2 + detectorRadius * Math.sin(arcAngle);
  drawingContext.save();
  drawingContext.setLineDash([4, 4]);
  stroke(themeMode === "light" ? color(100, 116, 139, 160) : color(148, 163, 184, 140));
  strokeWeight(1);
  line(labelX, boxY, arcPx, arcPy);
  drawingContext.restore();

  noStroke();
  fill(themeMode === "light" ? color(255, 255, 255, 230) : color(22, 26, 42, 230));
  rect(boxX, boxY, boxW, boxH, 5);
  stroke(themeMode === "light" ? color(203, 213, 225) : color(55, 65, 95));
  strokeWeight(1);
  noFill();
  rect(boxX, boxY, boxW, boxH, 5);

  noStroke();
  fill(themeMode === "light" ? color(30, 41, 59) : color(203, 213, 225));
  textAlign(CENTER, CENTER);
  text(labelText, labelX, labelY);
  pop();
}

function drawAtomLabel(themeMode, atom) {
  let nombre = ELEMENT_NAMES[atom.Z] ? ELEMENT_NAMES[atom.Z] : "Z=" + atom.Z;
  let labelText = "Átomo de " + nombre;

  push();
  textSize(11.5);
  textStyle(NORMAL);
  let tw = textWidth(labelText);
  let padX = 10;
  let boxW = tw + padX * 2;
  let boxH = 20;
  let boxX = width - boxW - 14;
  let boxY = 14;
  let labelX = boxX + boxW / 2;
  let labelY = boxY + boxH / 2;

  // Línea diagonal desde la caja hasta el borde externo del átomo.
  // En Rutherford llega hasta la última órbita electrónica; en Thomson hasta el borde de la esfera.
  let lineX1 = labelX;
  let lineY1 = boxY + boxH;
  let dx = atom.pos.x - lineX1;
  let dy = atom.pos.y - lineY1;
  let dist = Math.sqrt(dx * dx + dy * dy);
  let edgeR = atom.R;
  if (atom.model === "rutherford") {
    let orbits = atom.getOrbitRadii();
    if (orbits.length > 0) edgeR = Math.max(...orbits);
  }
  let lineX2 = dist > 0 ? atom.pos.x - (dx / dist) * (edgeR + 4) : lineX1;
  let lineY2 = dist > 0 ? atom.pos.y - (dy / dist) * (edgeR + 4) : lineY1 + 20;

  drawingContext.save();
  drawingContext.setLineDash([4, 4]);
  stroke(themeMode === "light" ? color(100, 116, 139, 160) : color(148, 163, 184, 140));
  strokeWeight(1);
  line(lineX1, lineY1, lineX2, lineY2);
  drawingContext.restore();

  noStroke();
  fill(themeMode === "light" ? color(255, 255, 255, 230) : color(22, 26, 42, 230));
  rect(boxX, boxY, boxW, boxH, 5);
  stroke(themeMode === "light" ? color(203, 213, 225) : color(55, 65, 95));
  strokeWeight(1);
  noFill();
  rect(boxX, boxY, boxW, boxH, 5);

  noStroke();
  fill(themeMode === "light" ? color(30, 41, 59) : color(203, 213, 225));
  textAlign(CENTER, CENTER);
  text(labelText, labelX, labelY);

  pop();
}

// Pista de disparo individual: callout con flecha izquierda posicionado justo dentro
// del arco del detector, apuntando hacia la apertura del emisor.
function drawClickHint(themeMode, openX, openHH) {
  let notch = 12;    // profundidad de la flecha izquierda
  let boxW = 132;
  let boxH = 88;
  let boxX = openX + 10;
  let boxY = height / 2 - boxH / 2;
  let cx   = boxX + notch + (boxW - notch) / 2;

  push();
  // Callout con flecha apuntando a la izquierda (hacia el emisor)
  fill(themeMode === "light" ? color(37, 99, 235, 218) : color(22, 38, 110, 235));
  stroke(themeMode === "light" ? color(29, 78, 216) : color(80, 120, 220));
  strokeWeight(1);
  beginShape();
  vertex(boxX + notch, boxY);
  vertex(boxX + boxW,  boxY);
  vertex(boxX + boxW,  boxY + boxH);
  vertex(boxX + notch, boxY + boxH);
  vertex(boxX + notch, boxY + boxH / 2 + 10);
  vertex(boxX,         boxY + boxH / 2);       // punta de la flecha
  vertex(boxX + notch, boxY + boxH / 2 - 10);
  endShape(CLOSE);

  fill(255);
  noStroke();
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(9);
  text("MODO INDIVIDUAL", cx, boxY + 8);

  stroke(255, 255, 255, 55);
  strokeWeight(0.5);
  line(boxX + notch + 4, boxY + 22, boxX + boxW - 6, boxY + 22);

  noStroke();
  fill(215, 228, 255);
  textStyle(NORMAL);
  textSize(9);
  text("Haz clic en cualquier", cx, boxY + 28);
  text("altura de esta zona.", cx, boxY + 41);
  text("Cada clic = 1 partícula α.", cx, boxY + 55);
  text("Observa su trayectoria.", cx, boxY + 69);

  pop();
}

// Fuente radiactiva de partículas α: bloque de blindaje de plomo.
// La apertura cubre toda la cara derecha (apertura = altura del emisor).
// No hay jaws de colimador: las partículas pueden salir a cualquier altura.
function drawEmitter(themeMode, openX, openHH) {
  let cy = height / 2;
  let bodyH = height * EMITTER_H_FRAC;
  let bodyW = Math.round(bodyH * 0.10);
  let bodyX = openX - bodyW;

  push();
  noStroke();

  // Cuerpo principal del blindaje
  fill(themeMode === "light" ? color(100, 116, 139) : color(60, 70, 95));
  rect(bodyX, cy - bodyH / 2, bodyW, bodyH, 4, 0, 0, 4);

  // Rebordes superior e inferior (efecto de volumen)
  fill(themeMode === "light" ? color(71, 85, 105) : color(40, 48, 68));
  rect(bodyX, cy - bodyH / 2, bodyW, 7, 4, 0, 0, 0);
  rect(bodyX, cy + bodyH / 2 - 7, bodyW, 7, 0, 0, 0, 4);

  // Franja de emisión en la cara derecha (indica la superficie activa)
  fill(themeMode === "light" ? color(148, 163, 184, 160) : color(100, 120, 170, 160));
  rect(bodyX + bodyW - 5, cy - bodyH / 2 + 7, 5, bodyH - 14);

  // Símbolo α centrado (parte superior del cuerpo)
  fill(themeMode === "light" ? color(248, 250, 252) : color(226, 232, 240));
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(constrain(Math.round(bodyW * 0.55), 12, 40));
  text("α", bodyX + bodyW / 2, cy - bodyH * 0.12);

  // Símbolo de radiactividad ☢ anclado al fondo del cuerpo
  fill(themeMode === "light" ? color(240, 180, 20, 200) : color(255, 210, 40, 180));
  textStyle(NORMAL);
  let radioSize = constrain(Math.round(bodyW * 0.50), 11, 34);
  textSize(radioSize);
  textAlign(CENTER, BOTTOM);
  text("☢", bodyX + bodyW / 2, cy + bodyH / 2 - 8);

  // Etiqueta bajo el cuerpo
  fill(themeMode === "light" ? color(100, 116, 139) : color(130, 140, 165));
  textSize(9);
  textAlign(CENTER, TOP);
  text("Fuente α", bodyX + bodyW / 2, cy + bodyH / 2 + 5);

  pop();
}

// Dibuja y envejece las trayectorias persistentes guardadas al morir las partículas.
function drawSavedTrails() {
  noStroke();
  for (let i = savedTrails.length - 1; i >= 0; i--) {
    let t = savedTrails[i];
    t.framesLeft--;
    if (t.framesLeft <= 0) { savedTrails.splice(i, 1); continue; }
    let timeFrac = t.framesLeft / 300.0;
    let pts = t.points, n = pts.length;
    let tr = t.r, tg = t.g, tb = t.b;
    for (let j = 0; j < n; j++) {
      let posAlpha = map(j, 0, n - 1, 8, 180);
      fill(tr, tg, tb, posAlpha * timeFrac);
      ellipse(pts[j].x, pts[j].y, map(j, 0, n - 1, 1.2, 3), map(j, 0, n - 1, 1.2, 3));
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
  let openHHm = getOpenHH();
  let clickX = width / 2 - detectorRadius;
  if (currentTrigger === "click" && mouseX >= 0 && mouseX <= clickX + 30 &&
      mouseY >= height / 2 - openHHm && mouseY <= height / 2 + openHHm) {
    if (!hasClickedInManualMode) hasClickedInManualMode = true;
    let sSlider = document.getElementById("ui-speed-slider");
    let v0 = sSlider ? parseFloat(sSlider.value) : 10.0;
    alphas.push(new AlphaParticle(clickX, mouseY, v0, 0));
    statTotal++;
    updateSidebarHistogram();
  }
}

function buildEnvironment() {
  savedTrails = [];
  let zSlider = document.getElementById("ui-z-slider");
  let z = zSlider ? parseInt(zSlider.value) : 14;
  // Radio del átomo escala con Z^(1/3): átomos más pesados son visualmente más grandes.
  // Rango: ~80 px (H, Z=1) → 195 px (Og, Z=118).
  let atomDisplayRadius = Math.round(constrain(50 + 145 * Math.pow(z / 118, 1 / 3), 60, 195));
  singleAtom = new ThomsonTarget(width / 2, height / 2, atomDisplayRadius, z, false, currentModel);
  foilAtoms = [];
  
  let atomRadius = 14;
  const FOIL_VISUAL_SCALE = 0.6;
  // El paso de la rejilla usa el diámetro visual para que los átomos se toquen,
  // mientras que el radio de física (atomRadius) se mantiene para el potencial.
  let step = Math.round(atomRadius * 2 * FOIL_VISUAL_SCALE); // 16 px
  let lSlider = document.getElementById("ui-layers-slider");
  let numColumnas = lSlider ? parseInt(lSlider.value) : 3;
  let totalFoilWidth = (numColumnas - 1) * step;
  let startX = (width / 2) - (totalFoilWidth / 2);

  // Centrado vertical dentro del 60 % del radio del detector para no tocar el arco.
  let foilHalfHeight = getOpenHH();
  let numFilas = Math.max(1, Math.floor((foilHalfHeight * 2) / step));
  let usedHeight = (numFilas - 1) * step;
  let startY = (height / 2) - (usedHeight / 2);

  for (let col = 0; col < numColumnas; col++) {
    let x = startX + col * step;
    for (let fila = 0; fila < numFilas; fila++) {
      let y = startY + fila * step;
      foilAtoms.push(new ThomsonTarget(x, y, atomRadius, z, true, currentModel, FOIL_VISUAL_SCALE));
    }
  }
}

function resetTelemetry() {
  statTotal = 0; statStraight = 0; statDeviated = 0; statRebound = 0;
  angleBins.fill(0);
  savedTrails = [];
  updateSidebarHistogram();
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
    let z = parseInt(e.target.value);
    let nombre = ELEMENT_NAMES[z] ? ELEMENT_NAMES[z] : "Z=" + z;
    document.getElementById("z-val").innerText = z + " – " + nombre;
    resetTelemetry(); buildEnvironment();
  });
  { let z = parseInt(document.getElementById("ui-z-slider").value); document.getElementById("z-val").innerText = z + " – " + (ELEMENT_NAMES[z] || "Z=" + z); }
  document.getElementById("ui-rate-slider").addEventListener("input", (e) => {
    document.getElementById("rate-val").innerText = e.target.value;
  });
  document.getElementById("ui-speed-slider").addEventListener("input", (e) => {
    document.getElementById("speed-val").innerText = parseFloat(e.target.value).toFixed(1);
  });
  document.getElementById("ui-btn-reset").addEventListener("click", () => {
    alphas = []; deadImpacts = []; resetTelemetry();
  });
  let infoCard = document.getElementById("ui-panel-info");
  document.getElementById("ui-info-trigger").addEventListener("click", () => {
    infoCard.classList.toggle("is-expanded");
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
    // Evita que clicks dentro de la card cierren el dropdown antes de procesar el control
    let card = container.querySelector(".dropdown-card");
    if (card) card.addEventListener("click", (e) => { e.stopPropagation(); });
    document.addEventListener("click", () => { container.classList.remove("is-active"); });
  }
  // Inicializa data-theme desde el valor actual del selector (evita desfase al cargar)
  let themeSelect = document.getElementById("ui-theme-select");
  uiCache.theme = themeSelect ? themeSelect.value : "dark";
  document.documentElement.setAttribute("data-theme", uiCache.theme);
  themeSelect.addEventListener("change", (e) => {
    uiCache.theme = e.target.value;
    document.documentElement.setAttribute("data-theme", e.target.value);
    updateSidebarHistogram();
  });
  document.getElementById("ui-radius-electron").addEventListener("input", (e) => {
    document.getElementById("electron-radius-val").innerText = e.target.value + " px";
    refreshColorCache();
  });
  ["ui-color-proton", "ui-color-neutron", "ui-color-electron", "ui-color-alpha"].forEach(id => {
    let el = document.getElementById(id);
    if (el) el.addEventListener("input", refreshColorCache);
  });
}