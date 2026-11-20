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
            crude: toNumber(row.grude_gal),
            crudeReal: toNumber(row.crude_gal_real),
            flagged: row.flag_regular_jump === "True" || row.flag_crude_jump === "True",
        };


        for (const fuel of FUELS) {
            week[fuel] = toNumber(row[fuel]);
            week[`${fuel}real`] = toNumber(row[`${fuel}_real`]);
        }

        return week;
    });

    return {week, results};
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