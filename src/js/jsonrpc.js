const { lineReader } = require("./utils");

function jsonRpcProxyFrom(procOut, procIn) {
	const resolvers = {};
	let id = 0;
	
	lineReader(procOut).onLine(line => {
		const raw = line.trim();
		const response = JSON.parse(raw);
		if (response.id in resolvers) {
			resolvers[response.id](response);
			delete resolvers[response.id];
		} else {
			console.log(`Warning: Got unrecognized response ${raw}`);
		}
	});

	return {
		call(method, args) {
			return new Promise(resolve => {
				let requestId = id++;
				resolvers[requestId] = resolve;
				procIn.write(JSON.stringify({
					jsonrpc: "2.0",
					id: requestId,
					method: method,
					params: args
				}) + "\n");
			});
		}
	};
}

module.exports = { jsonRpcProxyFrom };
