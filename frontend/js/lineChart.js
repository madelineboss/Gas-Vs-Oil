// Timeline of retail fuel price vs. crude oil cost per gallon, with zoom and event markers.
import { EVENTS } from "./events.js";

const WIDTH = 1000;
const HEIGHT = 470;
const MARGIN = { top: 52, right: 24, bottom: 52, left: 68 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

const formatMoney = d3.format("$.2f");
const formatWeek = d3.timeFormat("%b %-d, %Y");
const parseDate = d3.timeParse("%Y-%m-%d");
const events = EVENTS.map(e => ({ ...e, date: parseDate(e.date) }));

export function createLineChart(selector) {
  // ---- One-time setup ----
  const svg = d3.select(selector)
    .append("svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("role", "img")
    .attr("aria-label", "Line chart of weekly retail fuel price and crude oil cost per gallon from 1990 to 2025, with major events marked");

  // Anything inside the clip path is cut off at the chart edges when zoomed in
  svg.append("defs")
    .append("clipPath")
    .attr("id", "line-clip")
    .append("rect")
    .attr("width", INNER_W)
    .attr("height", INNER_H);

  const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  const x = d3.scaleTime().range([0, INNER_W]);
  const y = d3.scaleLinear().range([INNER_H, 0]);

  // Layers, drawn back to front
  const gridG = g.append("g").attr("class", "grid");
  const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${INNER_H})`);
  const yAxisG = g.append("g").attr("class", "axis");
  const plotG = g.append("g").attr("clip-path", "url(#line-clip)");
  const eventLinesG = plotG.append("g");
  const spreadPath = plotG.append("path").attr("class", "spread-area");
  const crudePath = plotG.append("path").attr("class", "line crude-line");
  const gasPath = plotG.append("path").attr("class", "line gas-line");
  const eventLabelsG = g.append("g");

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

  // Hover elements
  const hoverLine = g.append("line").attr("class", "hover-line").attr("y1", 0).attr("y2", INNER_H);
  const gasDot = g.append("circle").attr("class", "hover-dot gas-dot").attr("r", 5);
  const crudeDot = g.append("circle").attr("class", "hover-dot crude-dot").attr("r", 5);
  const hoverItems = [hoverLine, gasDot, crudeDot];
  hoverItems.forEach(el => el.style("display", "none"));

  const overlay = g.append("rect")
    .attr("class", "overlay")
    .attr("width", INNER_W)
    .attr("height", INNER_H);

  const tooltip = d3.select("#tooltip");
  const bisect = d3.bisector(d => d.date).center;

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
  let fullDomain = null;
  let zoomDomain = null;
  let options = { real: false, fuelLabel: "Regular Gasoline" };

  // ---- Tooltip helpers ----
  function placeTooltip(event) {
    const box = tooltip.node().getBoundingClientRect();
    const left = event.pageX + 16 + box.width > window.scrollX + window.innerWidth
      ? event.pageX - box.width - 16
      : event.pageX + 16;
    tooltip.style("left", `${left}px`).style("top", `${event.pageY - 20}px`);
  }

  function hide() {
    hoverItems.forEach(el => el.style("display", "none"));
    tooltip.style("display", "none");
  }

  // ---- Draw everything for the current data and zoom ----
  function draw(animate) {
    if (!current.length) return;

    x.domain(zoomDomain ?? fullDomain);
    const [start, end] = x.domain();

    // Fit the y-axis to the weeks that are visible
    const visible = current.filter(d => d.date >= start && d.date <= end);
    const maxValue = d3.max(visible, d => d3.max([d.gas, d.crude])) ?? 1;
    y.domain([0, maxValue]).nice();

    const t = animate ? svg.transition().duration(500) : null;
    const maybeAnimate = sel => (t ? sel.transition(t) : sel);

    maybeAnimate(xAxisG).call(d3.axisBottom(x).ticks(10));
    maybeAnimate(yAxisG).call(d3.axisLeft(y).ticks(6).tickFormat(formatMoney));
    maybeAnimate(gridG)
      .call(d3.axisLeft(y).ticks(6).tickSize(-INNER_W).tickFormat(""))
      .call(sel => sel.select(".domain").remove());

    yLabel.text(options.real
      ? "Dollars per gallon (June 2025 dollars)"
      : "Dollars per gallon (nominal)");

    spreadPath.datum(current).attr("d", spreadArea);
    crudePath.datum(current).attr("d", lineFor("crude"));
    gasPath.datum(current).attr("d", lineFor("gas"));

    // Event markers: dashed line in the chart, label above it
    const visibleEvents = events.filter(e => e.date >= start && e.date <= end);

    eventLinesG.selectAll("line")
      .data(visibleEvents, d => d.label)
      .join("line")
      .attr("class", "event-line")
      .attr("x1", d => x(d.date))
      .attr("x2", d => x(d.date))
      .attr("y1", 0)
      .attr("y2", INNER_H);

    eventLabelsG.selectAll("g.event-label")
      .data(visibleEvents, d => d.label)
      .join(enter => {
        const label = enter.append("g").attr("class", "event-label");
        label.append("circle").attr("r", 4);
        label.append("text").attr("dy", "0.35em");
        return label;
      })
      // Alternate two rows so neighboring labels don't overlap
      .attr("transform", (d, i) => `translate(${x(d.date)},${i % 2 === 0 ? -34 : -14})`)
      .each(function (d) {
        const nearRightEdge = x(d.date) > INNER_W - 150;
        d3.select(this).select("text")
          .attr("x", nearRightEdge ? -8 : 8)
          .attr("text-anchor", nearRightEdge ? "end" : "start")
          .text(d.label);
      })
      .on("mousemove", (event, d) => {
        tooltip
          .style("display", "block")
          .html(`
            <strong>${d.label}</strong>
            <div>${formatWeek(d.date)}</div>
            <div class="tooltip-note">${d.text}</div>
          `);
        placeTooltip(event);
      })
      .on("mouseleave", hide);
  }

  // ---- Public functions ----
  function update(series, newOptions) {
    current = series;
    options = newOptions;
    fullDomain = d3.extent(series, d => d.date);
    draw(true);
  }

  function zoomTo(domain) {
    zoomDomain = domain;
    hide();
    draw(false);
  }

  // ---- Hover tooltip for the data ----
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
          <div><span class="swatch gas"></span>${options.fuelLabel}: ${formatMoney(d.gas)}</div>
          <div><span class="swatch crude"></span>Crude oil: ${formatMoney(d.crude)}</div>
          <div><span class="swatch spread"></span>Spread: ${formatMoney(d.spread)}</div>
        `);
      placeTooltip(event);
    })
    .on("mouseleave", hide);

  return { update, zoomTo };
}