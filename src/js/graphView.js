const cytoscape = require("cytoscape");
const klay = require("cytoscape-klay");
const popper = require("cytoscape-popper");
const edgeHandles = require("cytoscape-edgehandles");
const fs = require("fs");
const path = require("path");
const { launchBassbox } = require("./bassbox");
const { sleep, addEnterListener } = require("./utils");

cytoscape.use(klay);
cytoscape.use(popper);
cytoscape.use(edgeHandles);

/** Loads the Cytoscape graph's stylesheet. */
async function loadStylesheet() {
	return await fs.promises.readFile(path.join(__dirname, "..", "css", "graph.css"), { encoding: "utf8" });
}

/** Converts a Bassbox node to Cytoscape's representation. */
function toCytoNode(node, i) {
	return { data: { id: `${i}`, index: i, label: node.type, node: node } };
}

/** Converts a Bassbox edge to Cytoscape's representation. */
function toCytoEdge(edge) {
	return { data: { id: `${edge.src}->${edge.dest}`, source: `${edge.src}`, target: `${edge.dest}` } };
}

/** Creates a popover HTML element from a Bassbox node. */
function createPopoverElement(node, performUpdate) {
	const updatedNode = Object.assign({}, node);

	const div = document.createElement("div");
	div.classList.add("popover");
	
	for (property in node) {
		const value = node[property];
		const row = document.createElement("p");

		const label = document.createElement("label");
		label.innerText = property;
		row.appendChild(label);
		
		switch (typeof value) {
			case "string":
				const textField = document.createElement("input");
				textField.value = value;
				textField.addEventListener("change", () => updatedNode[property] = textField.value);
				addEnterListener(textField, () => performUpdate(updatedNode));
				row.appendChild(textField);
				break;
			case "number":
				const numField = document.createElement("input");
				numField.type = "number";
				numField.value = value;
				numField.addEventListener("change", () => updatedNode[property] = +numField.value);
				addEnterListener(numField, () => performUpdate(updatedNode));
				row.appendChild(numField);
				break;
			case "boolean":
				const checkBox = document.createElement("input");
				checkBox.type = "check";
				checkBox.checked = value;
				checkBox.addEventListener("change", () => {
					updatedNode[property] = checkBox.checked;
					performUpdate(updatedNode);
				});
				break;
			default:
				break;
		}
		
		div.appendChild(row);
	}
	
	const updateButton = document.createElement("button");
	updateButton.innerText = "Update";
	updateButton.addEventListener("click", () => performUpdate(updatedNode));
	div.appendChild(updateButton);
	
	return div;
}

/** Creates and initializes the Cytoscape graph inside the specified HTML element. */
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
	
	// UI-specific methods that operate directly on the Bassbox graph and/or the Cytoscape view
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
		},
		
		async showNotification(msg) {
			const div = document.createElement("div");
			div.classList.add("popover", "notification");
			div.innerText = msg;
			document.body.appendChild(div);
			await sleep(50);
			div.classList.add("shown");
			await sleep(3000);
			document.body.removeChild(div);
		}
	};
	
	cy.on("select", "node", async e => {
		// Show popover with details about node
		const pop = e.target.popper({
			content: () => {
				const elem = createPopoverElement(e.target.data().node, async updatedNode => {
					const nodeIndex = e.target.data().index;
					try {
						await bassbox.audioGraph.replaceNode(nodeIndex, updatedNode);
					} catch (e) {
						await handler.showNotification(e.message);
					}
				});
				document.body.appendChild(elem);
				return elem;
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
			await handler.showNotification(e.message);
		}
	});
}

module.exports = { createGraphView };
