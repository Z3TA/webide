/*
	Support for Espruino development



*/



(function() {
	"use strict";

	//if(! QUERY_STRING["espruino"] ) return;

	var menuItem;
	var dependenciesLoaded = false;
	var espruinoDeps = [
		"../EspruinoTools/espruino.js",
		"../EspruinoTools/core/utils.js",
		"../EspruinoTools/core/config.js",

		"../EspruinoTools/core/serial.js",
		"../EspruinoTools/core/serial_chrome_serial.js",
		"../EspruinoTools/core/serial_chrome_socket.js",
		"../EspruinoTools/core/serial_node_serial.js",
		"../EspruinoTools/core/serial_web_audio.js",
		"../EspruinoTools/core/serial_web_bluetooth.js",
		"../EspruinoTools/core/serial_web_serial.js",
		"../EspruinoTools/core/serial_websocket_relay.js",
		"../EspruinoTools/core/serial_frame.js",

		"../EspruinoTools/core/terminal.js",
		"../EspruinoTools/core/codeWriter.js",
		"../EspruinoTools/core/modules.js",
		"../EspruinoTools/core/env.js",
		"../EspruinoTools/core/flasher.js",
		"../EspruinoTools/core/flasherESP8266.js",

		"../EspruinoTools/plugins/boardJSON.js",
		"../EspruinoTools/plugins/versionChecker.js",
		"../EspruinoTools/plugins/compiler.js",
		"../EspruinoTools/plugins/assembler.js",
		"../EspruinoTools/plugins/getGitHub.js",
		"../EspruinoTools/plugins/unicode.js",
		"../EspruinoTools/plugins/minify.js",
		"../EspruinoTools/plugins/pretokenise.js",
		"../EspruinoTools/plugins/saveOnSend.js",
		"../EspruinoTools/plugins/setTime.js",

		"../EspruinoTools/libs/utf8.js",

		"../EspruinoTools/libs/esprima/esprima.js",
		"../EspruinoTools/libs/esprima/esmangle.js",
		"../EspruinoTools/libs/esprima/escodegen.js"
	];

	// ---------------
	// Horrible jQuery stubs. We don't want to pull in jQuery itself because it drags in a million other
	// modules that we don't care about, and needs jsDom which has nasty dependency problems
	// ---------------
	var jqReady = [];
	var jqShim = {
		ready : function(cb) { jqReady.push(cb); },
		css : function() {},
		html : function() {},
		width : function() {},
		height : function() {},
		addClass : function() {},
		removeClass : function() {},
		appendTo : function() { return jqShim; },
		show : function() {},
		hide : function() {},
	};
	// ---------------

	var espruinoInitialisedStatus = "";

	var progress;

	var menu_espruinoConnect;
	var menu_espruinoSendCode;
	var menu_espruinoFileExplorer;
	
	var protocol = "espruino";

	EDITOR.plugin({
		desc: "Espruino development",
		load: function loadEspruinoSupport() {

			// todo: Add to language strings!
			menu_espruinoConnect = EDITOR.windowMenu.add("connect/disconnect", [S("tools"), "espruino", 100], toggleConnection);
			menu_espruinoSendCode = EDITOR.windowMenu.add("send code", [S("tools"), "espruino", 200], sendCodeToEspruino);
			menu_espruinoFileExplorer = EDITOR.windowMenu.add("Show files", [S("tools"), "espruino", 300], fileExplorer);

			//init(function() {});

		},
		unload: function unloadEspruinoSupport() {

			EDITOR.windowMenu.remove(menu_espruinoConnect);
			EDITOR.windowMenu.remove(menu_espruinoSendCode);
			EDITOR.windowMenu.remove(menu_espruinoFileExplorer);

			EDITOR.removeProtocol("espruino");

			Espruino = undefined;
			window.$ = undefined;
		}
	});

	function downloadFile(path, returnBuffer, encoding, callback) {

		console.log("espruino:downloadFile:path=" + path);

		if(callback == undefined && typeof encoding == "function") {
			callback = encoding;
			encoding = "utf8";
		}

		if(callback == undefined && typeof returnBuffer == "function") {
			callback = returnBuffer;
			returnBuffer = false;
		}

		if(callback == undefined || typeof callback != "function") throw new Error("No callback function! callback=" + callback);

		var fileName = path.replace(protocol + "://", "");

		Espruino.Core.Utils.downloadFile(fileName, function(contents) {
			if (contents===undefined) {
				var error = new Error("Unable to read file (timeout) path=" + path);
				error.code = "ENOENT";
				return callback(error);
			}
			
			UTIL.hash(contents, function(err, hash) {
				if(err) return callback(null, path, contents);
				callback(null, path, contents, hash);
			});
			
		});
	}

	function fileExplorer() {
		
		if( isConnected() ) explore(null, lastConnection); 
		else connect(explore);

		function explore(err, status) {
			if(err) return alertBox(err.message);

			EDITOR.fileExplorer(protocol + "://" + status.portName + "/");
		}
	}

	function getFileList(path, callback) {
		//callback(['"a"','"b"','"c"']);

		Espruino.Core.Utils.executeStatement(`require('Storage').list().forEach(x=>print(JSON.stringify(x)));`, function(files) {
			var fileList = [];
			try {
				fileList = Espruino.Core.Utils.parseJSONish("["+files.trim().replace(/\n/g,",")+"]");
				fileList.sort();
				// fileList.sort(); // ideally should ignore first char for sorting
			} catch (e) {
				return callback(e);
			}

			fileList = fileList.map(function(file) {
				return {
					type: "-",
					name: file,
					path: protocol + "://" + file, //
					size: 0,
					date: new Date()
				};
			});

			callback(null, fileList);
		});
	}

	function sendCodeToEspruino() {
		var code = EDITOR.currentFile.text;
		sendCode(code, function(err, result) {
			if(err) throw err;

			if(result) alertBox(result);
		});

	}

	function term(txt) {
		console.log("espruino: term: ", txt);
		//Espruino.Core.Terminal.outputDataHandler(txt+"\r\n");
	}

	function addProcessors() {

		console.log("espruino: typeof Espruino.addProcessor=" + typeof Espruino.addProcessor + " Espruino.initialised=" + Espruino.initialised);

		Espruino.addProcessor("connected", function(data, callback) {
			console.log("espruino:Espruino.addProcessor:connected: data=", data);
			callback(data);

			EDITOR.addVirtualConnection(protocol, data.portName);
		});

		Espruino.addProcessor("disconnected", function(data, callback) {
			console.log("espruino:Espruino.addProcessor:disconnected: data=", data);
			callback(data);

			EDITOR.removeVirtualConnection(protocol, data.portName);
		});

		Espruino.addProcessor("getURL", function webideGetURL_processor(obj, callback) {
			console.log("espruino:Espruino.addProcessor:getURL: obj=", obj);

			var reJson = /\/json\/(\w*\.json)/;
			var match = obj.url.match(reJson);
			if(!match) {
				console.log("espruino: Not a json request: " + obj.url);
				return callback(obj);
			}
			else {
				obj.url = document.location.protocol + "//" + document.location.host + "/plugin/espruino/json/" + match[1];
				console.log("espruino: URL rewritten: " + obj.url);
				callback(obj);
			}
		});

		// ### Terminal
		Espruino.addProcessor("terminalClear", function espruino_terminalClear() {
			console.log("espruino:terminalClear: arguments=" + JSON.stringify(arguments));
		});

		Espruino.addProcessor("terminalPrompt", function espruino_terminalPrompt() {
			console.log("espruino:terminalPrompt: arguments=" + JSON.stringify(arguments));
		});

		Espruino.addProcessor("terminalNewLine", function espruino_terminalNewLine() {
			console.log("espruino:terminalNewLine: arguments=" + JSON.stringify(arguments));
		});

		// ### Processors (misc)
		Espruino.addProcessor("environmentVar", function espruino_environmentVar(environmentData, callback) {
			console.log("espruino:environmentVar: environmentData=" + JSON.stringify(environmentData, null, 2));
			callback(environmentData);
		});

		Espruino.addProcessor("boardJSONLoaded", function espruino_boardJSONLoaded(env, callback) {
			console.log("espruino:boardJSONLoaded: env=" + JSON.stringify(env, null, 2));
			callback(env);
		});

		/*
			Other used processors are:
			transformModuleForEspruino: call back with an object containing name and code (preferably minified and optimized)
			getModule: call back with an object containing property moduleCode
		*/

	}

	function init(callback) {
		if (espruinoInitialisedStatus == "finish") {
			console.log("espruino: Already initialised.");
			return callback(null);
		}
		if (espruinoInitialisedStatus == "loading") {
			var error = new Error("Esprouino dependencies has not yet loaded... (check dev console for errors)");
			error.code = "LOADING";
			return callback(error);
		}

		espruinoInitialisedStatus = "loading";

		window.$ = function() { return jqShim; };

		loadDependencies(function(err) {
			if(err) return callback(err);

			// Bodge up notifications
			Espruino.Core.Notifications = {
				success : function(e) { console.log("espruino:Espruino.Core.Notifications.success: ", e); },
				error : function(e) { console.error("espruino:Espruino.Core.Notifications.error: ", e); },
				warning : function(e) { console.warn("espruino:Espruino.Core.Notifications.warning: ", e); },
				info : function(e) { console.log("espruino:Espruino.Core.Notifications.info: ", e); },
			};
			Espruino.Core.Status = {
				setStatus : function(e,len) {
					console.log("espruino:Espruino.Core.Status.setStatus: ", e, len);
					if(len) {
						if(!progress) progress = document.getElementById("progress");
						progress.value = 0;
						progress.max = len;
						progress.style.display="block";
						EDITOR.resizeNeeded();
					}
				},
				
				hasProgress : function(e) { console.log("espruino:Espruino.Core.Status.hasProgress: ", e); return false; },
				incrementProgress : function(amt) {
					console.log("espruino:Espruino.Core.Status.incrementProgress: ", amt);
					progress.value = progress.value + amt;
					if(progress.value == progress.max) {
						progress.style.display="none";
						EDITOR.resizeNeeded();
					}
				}
			};

			// Finally init everything
			jqReady.forEach(function(cb){cb();});
			Espruino.init();

			espruinoInitialisedStatus = "finish";

			console.log("espruino: EspruinoTools initiated!");

			addProcessors();

			EDITOR.addProtocol("espruino", {list: getFileList, read: downloadFile});

			callback(null);
		});
	}

	function toggleConnection() {
		console.log("espruino:toggleConnection!");
		if (isConnected()) disconnect();
		else connect();
	}

	//var serialDataBuffer = "";
	function gotSerialData(data) {
		data = new Uint8Array(data);
		var buffer = "";
		for (var i=0;i<data.length;i++) {
			buffer += String.fromCharCode(data[i]);
		}

		//serialDataBuffer += buffer;

		console.log("espruino:gotSerialData: buffer=" + buffer);
	}

	var lastConnection = {port: undefined, portName: undefined};

	function isConnected(port) {
		if(!dependenciesLoaded) return false;
		return Espruino.Core.Serial.isConnected() && (port==undefined || lastConnection.port==port);
	}
	
	function connect(port, callback, disconnectCallback) {
		init(function(err) {
			if(err) return alertBox(err.message);

			console.log("espruino:connect port=" + port);

			if(typeof port == "function") {
				disconnectCallback = callback;
				callback = port;
				port = undefined;
			}

			if(port == undefined) port = "Web Bluetooth";

			if(disconnectCallback == undefined) disconnectCallback = _disconnectCallback;

			if(isConnected(port)) throw new Error("espruino:connect: Already connected on " + JSON.stringify(lastConnection));
			else if (isConnected()) disconnect();
				
			Espruino.Core.Serial.startListening(gotSerialData);

			Espruino.Core.Serial.open(port, connectCallback, disconnectCallback);

			function connectCallback(status) { // Middleman function to populate err callback convention
				console.log("espruino:connect:connectCallback! arguments=" + JSON.stringify(arguments, null, 2));

				setTimeout(function() { // Escape any promise to prevent it from swallowing any errors / silently fail
					
					console.log("espruino:connect:status=" + JSON.stringify(status, null, 2));

					if (status === undefined) {
						console.error("espruino: Unable to connect!");
						Espruino.Core.Notifications.error("Connection Failed.", true);
						if(callback) callback(new Error("Unable to connect!"));
						else alertBox("Failed to connect to Espruino", "ECONFAILED", "error");

						return;
					}

					console.log("espruino:connect: Device found (connectionId="+ status.connectionId +")");

					Espruino.Core.Serial.setSlowWrite(false, true/*force*/); // Why?

					lastConnection = {port: port, portName: status.portName};

					if(callback) callback(null, status);
					else alertBox("Connected to Espruino:\n" + JSON.stringify(status, null, 2));
				
				},0);
			}

			function receiveCallback() {
				console.log("espruino:connect:receiveCallback! arguments=" + JSON.stringify(arguments, null, 2));
			}

		});
	}

	function disconnect() {
		console.log("espruino:disconnect: Espruino.Core.Serial.isConnected()=" + Espruino.Core.Serial.isConnected());
		if (Espruino.Core.Serial.isConnected()) {
			Espruino.Core.Serial.close();
			console.log("espruino:disconnect: Called Espruino.Core.Serial.close()");
		}
	}

	function _disconnectCallback() {
		console.log("espruino: Disconnected! (_disconnectCallback)");
		Espruino.Core.Notifications.warning("Disconnected", true);
	}

	function sendCode(code, callback) {
		if(code == undefined) throw new Error("espruino:sendCode: code=" + code);

		init(function(err) {
			if(err) return alertBox(err.message);

			if (isConnected()) send();
			else connect(send);

			function send(err) {
				if(err) throw err;

				Espruino.callProcessor("transformForEspruino", code, function(code) {
					Espruino.Core.CodeWriter.writeToEspruino(code, function() {
						console.log("espruino: Sent code to espruino!");
						//disconnectWhenInactive();
					});
				});
			}

		});
	};

	function disconnectWhenInactive() {
		setTimeout(function() {
			Espruino.Core.Serial.close();
		}, 500);
	}

	/** Execute an expression on Espruino, call the callback with the result */
	function executeExpr(port, expr, callback) {
		var exprResult = undefined;
		init(function() {
			Espruino.Core.Serial.startListening(function(data) { });
			Espruino.Core.Serial.open(port, function(status) {
				if (status === undefined) {
					console.error("Unable to connect!");
					return callback();
				}
				Espruino.Core.Utils.executeExpression(expr, function(result) {
					setTimeout(function() {
						Espruino.Core.Serial.close();
					}, 500);
					exprResult = result;
				});
			}, function() { // disconnected
				if (callback) callback(exprResult);
			});
		});
	};

	/** Execute a statement on Espruino, call the callback with what is printed to the console */
	function executeStatement(port, expr, callback) {
		var exprResult = undefined;
		init(function() {
			Espruino.Core.Serial.startListening(function(data) { });
			Espruino.Core.Serial.open(port, function(status) {
				if (status === undefined) {
					console.error("Unable to connect!");
					return callback();
				}
				Espruino.Core.Utils.executeStatement(expr, function(result) {
					setTimeout(function() {
						Espruino.Core.Serial.close();
					}, 500);
					exprResult = result;
				});
			}, function() { // disconnected
				if (callback) callback(exprResult);
			});
		});
	};

	/** Flash the given firmware file to an Espruino board. */
	function flash(port, filename, flashOffset, callback) {
		if (typeof flashOffset === 'function') {
			// backward compatibility if flashOffset is missed
			callback = flashOffset;
			flashOffset = null;
		}

		var code = fs.readFileSync(filename, {encoding:"utf8"});
		init(function() {
			Espruino.Core.Serial.startListening(function(data) { });
			Espruino.Core.Serial.open(port, function(status) {
				if (status === undefined) {
					console.error("Unable to connect!");
					return callback();
				}
				var bin = fs.readFileSync(filename, {encoding:"binary"});
				Espruino.Core.Flasher.flashBinaryToDevice(bin, flashOffset, function(err) {
					console.log(err ? "Error!" : "Success!");
					setTimeout(function() {
						Espruino.Core.Serial.close();
					}, 500);
				});
			}, function() { // disconnected
				if (callback) callback();
			});
		});
	};

	function loadDependencies(callback) {
		if(dependenciesLoaded) return callback(null);

		var abort = false;

		// Load the main script first
		var counter = 1;
		var scriptsToLoad = espruinoDeps.slice(); // Copy array values
		EDITOR.loadScript(espruinoDeps[0], function(err) {
			if(err) return callback(err);

			scriptsToLoad.splice(scriptsToLoad.indexOf(espruinoDeps[0]), 1);

			// Load the rest
			for (var i=1; i<espruinoDeps.length; i++) {
				loadDep(espruinoDeps[i]);
			}

		});

		function doneMaybe() {
			if(counter == espruinoDeps.length) {
				console.log("espruino: All dependencies loaded!");
				dependenciesLoaded = true;
				callback(null);
				callback = null; // throw error if it's called again
			}
			else {console.log("espruino: Loaded " + counter + " of " + espruinoDeps.length + " dependencies. Waiting for " + JSON.stringify(scriptsToLoad) + "");}
		}

		function loadDep(src) {
			if(abort) return;

			EDITOR.loadScript(src, depLoaded);

			function depLoaded(err) {
				if(abort) return;

				counter++;
				if(err) {
					var error = new Error("espruino: Unable to load dependency: " + src)
					return callback(error);
				}

				console.log("espruino: Loaded " + src);

				scriptsToLoad.splice(scriptsToLoad.indexOf(src), 1);

				doneMaybe();
			}
		}
	}

})();
