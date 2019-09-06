const path = require("path");
const process = require("process");
const childProcess = require("child_process");
const { jsonRpcProxyFrom } = require("./jsonrpc");

function launchBassbox() {
	const exeName = `bassbox${process.platform === "win32" ? ".exe" : ""}`
	const proc = childProcess.execFile(path.join(__dirname, "..", "..", "local", exeName), ["-e", "speaker"]);
	const services = ["audioPlayer"];
	return jsonRpcProxyFrom(proc.stdout, proc.stdin, services);
}

module.exports = { launchBassbox };
