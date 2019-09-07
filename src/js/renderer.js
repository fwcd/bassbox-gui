const cytoscape = require("cytoscape");
const { launchBassbox } = require("./bassbox");

async function setup() {
	const bassbox = launchBassbox();
	const graph = await bassbox.audioGraph.get();
	const cy = cytoscape({
		container: document.getElementById("graphview"),
		elements: graph.nodes.map((node, i) => ({ data: { id: `${i}`, type: node.type } }))
			.concat(graph.edges.map(edge => ({ data: { id: `${edge.src}->${edge.dest}`, source: `${edge.src}`, target: `${edge.dest}` } })))
	});
}

setup();
