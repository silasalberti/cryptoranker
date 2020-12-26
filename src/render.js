//// Rendering, control & co.

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

// Controls
let slider;

// Setup
function setup() {
  maxWidth = (displayWidth - rightOffset) * 0.95;
  startOfLeftControlPane = rightOffset + maxWidth * cuttingPoint + 20;

  colorMode(HSB, 100);
  createCanvas(1920, displayWidth);
  createControls();
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
  // Regenerate state
  currentDaysPassed = state.daysPassed;
  generateState(state.index.from);
  state.daysPassed = currentDaysPassed;
}

// For slider
function onSliderChange(event) {
  generateState(
    Math.floor(
      (event.target.value / 100) * (Object.keys(dataObject).length - 2)
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
  generateState(state.index.from);
}

// Main loop
function draw() {
  ticker += 1;
  ticker %= 360;

  // Render everything independent of state
  // Off-white Background
  background("#f8f8ff");
  // Gradient behind scale break
  if (scaleBreak) {
    drawGradient();
  }
  drawTextInControlPane();

  // Render everything dependent on state
  if (state != null) {
    const viewmodel = interpolateStateToViewmodel();
    // Render everything in order
    renderGrid(viewmodel);
    renderBarchart(viewmodel);
    renderDate();
    renderPiechart(viewmodel);

    // Update slider
    const totalDaysInSnapshot = diffInDays(state.date.from, state.date.to);
    const percentageBetweenSnapshots =
      totalDaysInSnapshot !== 0 && !isNaN(totalDaysInSnapshot)
        ? state.daysPassed / totalDaysInSnapshot
        : 0;
    slider.value(
      ((state.index.from + percentageBetweenSnapshots * snapshotStep) /
        (Object.keys(dataObject).length - 2)) *
        100
    ); // Length of dataObject minus 2 because last key is just {..., "": null}

    // Update
    if (running) {
      nextDate();
    }
  }
}

// Draw gradient behind scale break
function drawGradient() {
  noFill();
  const startPos = rightOffset + maxWidth * (cuttingPoint + 0.02);
  const endPos = displayWidth;
  function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - pow(2, -2 * x);
  }
  for (let x = startPos; x <= endPos; x++) {
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

// Draw grid lines behind barchart
function renderGrid(viewmodel) {
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
    //// Text
    // Determine Suffix
    const exponent = Math.floor(Math.log(step) / Math.log(1000));
    let letter;
    if (exponent === 0) {
      letter = "";
    } else if (exponent === 1) {
      letter = "T";
    } else if (exponent === 2) {
      letter = "M";
    } else if (exponent === 3) {
      letter = "B";
    } else if (exponent >= 4) {
      letter = "T";
      exponent = 4;
    }
    // Draw Text
    const shortVal = (
      (xval - (xval % Math.pow(1000, exponent))) /
      Math.pow(1000, exponent)
    )
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    textAlign(RIGHT, TOP);
    fill(80);
    stroke(100);
    textSize(height / 2.5);
    textFont("Helvetica");
    text("$" + shortVal + letter, xpos - 10, topOffset - gridAreaHeight);
    xval += step;
  }
}

// The color for each crypto is generated using its name
function mapStringToColor(string) {
  let sum = 59;
  for (let i = 0; i < string.length; i++) {
    sum += Math.pow(string.charCodeAt(i), 2);
  }
  return color((sum % 300) / 3, 50, 80);
}

// Turn "1234567" into "$1,234,567"
function formatCurrency(number) {
  return (
    "$" +
    Math.floor(number)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  );
}

// Draw main bar chart
function renderBarchart(viewmodel) {
  strokeWeight(1);

  // Text with ranking
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

  // Iterate over each crypto
  viewmodel.cryptos.forEach((object) => {
    if (object.rank > numberOfRanks) {
      return;
    }

    // Set color
    const color = mapStringToColor(object.name);
    fill(color);
    stroke(color);
    // Text with name of crypto
    textAlign(RIGHT, CENTER);
    textSize(height / 2.5);
    const ypos = topOffset + gap + (object.rank - 1) * (height + gap);
    text(object.name, rightOffset - 20 - 32, ypos + height / 2);
    // Image of the crypto
    if (object.image) {
      image(
        images[object.name],
        rightOffset - 10 - 32,
        ypos + height / 2 - 16,
        32,
        32
      );
    }

    //// Drawing the bar
    // Calculate the width and draw each bar
    // Depending on scaleBreak or not and if yes, 1st bar or not
    let width;
    if (!scaleBreak) {
      width = (maxWidth * object.value) / viewmodel.maxValue;
      rect(rightOffset, ypos, width, height);
    } else if (object.rank > 1) {
      width = ((maxWidth * object.value) / viewmodel.maxValue) * cuttingPoint;
      rect(rightOffset, ypos, width, height);
    } else {
      width = maxWidth;
      quad(
        rightOffset,
        ypos,
        rightOffset + width * (cuttingPoint + 0.02),
        ypos,
        rightOffset + width * (cuttingPoint + 0.045),
        ypos + height,
        rightOffset,
        ypos + height
      );
      quad(
        rightOffset + width * (cuttingPoint + 0.05),
        ypos,
        rightOffset + width * (cuttingPoint + 0.075),
        ypos + height,
        rightOffset + width,
        ypos + height,
        rightOffset + width,
        ypos
      );
    }

    // Market cap text
    fill(0);
    stroke(100);
    strokeWeight(0.6);
    let value = formatCurrency(object.value);
    let sign;
    if (textWidth(value) > width - 40) {
      textAlign(LEFT, CENTER);
      sign = 1;
    } else {
      textAlign(RIGHT, CENTER);
      sign = -1;
    }
    text(value, rightOffset + width + sign * 20, ypos + height / 2);
  });
}

const pieChartDiameter = 400;
const pieChartLogoSize = 32;
const pieChartX = 1100;
const pieChartY = 550;
const percentageTextSize = 14;

// Draw pie chart in the bottom right
function renderPiechart(viewmodel) {
  let previousStart = 0;
  for (object of viewmodel.cryptos.sort((a, b) => b.value - a.value)) {
    let share = object.value / viewmodel.totalValue;
    if (share > (pieChartLogoSize / (pieChartDiameter * PI)) * 1.3) {
      fill(mapStringToColor(object.name));
      let stop = previousStart + (object.value / viewmodel.totalValue) * 2 * PI;
      // Pie
      arc(
        pieChartX,
        pieChartY,
        pieChartDiameter,
        pieChartDiameter,
        previousStart,
        stop
      );
      // Logo
      if (Object.keys(images).includes(object.name)) {
        image(
          images[object.name],
          pieChartX +
            (Math.cos(previousStart + (stop - previousStart) / 2) *
              (pieChartDiameter + pieChartLogoSize + 10)) /
              2 -
            pieChartLogoSize / 2,
          pieChartY +
            (Math.sin(previousStart + (stop - previousStart) / 2) *
              (pieChartDiameter + pieChartLogoSize + 10)) /
              2 -
            pieChartLogoSize / 2,
          pieChartLogoSize,
          pieChartLogoSize
        );
      }
      // Percentage
      fill(0);
      stroke(100);
      strokeWeight(0.6);
      textAlign(CENTER, CENTER);
      textSize(percentageTextSize);
      const percentageText = (share * 100).toFixed(1) + "%";
      text(
        percentageText,
        pieChartX +
          (Math.cos(previousStart + (stop - previousStart) / 2) *
            (pieChartDiameter - textWidth(percentageText) - 10)) /
            2,
        pieChartY +
          (Math.sin(previousStart + (stop - previousStart) / 2) *
            (pieChartDiameter - textWidth(percentageText) - 10)) /
            2
      );
      previousStart = stop;
    } else {
      break;
    }
  }
  fill("black");
  // Pie
  arc(
    pieChartX,
    pieChartY,
    pieChartDiameter,
    pieChartDiameter,
    previousStart,
    0
  );
  // Text
  textSize(18);
  textAlign(LEFT, CENTER);
  text(
    "Other",
    pieChartX +
      (Math.cos(previousStart + (2 * PI - previousStart) / 2) *
        (pieChartDiameter + 15)) /
        2,
    pieChartY +
      (Math.sin(previousStart + (2 * PI - previousStart) / 2) *
        (pieChartDiameter + 15)) /
        2
  );
  // Percentage
  fill(90);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(percentageTextSize);
  const percentageText =
    ((1 - previousStart / (2 * PI)) * 100).toFixed(1) + "%";
  text(
    percentageText,
    pieChartX +
      (Math.cos(previousStart + (2 * PI - previousStart) / 2) *
        (pieChartDiameter - textWidth(percentageText) - 10)) /
        2,
    pieChartY +
      (Math.sin(previousStart + (2 * PI - previousStart) / 2) *
        (pieChartDiameter - textWidth(percentageText) - 10)) /
        2
  );

  // Text above the cart
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
