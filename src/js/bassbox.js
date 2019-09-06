const path = require("path");
const process = require("process");
const childProcess = require("child_process");
const { jsonRpcProxyFrom } = require("./jsonrpc");

function launchBassbox() {
	const exeName = `bassbox${process.platform === "win32" ? ".exe" : ""}`
	const proc = childProcess.execFile(path.join(__dirname, "..", "..", "local", exeName), ["-e", "speaker"]);
	const proxy = jsonRpcProxyFrom(proc.stdout, proc.stdin);
	return {
		audioPlayer: {
			enqueueFile(path) { return proxy.call("audioPlayer.enqueueFile", [path]); },
			play() { return proxy.call("audioPlayer.play", []); },
			pause() { return proxy.call("audioPlayer.pause", []); },
			setVolume(volume) { return proxy.call("audioPlayer.setVolume", [volume]); },
			setLowpassEnabled(enabled) { return proxy.call("audioPlayer.setLowpassEnabled", [enabled]); },
			setHighpassEnabled(enabled) { return proxy.call("audioPlayer.setHighpassEnabled", [enabled]); }
		}
	};
}

module.exports = { launchBassbox };
