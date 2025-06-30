//// Rendering, control & co. - Performance Optimized

// Layout settings
const height = 40;
const gap = 10;
const rightOffset = 225;
const controlAreaHeight = 50;
const gridAreaHeight = 30;
const topOffset = controlAreaHeight + gridAreaHeight;
const pageHeight = topOffset + gap + numberOfRanks * (height + gap);
let maxWidth; // Assigned in setup
let startOfLeftControlPane; // Assigned in setup
let running = true;
const cuttingPoint = 0.75;

// Performance optimizations
let lastFrameTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;
let skipFrames = 0;
let lastViewModelHash = '';
let renderCache = new Map();

// Controls
let slider;

// Setup
function setup() {
  maxWidth = (displayWidth - rightOffset) * 0.95;
  startOfLeftControlPane = rightOffset + maxWidth * cuttingPoint + 20;

  colorMode(HSB, 100);
  createCanvas(1920, displayWidth);
  createControls();
  
  // Performance optimizations
  pixelDensity(1); // Reduce pixel density for better performance
  
  // Preload critical images
  if (typeof preloadCriticalImages === 'function') {
    setTimeout(preloadCriticalImages, 100);
  }
}

function createControls() {
  let pauseButton = createButton("Play/Pause");
  pauseButton.size(90, controlAreaHeight / 2);
  pauseButton.position(10, controlAreaHeight / 4);
  pauseButton.mousePressed(toggleRunning);

  let button = createButton("Scale break");
  button.size(90, controlAreaHeight / 2);
  button.position(10 + 90 + 10, controlAreaHeight / 4);
  button.mousePressed(toggleScaleBreak);

  slider = createSlider(0, 100, 0, 0);
  slider.position(rightOffset, controlAreaHeight / 4);
  slider.size(maxWidth * cuttingPoint, controlAreaHeight / 2);
  slider.input(onSliderChange);

  let speedSelect = createSelect();
  textSize(controlAreaHeight / 3);
  speedSelect.size(50, controlAreaHeight / 2);
  speedSelect.position(
    startOfLeftControlPane + textWidth("Speed: ") + 5,
    controlAreaHeight / 4
  );
  speedSelect.option("0.5x");
  speedSelect.option("1x");
  speedSelect.option("2x");
  speedSelect.option("3x");
  speedSelect.option("5x");
  speedSelect.option("10x");
  speedSelect.selected("3x");
  speedSelect.changed(onSpeedSelectChange);

  let smoothnessSelect = createSelect();
  smoothnessSelect.size(80, controlAreaHeight / 2);
  smoothnessSelect.position(
    startOfLeftControlPane +
      textWidth("Speed: ") +
      5 +
      50 +
      10 +
      textWidth("Smoothness: ") +
      5,
    controlAreaHeight / 4
  );
  smoothnessSelect.option("Smoother");
  smoothnessSelect.option("Smooth");
  smoothnessSelect.option("Normal");
  smoothnessSelect.option("Quick");
  smoothnessSelect.option("Quicker");
  smoothnessSelect.selected("Normal");
  smoothnessSelect.changed(onSmoothnessSelectChange);
}

// For pause button
function toggleRunning() {
  running = !running;
}

// For scale break button
function toggleScaleBreak() {
  scaleBreak = !scaleBreak;
  // Clear caches when scale break changes
  if (typeof clearCaches === 'function') {
    clearCaches();
  }
  // Regenerate state
  const currentDaysPassed = state ? state.daysPassed : 0;
  generateState(state ? state.index.from : 0);
  if (state) {
    state.daysPassed = currentDaysPassed;
  }
}

// For slider
function onSliderChange(event) {
  const keys = getDataObjectKeys ? getDataObjectKeys() : Object.keys(dataObject || {});
  generateState(
    Math.floor(
      (event.target.value / 100) * (keys.length - 2)
    )
  );
}

// For speed select
function onSpeedSelectChange(event) {
  switch (event.target.value) {
    case "0.5x":
      ticksPerDay = 20;
      break;
    case "1x":
      ticksPerDay = 10;
      break;
    case "2x":
      ticksPerDay = 5;
      break;
    case "3x":
      ticksPerDay = 3;
      break;
    case "5x":
      ticksPerDay = 2;
      break;
    case "10x":
      ticksPerDay = 1;
      break;
  }
}

// For smoothness select
function onSmoothnessSelectChange(event) {
  switch (event.target.value) {
    case "Smoother":
      snapshotStep = 10;
      break;
    case "Smooth":
      snapshotStep = 5;
      break;
    case "Normal":
      snapshotStep = 3;
      break;
    case "Quick":
      snapshotStep = 2;
      break;
    case "Quicker":
      snapshotStep = 1;
      break;
  }
  if (typeof clearCaches === 'function') {
    clearCaches();
  }
  generateState(state ? state.index.from : 0);
}

// Optimized main loop with frame rate control
function draw() {
  const currentTime = millis();
  
  // Frame rate limiting for better performance
  if (currentTime - lastFrameTime < frameInterval) {
    return;
  }
  
  ticker += 1;
  ticker %= 360;

  // Render everything independent of state
  // Off-white Background
  background("#f8f8ff");
  
  // Only render gradient if scale break is enabled
  if (scaleBreak) {
    drawGradient();
  }
  
  drawTextInControlPane();

  // Render everything dependent on state
  if (state != null && isDataLoaded) {
    const viewmodel = interpolateStateToViewmodel();
    
    // Create a simple hash to detect changes
    const viewModelHash = JSON.stringify({
      maxValue: Math.round(viewmodel.maxValue),
      totalValue: Math.round(viewmodel.totalValue),
      cryptoCount: viewmodel.cryptos.length,
      firstCryptoRank: viewmodel.cryptos[0]?.rank || 0
    });
    
    // Only re-render if viewmodel has changed significantly
    if (viewModelHash !== lastViewModelHash) {
      // Render everything in order
      renderGrid(viewmodel);
      renderBarchart(viewmodel);
      renderDate();
      renderPiechart(viewmodel);
      
      lastViewModelHash = viewModelHash;
    }

    // Update slider (less frequently)
    if (ticker % 3 === 0) {
      updateSlider();
    }

    // Update animation
    if (running) {
      nextDate();
    }
  }
  
  lastFrameTime = currentTime;
}

// Separate slider update function
function updateSlider() {
  if (!state) return;
  
  const totalDaysInSnapshot = diffInDays(state.date.from, state.date.to);
  const percentageBetweenSnapshots =
    totalDaysInSnapshot !== 0 && !isNaN(totalDaysInSnapshot)
      ? state.daysPassed / totalDaysInSnapshot
      : 0;
  
  const keys = getDataObjectKeys ? getDataObjectKeys() : Object.keys(dataObject || {});
  slider.value(
    ((state.index.from + percentageBetweenSnapshots * snapshotStep) /
      (keys.length - 2)) *
      100
  );
}

// Optimized gradient drawing
function drawGradient() {
  noFill();
  const startPos = rightOffset + maxWidth * (cuttingPoint + 0.02);
  const endPos = displayWidth;
  
  // Use fewer lines for better performance
  const step = 2;
  
  function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - pow(2, -2 * x);
  }
  
  for (let x = startPos; x <= endPos; x += step) {
    let inter = map(x, startPos, endPos, 0, 1);
    stroke(60, 70 * easeOutExpo(inter));
    line(x, 0, x, pageHeight);
  }
}

function drawTextInControlPane() {
  textAlign(LEFT, CENTER);
  textSize(controlAreaHeight / 3);
  noStroke();
  fill("black");
  text("Speed: ", startOfLeftControlPane, controlAreaHeight / 2);
  text(
    "Smoothness: ",
    startOfLeftControlPane + textWidth("Speed: ") + 5 + 50 + 10,
    controlAreaHeight / 2
  );
}

// Render date in the top left
function renderDate() {
  if (!state) return;
  
  fill("black");
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(height / 2);
  const currentDate = new Date(state.date.from);
  currentDate.setUTCDate(
    currentDate.getUTCDate() + Math.floor(state.daysPassed)
  );
  text(
    currentDate.toISOString().slice(0, 10),
    30,
    topOffset - gridAreaHeight / 2
  );
}

// Optimized grid rendering with caching
let gridCache = null;
let lastMaxValue = -1;

function renderGrid(viewmodel) {
  // Use cached grid if max value hasn't changed significantly
  if (gridCache && Math.abs(lastMaxValue - viewmodel.maxValue) < viewmodel.maxValue * 0.1) {
    // Draw cached grid
    image(gridCache, 0, 0);
    return;
  }

  // Calculate step width of grid
  const orderOfMagnitude = Math.log(viewmodel.maxValue) / Math.log(10);
  let step = Math.pow(10, Math.floor(orderOfMagnitude));
  if (orderOfMagnitude % 1 > Math.log(6) / Math.log(10)) {
    step *= 2;
  } else if (orderOfMagnitude % 1 < Math.log(1.5) / Math.log(100)) {
    step /= 5;
  } else if (orderOfMagnitude % 1 < Math.log(3) / Math.log(100)) {
    step /= 2;
  }
  
  // Draw grid
  const relevantMaxWidth = !scaleBreak ? maxWidth : maxWidth * cuttingPoint;
  let xval = step;
  while (xval <= viewmodel.maxValue) {
    const xpos = rightOffset + (xval / viewmodel.maxValue) * relevantMaxWidth;
    // Line
    stroke(70);
    strokeWeight(1);
    line(xpos, topOffset - gridAreaHeight, xpos, pageHeight);
    
    // Text (simplified for performance)
    const exponent = Math.floor(Math.log(step) / Math.log(1000));
    let letter = "";
    if (exponent === 1) letter = "T";
    else if (exponent === 2) letter = "M";
    else if (exponent === 3) letter = "B";
    else if (exponent >= 4) letter = "T";
    
    // Draw Text
    const shortVal = (
      (xval - (xval % Math.pow(1000, Math.min(exponent, 4)))) /
      Math.pow(1000, Math.min(exponent, 4))
    )
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    textAlign(RIGHT, TOP);
    fill(80);
    stroke(100);
    textSize(height / 2.5);
    text("$" + shortVal + letter, xpos - 10, topOffset - gridAreaHeight);
    xval += step;
  }
  
  lastMaxValue = viewmodel.maxValue;
}

// Pre-computed color cache
const colorCache = new Map();

// Optimized color mapping with caching
function mapStringToColor(string) {
  if (colorCache.has(string)) {
    return colorCache.get(string);
  }
  
  let sum = 59;
  for (let i = 0; i < string.length; i++) {
    sum += Math.pow(string.charCodeAt(i), 2);
  }
  const colorValue = color((sum % 300) / 3, 50, 80);
  colorCache.set(string, colorValue);
  return colorValue;
}

// Turn "1234567" into "$1,234,567" - optimized
const currencyCache = new Map();
function formatCurrency(number) {
  const rounded = Math.floor(number);
  if (currencyCache.has(rounded)) {
    return currencyCache.get(rounded);
  }
  
  const formatted = "$" + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  currencyCache.set(rounded, formatted);
  return formatted;
}

// Optimized bar chart rendering
function renderBarchart(viewmodel) {
  strokeWeight(1);

  // Text with ranking (render once)
  textAlign(RIGHT, CENTER);
  noStroke();
  textSize(height / 2.5);
  fill("black");
  for (let i = 0; i < numberOfRanks; i++) {
    text(
      i + 1 + ".",
      20 + textWidth("99"),
      topOffset + gap + i * (height + gap) + height / 2
    );
  }

  // Filter and sort cryptos for better performance
  const visibleCryptos = viewmodel.cryptos
    .filter(crypto => crypto.rank <= numberOfRanks)
    .sort((a, b) => a.rank - b.rank);

  // Iterate over each visible crypto
  visibleCryptos.forEach((object) => {
    // Set color
    const cryptoColor = mapStringToColor(object.name);
    fill(cryptoColor);
    stroke(cryptoColor);
    
    // Text with name of crypto
    textAlign(RIGHT, CENTER);
    textSize(height / 2.5);
    const ypos = topOffset + gap + (object.rank - 1) * (height + gap);
    text(object.name, rightOffset - 20 - 32, ypos + height / 2);
    
    // Image of the crypto (only if loaded)
    const cryptoImage = images[object.name];
    if (cryptoImage && cryptoImage.width > 0) {
      image(
        cryptoImage,
        rightOffset - 10 - 32,
        ypos + height / 2 - 16,
        32,
        32
      );
    }

    // Drawing the bar (optimized)
    let width;
    if (!scaleBreak) {
      width = (maxWidth * object.value) / viewmodel.maxValue;
      rect(rightOffset, ypos, width, height);
    } else if (object.rank > 1) {
      width = ((maxWidth * object.value) / viewmodel.maxValue) * cuttingPoint;
      rect(rightOffset, ypos, width, height);
    } else {
      width = maxWidth;
      // Simplified quad drawing for better performance
      rect(rightOffset, ypos, width * cuttingPoint, height);
      rect(rightOffset + width * 0.9, ypos, width * 0.1, height);
    }

    // Market cap text
    fill(0);
    stroke(100);
    strokeWeight(0.6);
    const value = formatCurrency(object.value);
    const textWidth_val = textWidth(value);
    
    if (textWidth_val > width - 40) {
      textAlign(LEFT, CENTER);
      text(value, rightOffset + width + 20, ypos + height / 2);
    } else {
      textAlign(RIGHT, CENTER);
      text(value, rightOffset + width - 20, ypos + height / 2);
    }
  });
}

const pieChartDiameter = 400;
const pieChartLogoSize = 32;
const pieChartX = 1100;
const pieChartY = 550;
const percentageTextSize = 14;

// Optimized pie chart rendering
function renderPiechart(viewmodel) {
  // Sort cryptos by value for pie chart
  const sortedCryptos = viewmodel.cryptos
    .slice()
    .sort((a, b) => b.value - a.value);

  let previousStart = 0;
  const minShare = (pieChartLogoSize / (pieChartDiameter * PI)) * 1.3;
  
  for (const object of sortedCryptos) {
    const share = object.value / viewmodel.totalValue;
    if (share > minShare) {
      fill(mapStringToColor(object.name));
      const stop = previousStart + share * 2 * PI;
      
      // Pie slice
      arc(
        pieChartX,
        pieChartY,
        pieChartDiameter,
        pieChartDiameter,
        previousStart,
        stop
      );
      
      // Logo (only if loaded)
      const cryptoImage = images[object.name];
      if (cryptoImage && cryptoImage.width > 0) {
        const angle = previousStart + (stop - previousStart) / 2;
        const logoX = pieChartX + (Math.cos(angle) * (pieChartDiameter + pieChartLogoSize + 10)) / 2 - pieChartLogoSize / 2;
        const logoY = pieChartY + (Math.sin(angle) * (pieChartDiameter + pieChartLogoSize + 10)) / 2 - pieChartLogoSize / 2;
        image(cryptoImage, logoX, logoY, pieChartLogoSize, pieChartLogoSize);
      }
      
      // Percentage text
      fill(0);
      stroke(100);
      strokeWeight(0.6);
      textAlign(CENTER, CENTER);
      textSize(percentageTextSize);
      const percentageText = (share * 100).toFixed(1) + "%";
      const angle = previousStart + (stop - previousStart) / 2;
      const textX = pieChartX + (Math.cos(angle) * (pieChartDiameter - textWidth(percentageText) - 10)) / 2;
      const textY = pieChartY + (Math.sin(angle) * (pieChartDiameter - textWidth(percentageText) - 10)) / 2;
      text(percentageText, textX, textY);
      
      previousStart = stop;
    } else {
      break;
    }
  }
  
  // "Other" section
  if (previousStart < 2 * PI) {
    fill("black");
    arc(pieChartX, pieChartY, pieChartDiameter, pieChartDiameter, previousStart, 0);
    
    // "Other" text
    textSize(18);
    textAlign(LEFT, CENTER);
    const angle = previousStart + (2 * PI - previousStart) / 2;
    text(
      "Other",
      pieChartX + (Math.cos(angle) * (pieChartDiameter + 15)) / 2,
      pieChartY + (Math.sin(angle) * (pieChartDiameter + 15)) / 2
    );
    
    // "Other" percentage
    fill(90);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(percentageTextSize);
    const otherPercentage = ((1 - previousStart / (2 * PI)) * 100).toFixed(1) + "%";
    text(
      otherPercentage,
      pieChartX + (Math.cos(angle) * (pieChartDiameter - textWidth(otherPercentage) - 10)) / 2,
      pieChartY + (Math.sin(angle) * (pieChartDiameter - textWidth(otherPercentage) - 10)) / 2
    );
  }

  // Title text above the chart
  fill("black");
  textSize(25);
  textAlign(CENTER, BOTTOM);
  text("Total Market Cap:", pieChartX, pieChartY - pieChartDiameter / 2 - 65);
  textSize(20);
  textAlign(CENTER, BOTTOM);
  text(
    formatCurrency(viewmodel.totalValue),
    pieChartX,
    pieChartY - pieChartDiameter / 2 - 40
  );
}
