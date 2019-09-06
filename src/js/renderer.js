const cytoscape = require("cytoscape");
const { launchBassbox } = require("./bassbox");

async function setup() {
	const cy = cytoscape({
		container: document.getElementById("graphview"),
		elements: [
			{ data: { id: "a" } },
			{ data: { id: "b" } },
			{ data: { id: "ab", source: "a", target: "b" } }
		]
	});
}

setup();
