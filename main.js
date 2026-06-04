async function getPrecipitations(latitude, longitude, timezone, forecastDays, pastDays) {
  const baseUrl = "https://api.open-meteo.com/v1/forecast";
  const url = `${baseUrl}?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum&timezone=${timezone}&forecast_days=${forecastDays}&past_days=${pastDays}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error.message);
  }
}

async function getLatitudeLongitude(city) {
  const geocodingUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`;
  try {
    const response = await fetch(geocodingUrl);
    if (!response.ok) {
      throw new Error(`Geocoding API response status: ${response.status}`);
    }
    const data = await response.json();
    if (data.length === 0) {
      throw new Error("No results found for the specified city.");
    }
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch (error) {
    console.error(error.message);
  }
}

function getPrecipitationsCollected(precipitations, surface, collectionEfficiency) {
  const precipitationsCollected = [];
  precipitations.forEach(precipitation => {
    precipitation = precipitation || 0; // Handle null or undefined values
    precipitationsCollected.push((precipitation * surface * collectionEfficiency));
  });
  return precipitationsCollected;
}

function convertLiterToCubicMeter(precipitations_sum) {
  return precipitations_sum / 1000; // Convert liters to cubic meters
}

function createChart() {
  return new Chart(document.getElementById('myChart'), {
    type: "line",
    data: {
      datasets: [{
        label: "Precipitations Collected (l)",
        data: [],
        tension: 0.2,
        fill: true,
        pointRadius: 3,
      }],
      labels: []
    },
    options: {
      showLine: true,
      animation: false,
      plugins: {
        title: {
          display: true,
          color: 'black',
          text: "Collected Precipitations (l)",
          font: {
            size: 20,
            weight: "bold"
          }
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          min: 0
        }
      }
    }
  });
}

function removeChartData(chart) {
  chart.data.labels = [];
  chart.data.datasets.forEach((dataset) => {
    dataset.data = [];
  });
}

function addChartData(chart, label, newData) {
  chart.data.labels.push(...label);
  chart.data.datasets.forEach((dataset) => {
    dataset.data.push(...newData);
  });
}

function setChartTitle(chart, title) {
  chart.options.plugins.title.text = title;
}


function updateTotalPrecipitations(total) {
  document.getElementById("totalPrecipitations").innerHTML = `${(total).toFixed(1)}`;
}

function updateTotalCollectedPrecipitations(total) {
  document.getElementById("totalCollectedPrecipitations").innerHTML = `${(total).toFixed(1)}`;
}

function updateTable(dates, precipitations, collectedPrecipitations) {
  const tableBody = document.querySelector("#precipitationsTable tbody");
  tableBody.innerHTML = "";

  for (let i = 0; i < dates.length; i++) {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    const precipitationCell = document.createElement("td");
    const collectedPrecipitationsCell = document.createElement("td");

    dateCell.textContent = dates[i];
    precipitationCell.textContent = `${(precipitations[i] || 0).toFixed(1)}`;
    collectedPrecipitationsCell.textContent = `${(collectedPrecipitations[i] || 0).toFixed(1)}`;

    row.appendChild(dateCell);
    row.appendChild(precipitationCell);
    row.appendChild(collectedPrecipitationsCell);

    tableBody.appendChild(row);
  }
}

function updateChart(chart, label, data) {
  removeChartData(chart);
  addChartData(chart, label, data);
  setChartTitle(chart, `Collected Precipitations (l) - Total: ${convertLiterToCubicMeter(data.reduce((a, b) => a + b, 0)).toFixed(2)} m³`);
  chart.update();
}

async function update() {
  const maxPastDays = 93;
  const maxForecastDays = 16;
  const timezone = "Europe/Brussels";
  const city = document.getElementById("city").value;

  if ((cityInput != city) || (cityLatitude === 0.0 && cityLongitude === 0.0)) {
    const [selectedLatitude, selectedLongitude] = await getLatitudeLongitude(city);
    cityLatitude = selectedLatitude;
    cityLongitude = selectedLongitude;
    cityInput = city;
    console.log(`City updated to ${city} with coordinates (${cityLatitude}, ${cityLongitude})`);
  }

  let pastDays = parseInt(document.getElementById("pastDays").value);
  let forecastDays = parseInt(document.getElementById("forecastDays").value);

  if (pastDays < 0 || pastDays > maxPastDays) {
    console.log(`Past days must be between 0 and ${maxPastDays}.`);
    pastDays = pastDays < 0 ? 0 : maxPastDays;
    document.getElementById("pastDays").value = pastDays;
  }

  if (forecastDays < 0 || forecastDays > maxForecastDays) {
    console.log(`Forecast days must be between 0 and ${maxForecastDays}.`);
    forecastDays = forecastDays < 0 ? 0 : maxForecastDays;
    document.getElementById("forecastDays").value = forecastDays;
  }

  console.log(`Fetching data for pastDays: ${pastDays}, forecastDays: ${forecastDays} at ${city} (${cityLatitude}, ${cityLongitude})`);

  getPrecipitations(cityLatitude, cityLongitude, timezone, forecastDays, pastDays).then(data => {
    const precipitations = data.daily.precipitation_sum;
    const newData = getPrecipitationsCollected(precipitations, 80, 0.9);
    const newDates = data.daily.time;
    const totalPrecipitations = newData.reduce((a, b) => a + b, 0);

    updateTotalCollectedPrecipitations(totalPrecipitations);
    updateTotalPrecipitations(precipitations.reduce((a, b) => a + b, 0));
    updateChart(chart, newDates, newData);
    updateTable(newDates, precipitations, newData);
  });
}

function main() {
  update();
}

let chart = createChart();
let cityInput = document.getElementById("city");
let cityLatitude = 0.0;
let cityLongitude = 0.0;
main();
