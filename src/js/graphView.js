const cytoscape = require("cytoscape");
const klay = require("cytoscape-klay");
const fs = require("fs");
const path = require("path");
const { launchBassbox } = require("./bassbox");

cytoscape.use(klay);

async function loadStylesheet() {
	return await fs.promises.readFile(path.join(__dirname, "..", "css", "graph.css"), { encoding: "utf8" });
}

function toCytoNode(node, i) {
	return { data: { id: `${i}`, label: node.type } };
}

function toCytoEdge(edge) {
	return { data: { id: `${edge.src}->${edge.dest}`, source: `${edge.src}`, target: `${edge.dest}` } };
}

async function createGraphView(element) {
	const bassbox = launchBassbox();
	const graph = await bassbox.audioGraph.get();
	const cy = cytoscape({
		container: element,
		elements: graph.nodes.map((node, i) => toCytoNode(node, i))
			.concat(graph.edges.map(edge => toCytoEdge(edge))),
		layout: {
			name: "klay",
			animate: true,
			klay: {
				spacing: 120
			}
		}
	});
	cy.style(await loadStylesheet());

	const handler = {
		async addNode(node, cytoOpts) {
			const index = await bassbox.audioGraph.addNode(node);
			const cytoNode = toCytoNode(node, index);
			if (cytoOpts) {
				Object.assign(cytoNode, cytoOpts);
			}
			cy.add(cytoNode);
		}
	};
	cy.on("click", async e => {
		await handler.addNode({ type: "Empty" }, { position: e.position });
	});
}

module.exports = { createGraphView };
