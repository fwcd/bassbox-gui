const { createGraphView } = require("./graphView");

async function setup() {
	await createGraphView(document.getElementById("graphview"));
}

setup();
