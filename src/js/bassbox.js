const path = require("path");
const process = require("process");
const childProcess = require("child_process");
const { jsonRpcProxyFrom } = require("./jsonrpc");

/**
 * Launches an instance of Bassbox and returns the
 * proxy object on which its RPC-accessible methods
 * can be called, e.g.:
 * 
 * ```javascript
 * await launchBassbox().audioPlayer.enqueueFile("path/to/my/song.mp3");
 * ```
 * 
 * For a precise description on the available RPC-methods,
 * check out https://github.com/fwcd/bassbox/tree/master/src/services.
 */
function launchBassbox() {
	const exeName = `bassbox${process.platform === "win32" ? ".exe" : ""}`
	const proc = childProcess.execFile(path.join(__dirname, "..", "..", "local", exeName), ["-e", "speaker"]);
	const services = ["audioPlayer", "audioGraph"];
	return jsonRpcProxyFrom(proc.stdout, proc.stdin, services);
}

/**
 * Fetches a collection of no-argument constructors
 * of various Bassbox nodes.
 */
function nodeTemplates(bassbox) {
	// TODO: Fetch these directly from the provided Bassbox instance
	return {
		Empty() { return {
			type: "Empty"
		} },
		Silence() { return {
			type: "Silence"
		} },
		Volume() { return {
			type: "Volume",
			level: 1.0
		} },
		File() { return {
			type: "File",
			filePath: "",
			paused: false
		} },
		IIRLowpass() { return {
			type: "IIRLowpass",
			cutoffHz: 200.0,
			disabled: false
		} },
		IIRHighpass() { return {
			type: "IIRHighpass",
			cutoffHz: 14000.0,
			disabled: false
		} }
	};
}

module.exports = { launchBassbox, nodeTemplates };
