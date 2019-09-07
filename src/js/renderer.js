const cytoscape = require("cytoscape");
const klay = require("cytoscape-klay");
const fs = require("fs");
const path = require("path");
const { launchBassbox } = require("./bassbox");

cytoscape.use(klay);

async function loadStylesheet() {
	return await fs.promises.readFile(path.join(__dirname, "..", "css", "graph.css"), { encoding: "utf8" });
}

async function setup() {
	const bassbox = launchBassbox();
	const graph = await bassbox.audioGraph.get();
	const cy = cytoscape({
		container: document.getElementById("graphview"),
		elements: graph.nodes.map((node, i) => ({ data: { id: `${i}`, label: node.type } }))
			.concat(graph.edges.map(edge => ({ data: { id: `${edge.src}->${edge.dest}`, source: `${edge.src}`, target: `${edge.dest}` } }))),
		layout: {
			name: "klay",
			animate: true,
			klay: {
				spacing: 120
			}
		}
	});
	cy.style(await loadStylesheet());
	// TODO: Add nodes on click, add edges on (right-click?) drag
	// TODO: Show popovers when clicking on nodes to enable customizability
	//       -> Including source file selectors
}

setup();
