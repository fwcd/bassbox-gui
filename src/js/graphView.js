const cytoscape = require("cytoscape");
const klay = require("cytoscape-klay");
const popper = require("cytoscape-popper");
const edgeHandles = require("cytoscape-edgehandles");
const fs = require("fs");
const path = require("path");
const { launchBassbox } = require("./bassbox");

cytoscape.use(klay);
cytoscape.use(popper);
cytoscape.use(edgeHandles);

async function loadStylesheet() {
	return await fs.promises.readFile(path.join(__dirname, "..", "css", "graph.css"), { encoding: "utf8" });
}

function toCytoNode(node, i) {
	return { data: { id: `${i}`, index: i, label: node.type, node: node } };
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
	cy.edgehandles();
	
	const handler = {
		async addNode(node, cytoOpts) {
			const index = await bassbox.audioGraph.addNode(node);
			const cytoNode = toCytoNode(node, index);
			if (cytoOpts) {
				Object.assign(cytoNode, cytoOpts);
			}
			cy.add(cytoNode);
		},
		
		async addEdge(edge) {
			await bassbox.audioGraph.addEdge(edge);
			cy.add(toCytoEdge(edge));
		}
	};
	
	cy.on("select", "node", async e => {
		// Show popover with details about node
		const pop = e.target.popper({
			content: () => {
				const div = document.createElement("div");
				div.innerText = JSON.stringify(e.target.data().node);
				document.body.appendChild(div);
				return div;
			}
		});
		const events = "pan zoom resize";
		const mover = () => pop.scheduleUpdate();
		e.target.once("unselect", () => {
			document.body.removeChild(pop.popper);
			e.target.off("position", mover);
			cy.off(events, mover);
		});
		e.target.on("position", mover);
		cy.on(events, mover);
	});

	cy.on("cxttap", async e => {
		if (e.target === cy) {
			// Create node if user right-clicks background
			await handler.addNode({ type: "Empty" }, { position: e.position });
		}
	});
	
	cy.on("ehcomplete", async (e, sourceCytoNode, targetCytoNode, addedElements) => {
		cy.remove(addedElements);
		const srcIndex = sourceCytoNode.data().index;
		const destIndex = targetCytoNode.data().index;
		try {
			await handler.addEdge({ src: srcIndex, dest: destIndex });
		} catch (e) {
			alert(e.message);
		}
	});
}

module.exports = { createGraphView };
