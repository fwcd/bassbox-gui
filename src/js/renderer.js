const cytoscape = require("cytoscape");
const fs = require("fs");
const path = require("path");
const { launchBassbox } = require("./bassbox");

async function loadStylesheet() {
	return await fs.promises.readFile(path.join(__dirname, "..", "css", "graph.css"), { encoding: "utf8" });
}

async function setup() {
	const bassbox = launchBassbox();
	const graph = await bassbox.audioGraph.get();
	const cy = cytoscape({
		container: document.getElementById("graphview"),
		elements: graph.nodes.map((node, i) => ({ data: { id: `${i}`, label: node.type } }))
			.concat(graph.edges.map(edge => ({ data: { id: `${edge.src}->${edge.dest}`, source: `${edge.src}`, target: `${edge.dest}` } })))
	});
	cy.style(await loadStylesheet());
}

setup();
