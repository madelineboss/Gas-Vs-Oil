// Timeline of retail fuel price vs. crude oil cost per gallon.

const WIDTH = 1000;
const HEIGHT = 440;
const MARGIN = { top: 16, right: 24, bottom: 52, left: 68 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

const formatMoney = d3.format("$.2f");
const formatWeek = d3.timeFormat("%b %-d, %Y");

export function createLineChart(selector) {
  // ---- One-time setup ----
  const svg = d3.select(selector)
    .append("svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("role", "img")
    .attr("aria-label", "Line chart of weekly retail fuel price and crude oil cost per gallon from 1990 to 2025");

  const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  const x = d3.scaleTime().range([0, INNER_W]);
  const y = d3.scaleLinear().range([INNER_H, 0]);

  // Layers, drawn back to front
  const gridG = g.append("g").attr("class", "grid");
  const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${INNER_H})`);
  const yAxisG = g.append("g").attr("class", "axis");
  const spreadPath = g.append("path").attr("class", "spread-area");
  const crudePath = g.append("path").attr("class", "line crude-line");
  const gasPath = g.append("path").attr("class", "line gas-line");

  // Axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("x", INNER_W / 2)
    .attr("y", INNER_H + 44)
    .attr("text-anchor", "middle")
    .text("Week");

  const yLabel = g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -INNER_H / 2)
    .attr("y", -52)
    .attr("text-anchor", "middle");

  // Hover elements (hidden until the mouse is over the chart)
  const hoverLine = g.append("line").attr("class", "hover-line").attr("y1", 0).attr("y2", INNER_H);
  const gasDot = g.append("circle").attr("class", "hover-dot gas-dot").attr("r", 5);
  const crudeDot = g.append("circle").attr("class", "hover-dot crude-dot").attr("r", 5);
  const hoverItems = [hoverLine, gasDot, crudeDot];
  hoverItems.forEach(el => el.style("display", "none"));

  // Invisible rectangle on top that catches mouse movement
  const overlay = g.append("rect")
    .attr("class", "overlay")
    .attr("width", INNER_W)
    .attr("height", INNER_H);

  const tooltip = d3.select("#tooltip");
  const bisect = d3.bisector(d => d.date).center;

  // Line and area generators. defined() leaves a gap wherever a value is null.
  const lineFor = key => d3.line()
    .defined(d => d[key] !== null)
    .x(d => x(d.date))
    .y(d => y(d[key]));

  const spreadArea = d3.area()
    .defined(d => d.gas !== null && d.crude !== null)
    .x(d => x(d.date))
    .y0(d => y(d.crude))
    .y1(d => y(d.gas));

  let current = [];
  let gasLabel = "Regular";

  // ---- Redraw with new data ----
  function update(series, options) {
    current = series;
    gasLabel = options.fuelLabel;

    x.domain(d3.extent(series, d => d.date));
    y.domain([0, d3.max(series, d => d3.max([d.gas, d.crude]))]).nice();

    const t = svg.transition().duration(500);

    xAxisG.transition(t).call(d3.axisBottom(x).ticks(10));
    yAxisG.transition(t).call(d3.axisLeft(y).ticks(6).tickFormat(formatMoney));
    gridG.transition(t)
      .call(d3.axisLeft(y).ticks(6).tickSize(-INNER_W).tickFormat(""))
      .call(sel => sel.select(".domain").remove());

    yLabel.text(options.real
      ? "Dollars per gallon (June 2025 dollars)"
      : "Dollars per gallon (nominal)");

    spreadPath.datum(series).attr("d", spreadArea);
    crudePath.datum(series).attr("d", lineFor("crude"));
    gasPath.datum(series).attr("d", lineFor("gas"));
  }

  // ---- Hover tooltip ----
  function hide() {
    hoverItems.forEach(el => el.style("display", "none"));
    tooltip.style("display", "none");
  }

  overlay
    .on("mousemove", event => {
      const [mx] = d3.pointer(event);
      const d = current[bisect(current, x.invert(mx))];
      if (!d || d.gas === null || d.crude === null) {
        hide();
        return;
      }

      const px = x(d.date);
      hoverLine.attr("x1", px).attr("x2", px).style("display", null);
      gasDot.attr("cx", px).attr("cy", y(d.gas)).style("display", null);
      crudeDot.attr("cx", px).attr("cy", y(d.crude)).style("display", null);

      tooltip
        .style("display", "block")
        .html(`
          <strong>Week of ${formatWeek(d.date)}</strong>
          <div><span class="swatch gas"></span>${gasLabel}: ${formatMoney(d.gas)}</div>
          <div><span class="swatch crude"></span>Crude oil: ${formatMoney(d.crude)}</div>
          <div><span class="swatch spread"></span>Spread: ${formatMoney(d.spread)}</div>
        `);

      // Keep the tooltip on screen near the right edge
      const box = tooltip.node().getBoundingClientRect();
      const left = event.pageX + 16 + box.width > window.scrollX + window.innerWidth
        ? event.pageX - box.width - 16
        : event.pageX + 16;
      tooltip.style("left", `${left}px`).style("top", `${event.pageY - 20}px`);
    })
    .on("mouseleave", hide);

  return { update };
}