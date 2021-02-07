/*
	
	Q: How can I listen for events from the LSP!? like workspace/applyEdit !?
	
	
*/

try {
	var rpc = require("vscode-jsonrpc"); // Issues in Node v4.2.6
}
catch(err) {
	console.log("Unable to load optional module(s): " + err.message);
}
if(!rpc) console.log("Unable to load module: vscode-jsonrpc");


var module_child_process = require("child_process");

var languageServers = {};

var LSP = {

	start: function(user, json, callback) {
		// Spawn a new language server
		
		if(!rpc) return callback(new Error("Module vscode-jsonrpc not loaded!"));

		if(!json.language) return callback(new Error("No language specified!"));
		
		if(languageServers.hasOwnProperty(language)) {
			return callback(new Error("Language server forlanguage=" + language + " already started or starting!"));
		}

		/*
			The LSP will scan all files, so we don't want to set the root to the root
		*/
		
		var rootDir = json.rootDir || user.homeDir + "nodejs_examples/";
		var language = json.language; // Note: Use the language-id specified by LSP protocol. eg. javascript for JavaScript, php for PHP, cpp for C++
		
		if(json.bin && json.args) {
			var binary = json.bin;
			var args = json.args;
		}
		else {
			
			var binary = "node";
		
			/*
			
				Users must manually install each language server in their home dir!
			
				git clone https://github.com/sourcegraph/javascript-typescript-langserver.git /lsb/
				cd javascript-typescript-langserver
				npm install
				npm run build
			
			
				todo: Make a shared folder for all users where all language servers are installed. eg. /share/lsp/...
				or use /usr/share !
			
			*/
		
			if(language == "javascript") {
				//var args = ["./flow/node_modules/flow-bin/cli.js", "lsp"];
				var args = ["./javascript-typescript-langserver/lib/language-server-stdio.js"];
			}
			else {
				return callback(new Error("A language server do not exist for language=" + language + " ... (did you use the correct lanuage-id specified by the LSP protocol?)"))
			}
		}
		
		console.log("Starting LSP server: binary=" + binary + " args=" + JSON.stringify(args));
		
		var childProcess = module_child_process.spawn(binary, args);
		
		// Debug
		
		childProcess.on("error", function(err) {
			console.log("Language server for " + language + " error: err.message=" + err.message);
			//delete languageServers[json.language];
		});
		childProcess.on("close", function(code) {
			console.log("Language server for " + language + " close: code=" + code);
			delete languageServers[json.language];
			
			user.send({lspClose: {language: language, bin: binary, code: code}});
			
		});
		
		
		if(childProcess.stdout && childProcess.stderr) {
			childProcess.stdout.on("data", function(data) {
				console.log("" + language + " LSP stdout: " + data.toString());
			});
			
			childProcess.stderr.on("data", function(data) {
				console.log("" + language + " LSP stderr: " + data.toString());
			});
			
		}
		else {
			console.log("childProcess.stdout=" + childProcess.stdout + " childProcess.stderr=" + childProcess.stderr);
			
			callback(new Error("Did not get a stdout or stderr stream from bin=" + binary + " with args=" + JSON.stringify(args)));
			
			/*
				See the server log for more info! Example problem:
				Language server for javascript error: err.message=spawn /.npm-packages/bin/typescript-language-server EACCES
				
				
			*/
			
			childProcess.kill();
			
			return;
		}
		
		
		
		// Use the RPC module for easier communication
		
		var connection = rpc.createMessageConnection( new rpc.StreamMessageReader(childProcess.stdout), new rpc.StreamMessageWriter(childProcess.stdin), {
			error: function(err) {
				console.log("" + language + " LSP-RSCP error: " + err.message);
			}
		});
		
		languageServers[language] = connection;
		
		connection.listen();
		
		function ready(resp) {
			console.log("LSP for language=" + language + " ready!");
			callback(null, resp);
			callback = null;
		}
		
		function initError(err) {
			console.log("initError: err=" + err);
			callback(err);
			callback = null;
		}
		
		connection.sendRequest("initialize", {
			processId: process.pid,
			rootPath: rootDir,
			rootUri: "file://" + rootDir,
			initializationOptions: {},
			capabilities: {
				completion: {
					dynamicRegistration: true,
					completionItem: {
						snippetSupport: true,
						commitCharactersSupport: true,
						documentationFormat: true,
						deprecatedSupport: true,
						preselectSupport: true,
						contextSupport: true
					}
				}
			}
		}).then(ready).catch(initError);
		
	},
	
	req: function req(user, json, callback) {
		
		if(!json.language) return callback(new Error("No language specified!"));
		if(!json.method) return callback(new Error("No method specified!"));
		if(!json.options) return callback(new Error("No options specified!"));
		
		var connection = languageServers[json.language];
		
		if(!connection) {
			var error = new Error("Language server for " + json.language + " has not started or got an error");
			error.code = "ENOENT";
			return callback(error);
		}
		
		console.log("request json=" + JSON.stringify(json));

		connection.sendRequest(json.method, json.options).then(function(resp) {
			console.log("request resp: " + JSON.stringify(resp, null, 2));
			callback(null, resp);
			
		}).catch(function(err) {
			console.log("request error: " + err.message);
			callback(err);
		});
	},
	
	notify: function(user, json, callback) {

		if(!json.language) return callback(new Error("No language specified!"));
		if(!json.method) return callback(new Error("No method specified!"));
		if(!json.options) return callback(new Error("No options specified!"));
		
		var connection = languageServers[json.language];
		
		if(!connection) {
			var error = new Error("Language server for " + json.language + " has not started or got an error");
			error.code = "ENOENT";
			return callback(error);
		}
		
		var notification = new rpc.NotificationType(json.method);
		
		connection.sendNotification(notification, json.options);
		
		// The client expects a callback... does the LSP server give a resp/acknowledge? Then we could listen for that before calling back
		callback(null, true);

	}
	
}

module.exports = LSP;


