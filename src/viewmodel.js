//// Generating the viewmodel - Performance Optimized

// Settings:
const numberOfRanks = 25;
const outsidePosition = numberOfRanks + 1;
let snapshotStep = 3; // Smoothness: Only use every x'th  snapshot
let ticksPerDay = 3; // Speed: How quickly a day progresses
let state; // Containing the current state (snapshot of day x and day x+1)
let ticker = 0; // Incremented on each frame, used to slow down days
let scaleBreak = true;

// Performance optimizations
let lastGeneratedIndex = -1;
let stateCache = new Map();
let viewModelCache = null;
let lastInterpolationValue = -1;
let dataObjectKeys = null; // Cache for Object.keys(dataObject)

// Get cached keys for better performance
function getDataObjectKeys() {
  if (!dataObjectKeys && dataObject) {
    dataObjectKeys = Object.keys(dataObject);
  }
  return dataObjectKeys;
}

// Populate values for state object on the currentIndex'th snapshot
// Is called repeatedly, whenever the period of days between day x and x+1 is over
// or when the slider is changed
function generateState(currentIndex = 0) {
  if (!dataObject || !isDataLoaded) {
    return;
  }

  // Check cache first
  const cacheKey = `${currentIndex}_${snapshotStep}_${scaleBreak}`;
  if (stateCache.has(cacheKey) && lastGeneratedIndex === currentIndex) {
    state = stateCache.get(cacheKey);
    return;
  }

  const keys = getDataObjectKeys();
  const currentDate = keys[currentIndex];
  const nextDate = keys[currentIndex + snapshotStep];
  const currentRanking = dataObject[currentDate];
  const nextRanking = dataObject[nextDate];

  if (!currentRanking) {
    return;
  }

  // Get all cryptos that rank high enough (higher than numberOfRanks)
  let relevantCryptos;
  if (nextRanking != null) {
    // Use Set for better performance
    const currentRelevant = new Set(
      currentRanking
        .filter((row) => row.rank <= numberOfRanks)
        .map((row) => row.name)
    );
    const nextRelevant = new Set(
      nextRanking
        .filter((row) => row.rank <= numberOfRanks)
        .map((row) => row.name)
    );
    relevantCryptos = [...new Set([...currentRelevant, ...nextRelevant])];
  } else {
    relevantCryptos = currentRanking
      .filter((row) => row.rank <= numberOfRanks)
      .map((row) => row.name);
  }

  // Pre-calculate total values for better performance
  const currentTotal = currentRanking.reduce((acc, row) => acc + row.value, 0);
  const nextTotal = nextRanking ? nextRanking.reduce((acc, row) => acc + row.value, 0) : currentTotal;

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
      from: currentTotal,
      to: nextTotal,
    },
    daysPassed: 0, // Can be fractional, i.e. 1.3 days passed
  };

  // Snapshot of market value of first ranked crypto (or second ranked if scaleBreak)
  state.maxValue = {};

  // Create lookup maps for better performance
  const currentMap = new Map(currentRanking.map(row => [row.name, row]));
  const nextMap = nextRanking ? new Map(nextRanking.map(row => [row.name, row])) : new Map();

  // Snapshot of all cryptos
  state.cryptos = relevantCryptos.map((name) => {
    const currentState = currentMap.get(name);
    const nextState = nextMap.get(name);

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

    // Lazy load images instead of loading all at once
    if (currentState?.image && currentState.image !== "") {
      lazyLoadImage(currentState.name, currentState.image);
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

  // Cache the state
  stateCache.set(cacheKey, { ...state });
  lastGeneratedIndex = currentIndex;

  // Clear viewmodel cache when state changes
  viewModelCache = null;
  lastInterpolationValue = -1;
}

// Optimized date difference calculation with caching
const dateDiffCache = new Map();
function diffInDays(date1, date2) {
  const cacheKey = `${date1}_${date2}`;
  if (dateDiffCache.has(cacheKey)) {
    return dateDiffCache.get(cacheKey);
  }
  
  const diffInMs = Math.abs(new Date(date1) - new Date(date2));
  const days = diffInMs / (1000 * 60 * 60 * 24);
  dateDiffCache.set(cacheKey, days);
  return days;
}

// Increment currentDate and
// recall generateState when period between day x & x+snapshotStep is over
function nextDate() {
  if (state == null) generateState();

  // Increase daysPassed by fractional amount depending on speed
  const nextDaysPassed = state.daysPassed + 1 / ticksPerDay;

  if (nextDaysPassed < diffInDays(state.date.from, state.date.to)) {
    // Only update daysPassed, everything else happens via interpolation
    state.daysPassed = nextDaysPassed;
  } else {
    // Init the next interpolation period/snapshot
    const keys = getDataObjectKeys();
    if (state.index.to + snapshotStep < keys.length) {
      generateState(state.index.to);
    } else {
      generateState(0);
    }
  }
}

// Optimized interpolation with caching
function interpolateStateToViewmodel() {
  if (state == null) generateState();

  // Easing function for interpolationValue that isn't currently used
  function easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2;
  }

  // Mapping the range of the snapshot's "from date" -> "to date" onto 0 -> 1
  let interpolationValue =
    state.daysPassed / diffInDays(state.date.to, state.date.from);

  // If date.from == date.to
  if (isNaN(interpolationValue)) {
    interpolationValue = 0;
  }

  // Use cached viewmodel if interpolation value hasn't changed significantly
  if (viewModelCache && Math.abs(lastInterpolationValue - interpolationValue) < 0.001) {
    return viewModelCache;
  }

  // Creating a viewmodel with interpolated values
  const viewModel = {
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

  // Cache the viewmodel
  viewModelCache = viewModel;
  lastInterpolationValue = interpolationValue;

  return viewModel;
}

// Clear caches when settings change
function clearCaches() {
  stateCache.clear();
  dateDiffCache.clear();
  viewModelCache = null;
  lastInterpolationValue = -1;
  lastGeneratedIndex = -1;
}
