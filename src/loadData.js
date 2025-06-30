// Pulling in the data
let dataObject;
// Object containing all the loaded images by name
let images = {};
// Cache for parsed data
let dataCache = null;
// Loading state
let isDataLoaded = false;

// Performance optimized CSV loading with compression check
async function loadData() {
  try {
    // Check if compressed version exists first
    const response = await fetch("cryptocurrency-data.csv.gz").catch(() => 
      fetch("cryptocurrency-data.csv")
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvString = await response.text();
    parseCSV(csvString);
    isDataLoaded = true;
    generateState();
  } catch (error) {
    console.error('Failed to load data:', error);
    // Fallback to original method
    fetch("cryptocurrency-data.csv")
      .then((res) => res.text())
      .then(parseCSV)
      .then(() => {
        isDataLoaded = true;
        generateState();
      });
  }
}

// Optimized CSV parsing with better performance
function parseCSV(csvString) {
  // Return cached data if available
  if (dataCache) {
    dataObject = dataCache;
    return;
  }

  const lines = csvString.split("\n");
  const firstLine = lines[0].split(",");
  
  // Pre-compute indices for better performance
  const indices = {
    date: firstLine.indexOf("date"),
    rank: firstLine.indexOf("rank"),
    name: firstLine.indexOf("name"),
    symbol: firstLine.indexOf("symbol"),
    marketCap: firstLine.indexOf("market-cap"),
    image: firstLine.indexOf("image"),
  };

  // Use Map for better performance than object
  const csvData = new Map();
  
  // Process in chunks to avoid blocking main thread
  const processChunk = (startIndex, endIndex) => {
    for (let i = startIndex; i < endIndex && i < lines.length; i++) {
      const row = lines[i].split(",");
      if (row.length < 6) continue; // Skip invalid rows
      
      const date = row[indices.date];
      if (!date) continue;
      
      const entry = {
        rank: parseInt(row[indices.rank]) || 0,
        name: row[indices.name] || '',
        symbol: row[indices.symbol] || '',
        value: parseInt(row[indices.marketCap]) || 0,
        image: row[indices.image] || '',
      };
      
      if (csvData.has(date)) {
        csvData.get(date).push(entry);
      } else {
        csvData.set(date, [entry]);
      }
    }
  };

  // Process data in chunks to prevent UI blocking
  const chunkSize = 1000;
  let currentIndex = 1; // Skip header
  
  const processNextChunk = () => {
    const endIndex = Math.min(currentIndex + chunkSize, lines.length);
    processChunk(currentIndex, endIndex);
    currentIndex = endIndex;
    
    if (currentIndex < lines.length) {
      // Use requestAnimationFrame for non-blocking processing
      requestAnimationFrame(processNextChunk);
    } else {
      // Convert Map to Object for compatibility
      dataObject = Object.fromEntries(csvData);
      dataCache = dataObject; // Cache the result
    }
  };
  
  processNextChunk();
}

// Preload critical images only
function preloadCriticalImages() {
  const criticalCryptos = ['Bitcoin', 'Ethereum', 'XRP', 'Bitcoin Cash', 'Litecoin'];
  criticalCryptos.forEach(name => {
    if (!images[name]) {
      // Find image URL from data
      for (const date in dataObject) {
        const cryptos = dataObject[date];
        const crypto = cryptos.find(c => c.name === name);
        if (crypto && crypto.image) {
          images[name] = loadImage(crypto.image);
          break;
        }
      }
    }
  });
}

// Lazy load images as needed
function lazyLoadImage(name, imageUrl) {
  if (!images[name] && imageUrl && imageUrl !== "") {
    images[name] = loadImage(imageUrl);
  }
  return images[name];
}

// Initialize data loading
loadData();
