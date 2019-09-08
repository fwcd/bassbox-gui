const cytoscape = require("cytoscape");
const klay = require("cytoscape-klay");
const popper = require("cytoscape-popper");
const fs = require("fs");
const path = require("path");
const { launchBassbox } = require("./bassbox");

cytoscape.use(klay);
cytoscape.use(popper);

async function loadStylesheet() {
	return await fs.promises.readFile(path.join(__dirname, "..", "css", "graph.css"), { encoding: "utf8" });
}

function toCytoNode(node, i) {
	return { data: { id: `${i}`, label: node.type, node: node } };
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
		if (e.target == null) {
			await handler.addNode({ type: "Empty" }, { position: e.position });
		} else if (("group" in e.target) && e.target.group() == "nodes") {
			e.target.popper({
				content: () => {
					const div = document.createElement("div");
					div.innerText = JSON.stringify(e.target.data().node);
					document.body.appendChild(div);
					return div;
				}
			});
		}
	});
}

module.exports = { createGraphView };
