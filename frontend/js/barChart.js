// Rockets and feathers: cumulative share of a crude oil price change that reaches the pump.

const WIDTH = 1000;
const HEIGHT = 380;
const MARGIN = { top: 24, right: 24, bottom: 56, left: 68 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

const KEYS = ["increase", "decrease"];
const formatPct = d3.format(".0%");

// Week 0 in the analysis is the first weekly survey after crude moved, about 1 week later
function weeksLabel(week) {
  const n = week + 1;
  return `${n} week${n === 1 ? "" : "s"} after the crude price change`;
}

export function createBarChart(selector) {
  // ---- One-time setup ----
  const svg = d3.select(selector)
    .append("svg")
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("role", "img")
    .attr("aria-label", "Grouped bar chart comparing how much of a crude oil price increase and decrease reaches the pump over nine weeks");

  const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

  // x0 places each week; x1 places the two bars inside a week
  const x0 = d3.scaleBand().range([0, INNER_W]).paddingInner(0.3);
  const x1 = d3.scaleBand().domain(KEYS).padding(0.06);
  const y = d3.scaleLinear().range([INNER_H, 0]);

  const gridG = g.append("g").attr("class", "grid");
  const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${INNER_H})`);
  const yAxisG = g.append("g").attr("class", "axis");
  const barsG = g.append("g");
  const refLine = g.append("line").attr("class", "reference-line").attr("x1", 0).attr("x2", INNER_W);
  const refLabel = g.append("text")
    .attr("class", "reference-label")
    .attr("x", 6)
    .text("100% = fully passed through to the pump");
  const starsG = g.append("g");

  // Axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("x", INNER_W / 2)
    .attr("y", INNER_H + 44)
    .attr("text-anchor", "middle")
    .text("Weeks after the crude oil price change");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -INNER_H / 2)
    .attr("y", -52)
    .attr("text-anchor", "middle")
    .text("Share of the crude change reaching the pump");

  // ---- Tooltip ----
  const tooltip = d3.select("#tooltip");

  function showTooltip(event, d) {
    const significant = d.p_value < 0.05;
    tooltip
      .style("display", "block")
      .html(`
        <strong>${weeksLabel(d.week)}</strong>
        <div><span class="swatch increase"></span>Price rise: ${formatPct(d.increase)} passed through</div>
        <div><span class="swatch decrease"></span>Price fall: ${formatPct(d.decrease)} passed through</div>
        <div class="tooltip-note">${significant ? "Difference is statistically significant" : "Difference is not statistically significant"} (p = ${d.p_value.toFixed(3)})</div>
      `);

    const box = tooltip.node().getBoundingClientRect();
    const left = event.pageX + 16 + box.width > window.scrollX + window.innerWidth
      ? event.pageX - box.width - 16
      : event.pageX + 16;
    tooltip.style("left", `${left}px`).style("top", `${event.pageY - 20}px`);
  }

  function hideTooltip() {
    tooltip.style("display", "none");
  }

  // ---- Redraw with new data ----
  function update(rows) {
    const t = svg.transition().duration(500);
    const values = rows.flatMap(d => [d.increase, d.decrease]);

    x0.domain(rows.map(d => d.week));
    x1.range([0, x0.bandwidth()]);
    y.domain([Math.min(0, d3.min(values)), Math.max(1.15, d3.max(values) * 1.08)]).nice();

    // Label ticks 1-9 instead of 0-8 (see weeksLabel)
    xAxisG.call(d3.axisBottom(x0).tickFormat(w => w + 1).tickSizeOuter(0));
    yAxisG.transition(t).call(d3.axisLeft(y).ticks(6).tickFormat(formatPct));
    gridG.transition(t)
      .call(d3.axisLeft(y).ticks(6).tickSize(-INNER_W).tickFormat(""))
      .call(sel => sel.select(".domain").remove());

    refLine.transition(t).attr("y1", y(1)).attr("y2", y(1));
    refLabel.transition(t).attr("y", y(1) - 6);

    // One group per week, with an invisible full-height area for easier hovering
    const groups = barsG.selectAll("g.week-group")
      .data(rows, d => d.week)
      .join(enter => {
        const group = enter.append("g").attr("class", "week-group");
        group.append("rect").attr("class", "hit-area");
        return group;
      })
      .attr("transform", d => `translate(${x0(d.week)},0)`);

    groups.select(".hit-area")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", x0.bandwidth())
      .attr("height", INNER_H);

    // Two bars per week. New bars start at height 0 and grow.
    groups.selectAll("rect.bar")
      .data(d => KEYS.map(key => ({ key, value: d[key] })))
      .join(enter => enter.append("rect")
        .attr("y", y(0))
        .attr("height", 0))
      .attr("class", d => `bar ${d.key}`)
      .attr("x", d => x1(d.key))
      .attr("width", x1.bandwidth())
      .transition(t)
      .attr("y", d => y(Math.max(0, d.value)))
      .attr("height", d => Math.abs(y(d.value) - y(0)));

    groups.on("mousemove", showTooltip).on("mouseleave", hideTooltip);

    // Asterisks above weeks where the increase/decrease difference is significant
    starsG.selectAll("text")
      .data(rows.filter(d => d.p_value < 0.05), d => d.week)
      .join("text")
      .attr("class", "sig-star")
      .attr("text-anchor", "middle")
      .attr("x", d => x0(d.week) + x0.bandwidth() / 2)
      .attr("y", d => y(Math.max(d.increase, d.decrease, 0)) - 6)
      .text("*");
  }

  return { update };
}