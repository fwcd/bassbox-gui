const { lineReader } = require("./utils");

/**
 * A proxy object on which RPC methods can be invoked
 * as if they were present on a normal object.
 */
function scopedProxy(context, scope) {
	return new Proxy({}, {
		get(target, name) {
			const fqName = (scope.length > 0) ? `${scope}.${name}` : name;
			if (context.scopes.includes(name)) {
				return scopedProxy(context, fqName);
			} else {
				return (...args) => new Promise((resolve, reject) => {
					let requestId = context.id++;
					context.deferred[requestId] = { resolve, reject };
					context.procIn.write(JSON.stringify({
						jsonrpc: "2.0",
						id: requestId,
						method: fqName,
						params: args
					}) + "\n");
				});
			}
		}
	});
}

/** Launches a new JSON-RPC client and returns the server proxy. */
function jsonRpcProxyFrom(procOut, procIn, scopes) {
	const context = {
		scopes,
		procIn,
		deferred: {},
		id: 0
	};
	
	lineReader(procOut).onLine(line => {
		const raw = line.trim();
		const response = JSON.parse(raw);
		if (response.id in context.deferred) {
			const deferred = context.deferred[response.id];
			if ("result" in response) {
				deferred.resolve(response.result);
			} else if ("error" in response) {
				const error = response.error;
				deferred.reject(new Error(`${error.code}: ${error.message}`));
			} else {
				deferred.reject(new Error(`Warning: No result in response ${raw}`));
			}
			delete context.deferred[response.id];
		} else {
			console.log(`Warning: Got unrecognized response ${raw}`);
		}
	});
	
	return scopedProxy(context, "");
}

module.exports = { jsonRpcProxyFrom };
