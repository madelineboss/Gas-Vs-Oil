import { loadData, getSeries } from "./data.js";
import { createLineChart } from "./lineChart.js";

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
  const { weeks } = await loadData();
  const lineChart = createLineChart("#line-chart");

  function render() {
    const series = getSeries(weeks, state.fuel, state.real);
    const fuelLabel = FUEL_LABELS[state.fuel];

    lineChart.update(series, { real: state.real, fuelLabel });

    d3.select("#line-title").text(
      `${fuelLabel} vs. Crude Oil Cost per Gallon, 1990–2025 ` +
      `(${state.real ? "June 2025 dollars" : "nominal dollars"})`
    );
    d3.select("#gas-legend-label").text(`${fuelLabel} (retail)`);
  }

  setupToggle("fuel-toggle", value => { state.fuel = value; render(); });
  setupToggle("dollar-toggle", value => { state.real = value === "real"; render(); });

  render();
}

init().catch(error => {
  d3.select("main").append("p").text("Could not load the data. Check the browser console for details.");
  console.error(error);
});