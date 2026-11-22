// Load the files produced by the notebooks and prepares them for the charts.
export const FUELS = ["regular", "midgrade", "premium", "diesel"];

// CSV values arrive as text. Empty cells (missing weeks, fuel before 1994) become null
function toNumber(value){
    return value === "" || value === undefined ? null : +value

}

const parseDate = d3.timeParse("%Y-%m-%d");

export async function loadData() {
    //Load both files at the same time
    const [rows, results] = await Promise.all ([
        d3.csv("data/weekly_prices.csv"),
        d3.json("data/analysis_results.json")
    ]);

    //One clean object per week
    const weeks = rows.map(row => {
        const week = {
            date: parseDate(row.date),
            crude: toNumber(row.crude_gal),
            crudeReal: toNumber(row.crude_gal_real),
            flagged: row.flag_regular_jump === "True" || row.flag_crude_jump === "True",
        };


        for (const fuel of FUELS) {
            week[fuel] = toNumber(row[fuel]);
            week[`${fuel}Real`] = toNumber(row[`${fuel}_real`]);
        }

        return week;
    });

    return {weeks, results};
}

// Returns the gas and crude series for one fuel, in nominal or real dollars
export function getSeries(weeks, fuel, real) {
    const gasKey = real ? `${fuel}Real` : fuel;
    const crudeKey = real ? "crudeReal" : "crude";

    return weeks.map (w => ({
        date: w.date, 
        gas: w[gasKey], 
        crude: w[crudeKey],
        spread: w[gasKey] !== null && w[crudeKey] !== null ? w[gasKey] - w[crudeKey] : null,
        flagged: w.flagged,
    }));
}

// Correlation between two lists of numbers (Pearson's r)
function pearson(pairs) {
  if (pairs.length < 3) return null;
  const meanA = d3.mean(pairs, p => p[0]);
  const meanB = d3.mean(pairs, p => p[1]);
  let sumAB = 0, sumAA = 0, sumBB = 0;
  for (const [a, b] of pairs) {
    sumAB += (a - meanA) * (b - meanB);
    sumAA += (a - meanA) ** 2;
    sumBB += (b - meanB) ** 2;
  }
  return sumAA && sumBB ? sumAB / Math.sqrt(sumAA * sumBB) : null;
}

// Summary stats for a date range (or the whole series if range is null)
export function summarize(series, range) {
  const rows = range
    ? series.filter(d => d.date >= range[0] && d.date <= range[1])
    : series;
  const valid = rows.filter(d => d.gas !== null && d.crude !== null);

  // Week-to-week changes, only between two consecutive weeks that both have data
  const changes = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    if (prev.gas !== null && prev.crude !== null && cur.gas !== null && cur.crude !== null) {
      changes.push([cur.gas - prev.gas, cur.crude - prev.crude]);
    }
  }

  return {
    start: range ? range[0] : rows[0]?.date,
    end: range ? range[1] : rows[rows.length - 1]?.date,
    weeks: valid.length,
    gas: d3.mean(valid, d => d.gas),
    crude: d3.mean(valid, d => d.crude),
    spread: d3.mean(valid, d => d.spread),
    crudeShare: d3.mean(valid, d => d.crude / d.gas),
    changeCorrelation: pearson(changes),
  };
}