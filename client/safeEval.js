
// A worker for evaluating stuff, for example unit tests

function handleMsg(msg) {
	var obj = msg.data;

	console.log("in evalWorker: obj=", obj);

	var id = obj.id;
	var str = obj.str;
	var error = null; 

	try {
		var result = eval(str);
	}
	catch(err) {
		error = err.message;
	}

	console.log("in evalWorker: str=", str, " result=", result, " error=", error);

	if(typeof result == "object") result = JSON.stringify(result); // Don't want [object object]

	// Might get an DataCloneError: Function object could not be cloned
	try {
		var returnObj = {
			id: id,
			error: error,
			result: result
		}
		self.postMessage(returnObj);
	}
	catch(err) {
		console.error(err);
		var returnObj = {
			id: id,
			error: "internal error",
			result: ""
		}
		self.postMessage(returnObj);
	}

	
	

}

self.addEventListener('message', handleMsg);


