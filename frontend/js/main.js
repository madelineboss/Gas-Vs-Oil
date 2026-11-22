import { loadData, getSeries, summarize } from "./data.js";
import { createLineChart } from "./lineChart.js";
import { createBarChart } from "./barChart.js";
import { createOverview } from "./overview.js";

const FUEL_LABELS = {
  regular: "Regular Gasoline",
  midgrade: "Midgrade Gasoline",
  premium: "Premium Gasoline",
  diesel: "Diesel",
};

const formatMoney = d3.format("$.2f");
const formatPct = d3.format(".0%");
const formatCorr = d3.format(".2f");
const formatMonth = d3.timeFormat("%b %Y");

// Show a dash instead of NaN when a period has no data (e.g. diesel before 1994)
const show = (value, format) => (value == null || Number.isNaN(value) ? "–" : format(value));

// The current filter and zoom settings
const state = { fuel: "regular", real: false, zoom: null };

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
  const overview = createOverview("#overview", range => {
    state.zoom = range;
    lineChart.zoomTo(range);
    updateSummary();
  });

  let series = [];

  // Linked view: the stats below the chart follow the brushed period
  function updateSummary() {
    const s = summarize(series, state.zoom);
    const label = state.zoom ? "Selected period" : "Whole period";
    const units = state.real ? "June 2025 dollars" : "nominal dollars";

    d3.select("#summary-title").text(
      `${label}: ${formatMonth(s.start)} – ${formatMonth(s.end)} · ${s.weeks} weeks · ${units}`
    );
    d3.select("#stat-gas").text(show(s.gas, formatMoney));
    d3.select("#stat-crude").text(show(s.crude, formatMoney));
    d3.select("#stat-spread").text(show(s.spread, formatMoney));
    d3.select("#stat-share").text(show(s.crudeShare, formatPct));
    d3.select("#stat-corr").text(show(s.changeCorrelation, formatCorr));
    d3.select("#reset-zoom").property("disabled", state.zoom === null);
  }

  function render() {
    const fuelLabel = FUEL_LABELS[state.fuel];
    series = getSeries(weeks, state.fuel, state.real);

    // Chart 1: timeline, overview strip and summary
    lineChart.update(series, { real: state.real, fuelLabel });
    overview.update(series);
    updateSummary();

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

  d3.select("#reset-zoom").on("click", () => {
    overview.clear();
    state.zoom = null;
    lineChart.zoomTo(null);
    updateSummary();
  });

  render();
}

init().catch(error => {
  d3.select("main").append("p").text("Could not load the data. Check the browser console for details.");
  console.error(error);
});