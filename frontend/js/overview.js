// Small overview of the full period. Dragging across it selects a range to zoom the main chart.

const WIDTH = 1000;
const HEIGHT = 110;
const MARGIN = { top: 8, right: 24, bottom: 28, left: 68 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

export function createOverview(selector, onBrush) {
  const svg = d3.select(selector)
    .append("svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("role", "img")
    .attr("aria-label", "Overview of the full time period. Drag across it to zoom the chart above.");

  const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  const x = d3.scaleTime().range([0, INNER_W]);
  const y = d3.scaleLinear().range([INNER_H, 0]);

  const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${INNER_H})`);
  const crudePath = g.append("path").attr("class", "overview-line crude-line");
  const gasPath = g.append("path").attr("class", "overview-line gas-line");

  // The brush: on every drag, convert the selected pixels back to dates
  const brush = d3.brushX()
    .extent([[0, 0], [INNER_W, INNER_H]])
    .on("brush end", event => {
      if (!event.sourceEvent) return;   // ignore changes made by code, like the reset button
      onBrush(event.selection ? event.selection.map(x.invert) : null);
    });

  const brushG = g.append("g").attr("class", "brush").call(brush);

  function update(series) {
    x.domain(d3.extent(series, d => d.date));
    y.domain([0, d3.max(series, d => d3.max([d.gas, d.crude]))]);

    xAxisG.call(d3.axisBottom(x).ticks(10));

    gasPath.datum(series).attr("d", d3.line()
      .defined(d => d.gas !== null)
      .x(d => x(d.date))
      .y(d => y(d.gas)));

    crudePath.datum(series).attr("d", d3.line()
      .defined(d => d.crude !== null)
      .x(d => x(d.date))
      .y(d => y(d.crude)));
  }

  // Remove the brush selection (used by the reset button)
  function clear() {
    brushG.call(brush.move, null);
  }

  return { update, clear };
}