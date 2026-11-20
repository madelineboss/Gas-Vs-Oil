import {loadData, getSeries} from "./data.js";

async function init() {
    const {weeks, results} = await loadData();
    const series = getSeries(weeks, "reguler", false);

    //Temporary check that everything loaded
    const first = series[0].date;
    const last = series[series.length-1].date;
    d3.select("#status").text(
        `Loaded ${weeks.length} weeks, ${formatDate(first)} to ${formatDate(last)}.  ` +
        `Peak regular price: $${d3.max(series, d => d.gas).toFixed(3)}.` 
    );

    console.log("First week:", series[0]);
    console.log("Analysis results:", results);
}

init().catch(error => {
    d3.select("#status").text("Could not load the data. Check the browser console for details.");
    console.error(error);
})