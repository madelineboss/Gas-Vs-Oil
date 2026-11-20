import { loadData, getSeries } from "./data.js";
import { createLineChart } from "./lineChart.js";
import { createBarChart } from "./barChart.js";

const FUEL_LABELS = {
  regular: "Regular Gasoline",
  midgrade: "Midgrade Gasoline",
  premium: "Premium Gasoline",
  diesel: "Diesel",
};

// The current filter settings
const state = { fuel: "regular", real: false };

// Make a group of buttons act as a single-choice toggle
function setupToggle(id, onChange) {
  const buttons = d3.selectAll(`#${id} button`);
  buttons.on("click", function () {
    buttons.attr("aria-pressed", "false");
    d3.select(this).attr("aria-pressed", "true");
    onChange(this.dataset.value);
  });
}

async function init() {
  const { weeks, results } = await loadData();
  const lineChart = createLineChart("#line-chart");
  const barChart = createBarChart("#bar-chart");

  function render() {
    const fuelLabel = FUEL_LABELS[state.fuel];

    // Chart 1: timeline
    const series = getSeries(weeks, state.fuel, state.real);
    lineChart.update(series, { real: state.real, fuelLabel });
    d3.select("#line-title").text(
      `${fuelLabel} vs. Crude Oil Cost per Gallon, 1990–2025 ` +
      `(${state.real ? "June 2025 dollars" : "nominal dollars"})`
    );
    d3.select("#gas-legend-label").text(`${fuelLabel} (retail)`);

    // Chart 2: rockets and feathers
    barChart.update(results.asymmetry[state.fuel]);
    d3.select("#bar-title").text(
      `How Much of a Crude Oil Price Change Reaches the Pump: ${fuelLabel}`
    );
  }

  setupToggle("fuel-toggle", value => { state.fuel = value; render(); });
  setupToggle("dollar-toggle", value => { state.real = value === "real"; render(); });

  render();
}

init().catch(error => {
  d3.select("main").append("p").text("Could not load the data. Check the browser console for details.");
  console.error(error);
});