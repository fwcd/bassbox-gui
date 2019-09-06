function sleep(ms) {
	return new Promise(resolve => setTimeout(ms, resolve()));
}

// An async iterator over the lines in a readable
function lineReader(readable) {
	let buffer = "";
	let lines = [];
	let waitQueue = [];
	let lineCallbacks = [];

	readable.on("data", data => {
		buffer += data;
		const newLines = buffer.split(/[\r\n]+/);
		buffer = newLines.pop();
		lines.push(...newLines);
		if (lines.length > 0) {
			waitQueue.forEach(cb => cb(lines.shift()));
			waitQueue = [];
		}
		if (newLines.length > 0) {
			lineCallbacks.forEach(cb => newLines.forEach(line => cb(line)));
		}
	});

	return {
		next() {
			return new Promise(resolve => {
				if (lines.length > 0) {
					resolve(lines.shift());
				} else {
					waitQueue.push(resolve);
				}
			});
		},
		
		onLine(callback) {
			lineCallbacks.push(callback);
		}
	}
}

module.exports = { lineReader };
