// Pulling in the data
let dataObject;
// Object cointaining all the loaded images by name
let images = {};

// Load CSV
fetch("cryptocurrency-data.csv")
  .then((res) => res.text())
  .then(parseCSV)
  .then(() => {
    generateState();
  });

// Parse CSV into dataObject
function parseCSV(csvString) {
  const lines = csvString.split("\n");
  // Get indices via row names
  const firstLine = lines[0].split(",");
  const findIndex = (name) => firstLine.findIndex((o) => o === name);
  const indices = {
    date: findIndex("date"),
    rank: findIndex("rank"),
    name: findIndex("name"),
    symbol: findIndex("symbol"),
    marketCap: findIndex("market-cap"),
    image: findIndex("image"),
  };

  // Insert rows into dataObject
  const csvObject = lines.slice(1).map((row) => row.split(","));
  dataObject = {};
  csvObject.forEach((row) => {
    const date = row[indices.date];
    if (dataObject[date] != null) {
      // Push row into array at that index
      dataObject[date].push({
        rank: parseInt(row[indices.rank]),
        name: row[indices.name],
        symbol: row[indices.symbol],
        value: parseInt(row[indices.marketCap]),
        image: row[indices.image],
      });
    } else {
      // Create array when encountering first row with that date
      dataObject[date] = [
        {
          rank: parseInt(row[indices.rank]),
          name: row[indices.name],
          symbol: row[indices.symbol],
          value: parseInt(row[indices.marketCap]),
          image: row[indices.image],
        },
      ];
    }
  });
}
