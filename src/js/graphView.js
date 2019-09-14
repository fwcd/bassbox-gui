const cytoscape = require("cytoscape");
const klay = require("cytoscape-klay");
const popper = require("cytoscape-popper");
const edgeHandles = require("cytoscape-edgehandles");
const fs = require("fs");
const path = require("path");
const { launchBassbox, nodeTemplates } = require("./bassbox");
const { sleep, addEnterListener } = require("./utils");

cytoscape.use(klay);
cytoscape.use(popper);
cytoscape.use(edgeHandles);

/** Loads the Cytoscape graph's stylesheet. */
async function loadStylesheet() {
	return await fs.promises.readFile(path.join(__dirname, "..", "css", "graph.css"), { encoding: "utf8" });
}

/** Converts a Bassbox node to Cytoscape's representation. */
function toCytoNode(node, i, isMaster) {
	const label = node.type + (isMaster ? " (master)" : "");
	return { data: { id: `${i}`, index: i, label: label, node: node } };
}

/** Converts a Bassbox edge to Cytoscape's representation. */
function toCytoEdge(edge) {
	return { data: { id: `${edge.src}->${edge.dest}`, source: `${edge.src}`, target: `${edge.dest}` } };
}

/** Creates a popover HTML element from a Bassbox node. */
function createNodeDetailsEditor(node, updateButtonLabel, performUpdate) {
	const updatedNode = Object.assign({}, node);
	const div = document.createElement("div");
	
	for (const prop in node) {
		if (prop !== "type") {
			const value = node[prop];
			const row = document.createElement("p");

			const label = document.createElement("label");
			label.innerText = `${prop}: `;
			row.appendChild(label);
			
			switch (typeof value) {
				case "string":
					const textField = document.createElement("input");
					textField.value = value;
					textField.addEventListener("change", () => updatedNode[prop] = textField.value);
					addEnterListener(textField, () => performUpdate(updatedNode));
					row.appendChild(textField);
					break;
				case "number":
					const numField = document.createElement("input");
					numField.type = "number";
					numField.value = value;
					numField.addEventListener("change", () => updatedNode[prop] = +numField.value);
					addEnterListener(numField, () => performUpdate(updatedNode));
					row.appendChild(numField);
					break;
				case "boolean":
					const checkBox = document.createElement("input");
					checkBox.type = "checkbox";
					checkBox.checked = value;
					checkBox.addEventListener("change", () => {
						updatedNode[prop] = checkBox.checked;
						performUpdate(updatedNode);
					});
					row.appendChild(checkBox);
					break;
				default:
					if (Array.isArray(value)) {
						const textField = document.createElement("input");
						textField.placeholder = "Enter comma-separated values";
						textField.value = value.join(", ");
						textField.addEventListener("change", () => updatedNode[prop] = textField.value.split(",").map(s => s.trim()));
						addEnterListener(textField, () => performUpdate(updatedNode));
						row.appendChild(textField);
					} else {
						const otherField = document.createElement("input");
						otherField.disabled = true;
						otherField.value = value;
						row.appendChild(otherField);
					}
					break;
			}
			
			div.appendChild(row);
		}
	}
	
	const updateButton = document.createElement("button");
	updateButton.innerText = updateButtonLabel;
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
		elements: graph.nodes.map((node, i) => toCytoNode(node, i, i === graph.master))
			.concat(graph.edges.map(edge => toCytoEdge(edge))),
		layout: {
			name: "klay",
			animate: true,
			padding: 200,
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
		
		async removeNode(index) {
			await bassbox.audioGraph.removeNode(index);
			cy.getElementById(`${index}`).remove();
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
		const target = e.target;
		const pop = target.popper({
			content: () => {
				const details = createNodeDetailsEditor(target.data().node, "Update", async updatedNode => {
					const nodeIndex = target.data().index;
					try {
						await bassbox.audioGraph.replaceNode(nodeIndex, updatedNode);
						Object.assign(target.data(), toCytoNode(updatedNode, nodeIndex).data);
						// TODO: Update view directly, not first once the user pans
					} catch (e) {
						await handler.showNotification(e.message);
					}
				});
				details.classList.add("popover");
				document.body.appendChild(details);
				return details;
			}
		});

		const events = "pan zoom resize";
		const mover = () => pop.scheduleUpdate();
		const unselector = () => {
			document.body.removeChild(pop.popper);
			e.target.off("position", mover);
			document.removeEventListener("keyup", remover);
			cy.off(events, mover);
		};
		const remover = async e => {
			if (e.code === "Delete" || e.code === "Backspace") {
				try {
					await handler.removeNode(target.data().index)
				} catch (e) {
					showNotification(e.message);
				}
				unselector();
			}
		};

		target.once("unselect", unselector);
		target.on("position", mover);
		document.addEventListener("keyup", remover);
		cy.on(events, mover);
	});

	cy.on("cxttap", async e => {
		if (e.target === cy) {
			// Show node creation popover if user right-clicks background
			cy.popper({
				content: () => {
					const div = document.createElement("div");
					
					const select = document.createElement("select");
					div.appendChild(select);
					
					let details = document.createElement("div");
					div.appendChild(details);

					const templates = nodeTemplates(bassbox);
					for (const template in templates) {
						const option = document.createElement("option");
						option.value = JSON.stringify(templates[template]());
						option.innerText = template;
						select.add(option);
					}

					const updateDetailsEditor = () => {
						const newDetails = createNodeDetailsEditor(JSON.parse(select.value), "Create", async updatedNode => {
							try {
								await handler.addNode(updatedNode, { position: e.position });
							} catch (e) {
								handler.showNotification(e.message);
							}
							document.body.removeChild(div);
						});
						div.replaceChild(newDetails, details);
						details = newDetails;
					};
					select.addEventListener("change", updateDetailsEditor);
					updateDetailsEditor();

					div.classList.add("popover");
					document.body.appendChild(div);
					return div;
				},
				renderedPosition: () => e.renderedPosition
			});
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
