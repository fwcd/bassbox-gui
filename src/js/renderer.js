const cytoscape = require("cytoscape");

const cy = cytoscape({
	container: document.getElementById("graphview"),
	elements: [
		{ data: { id: "a" } },
		{ data: { id: "b" } },
		{ data: { id: "ab", source: "a", target: "b" } }
	]
});
