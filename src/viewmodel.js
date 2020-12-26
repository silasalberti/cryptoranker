//// Generating the viewmodel

// Settings:
const numberOfRanks = 25;
const outsidePosition = numberOfRanks + 1;
let snapshotStep = 3; // Smoothness: Only use every x'th  snapshot
let ticksPerDay = 3; // Speed: How quickly a day progresses
let state; // Containing the current state (snapshot of day x and day x+1)
let ticker = 0; // Incremented on each frame, used to slow down days
let scaleBreak = true;

// Populate values for state object on the currentIndex'th snapshot
// Is called repeatedly, whenever the period of days between day x and x+1 is over
// or when the slider is changed
function generateState(currentIndex = 0) {
  const currentDate = Object.keys(dataObject)[currentIndex];
  const nextDate = Object.keys(dataObject)[currentIndex + snapshotStep];
  const currentRanking = dataObject[currentDate];
  const nextRanking = dataObject[nextDate];

  // Get all cryptos that rank high enough (higher than numberOfRanks)
  let relevantCryptos;
  if (nextRanking != null) {
    relevantCryptos = Array.from(
      new Set([
        ...currentRanking
          .filter((row) => row.rank <= numberOfRanks)
          .map((row) => row.name),
        ...nextRanking
          .filter((row) => row.rank <= numberOfRanks)
          .map((row) => row.name),
      ])
    );
  } else {
    relevantCryptos = currentRanking
      .filter((row) => row.rank <= numberOfRanks)
      .map((row) => row.name);
  }

  // Initialize state
  state = {
    index: {
      from: currentIndex,
      to: currentIndex + snapshotStep,
    },
    date: {
      from: currentDate,
      to: nextDate ?? currentDate,
    },
    totalValue: {
      from: currentRanking.reduce(
        (accumulator, currentRow) => accumulator + currentRow.value,
        0
      ),
      to: nextRanking.reduce(
        (accumulator, currentRow) => accumulator + currentRow.value,
        0
      ),
    },
    daysPassed: 0, // Can be fractional, i.e. 1.3 days passed
  };

  // Snapshot of market value of first ranked crypto (or second ranked if scaleBreak)
  state.maxValue = {};

  // Snapshot of all cryptos
  state.cryptos = relevantCryptos.map((name) => {
    let currentState = currentRanking.find((row) => row.name === name);
    let nextState = nextRanking?.find((row) => row.name === name);

    // Assign to state.maxValue depending on scaleBreak 1st or 2nd rank
    if (
      (!scaleBreak && currentState?.rank === 1) ||
      (scaleBreak && currentState?.rank === 2)
    ) {
      state.maxValue.from = currentState.value;
      // To make sure a maxValue.to isn't undefined if nextState is undefined
      if (!nextState) {
        state.maxValue.to = currentState.value;
      }
    }
    if (
      (!scaleBreak && nextState?.rank === 1) ||
      (scaleBreak && nextState?.rank === 2)
    )
      state.maxValue.to = nextState.value;

    if (
      !Object.keys(images).includes(currentState?.name) &&
      currentState?.image != null &&
      currentState.image !== ""
    ) {
      images[currentState?.name] = loadImage(currentState?.image);
    }

    // Return snapshot of crypto (into state.cryptos)
    return {
      name,
      rank: {
        from: currentState?.rank ?? outsidePosition,
        to: nextState?.rank ?? outsidePosition,
      },
      value: {
        from: currentState?.value ?? 0,
        to: nextState?.value ?? 0,
      },
      image: currentState?.image,
    };
  });
}

// Difference betwen to "2020-12-24" types of dates in days
function diffInDays(date1, date2) {
  const diffInMs = Math.abs(new Date(date1) - new Date(date2));
  return diffInMs / (1000 * 60 * 60 * 24);
}

// Increment currentDate and
// recall generateState when period between day x & x+snapshotStep is over
function nextDate() {
  if (state == null) generateState();

  // Increase daysPassed by fractional amount depending on speed
  nextDaysPassed = state.daysPassed + 1 / ticksPerDay;

  if (nextDaysPassed < diffInDays(state.date.from, state.date.to)) {
    // Only update daysPassed, everything else happens via interpolation
    state.daysPassed = nextDaysPassed;
  } else {
    // Init the next interpolation period/snapshot
    if (state.index.to + snapshotStep < Object.keys(dataObject).length) {
      generateState(state.index.to);
    } else {
      generateState(0);
    }
  }
}

// Interpolation between snapshots
function interpolateStateToViewmodel() {
  if (state == null) generateState();

  // Easing function for interpolationValue that isn't currently used
  function easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2;
  }

  // Maping the range of the snapshot's "from date" -> "to date" onto 0 -> 1
  let interpolationValue =
    state.daysPassed / diffInDays(state.date.to, state.date.from);

  // If date.from == date.to
  if (isNaN(interpolationValue)) {
    interpolationValue = 0;
  }

  // Creating a viewmodel with interpolated values
  return {
    maxValue:
      state.maxValue.from +
      (state.maxValue.to - state.maxValue.from) * interpolationValue,
    totalValue:
      state.totalValue.from +
      (state.totalValue.to - state.totalValue.from) * interpolationValue,
    cryptos: state.cryptos.map((crypto) => ({
      name: crypto.name,
      rank:
        crypto.rank.from +
        (crypto.rank.to - crypto.rank.from) * interpolationValue,
      value:
        crypto.value.from +
        (crypto.value.to - crypto.value.from) * interpolationValue,
      image: crypto.image,
    })),
  };
}
