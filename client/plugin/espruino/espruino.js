/*
	Support for Espruino development



*/



(function() {
	"use strict";

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
		"../EspruinoTools/libs/utf8.js",
		"../EspruinoTools/plugins/unicode.js",

		"../EspruinoTools/libs/esprima/esprima.js",
		"../EspruinoTools/libs/esprima/esmangle.js",
		"../EspruinoTools/libs/esprima/escodegen.js",
		"../EspruinoTools/plugins/minify.js",
		"../EspruinoTools/plugins/pretokenise.js",
		"../EspruinoTools/plugins/saveOnSend.js",
		"../EspruinoTools/plugins/setTime.js"
		
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

	var espruinoInitialised = false;

	var espruinoConnect;
	var espruinoSendCode;

	EDITOR.plugin({
		desc: "Espruino development",
		load: function loadEspruinoSupport() {

			// todo: Add to language strings!
			espruinoConnect = EDITOR.windowMenu.add("connect/disconnect", ["espruino", 100], toggleConnection);
			espruinoSendCode = EDITOR.windowMenu.add("send code", ["espruino", 200], sendCodeToEspruino);


			init(function() {
				console.log("espruino: EspruinoTools initiated!");

				addProcessors();

			});

		},
		unload: function unloadEspruinoSupport() {

			EDITOR.windowMenu.remove(espruinoConnect);
			EDITOR.windowMenu.remove(espruinoSendCode);

			Espruino = undefined;
			window.$ = undefined;
		}
	});

	function sendCodeToEspruino() {

		var port = "Web Bluetooth";
		var code = EDITOR.currentFile.text;

		sendCode(port, code, function(err, result) {
			if(err) throw err;

			alertBox(result);

		});

	}

	function toggleConnection() {
		if (Espruino.Core.Serial.isConnected()) {
			Espruino.Core.Serial.close();
		} else {
			var serialPort = 'Web Bluetooth';
			term("Connecting to "+serialPort);
			Espruino.Core.Serial.open(serialPort, function(cInfo) {
				Espruino.Core.Serial.setSlowWrite(false, true/*force*/);
				if (cInfo!=undefined) {
					console.log("Device found (connectionId="+ cInfo.connectionId +")");
					Espruino.Core.Notifications.success("Connected to "+serialPort, true);
					term("Connected to "+serialPort);
				} else {
					// fail
					Espruino.Core.Notifications.error("Connection Failed.", true);
					term("Connection Failed.");
				}
			}, function () {
				console.log("Disconnect callback...");
				term("Bluetooth connection closed");
				Espruino.Core.Notifications.warning("Disconnected", true);
			});
		}
	}

	function term(txt) {
		console.log("espruino: term: ", txt);
		//Espruino.Core.Terminal.outputDataHandler(txt+"\r\n");
	}

	function addProcessors() {

		console.log("espruino: typeof Espruino.addProcessor=" + typeof Espruino.addProcessor + " Espruino.initialised=" + Espruino.initialised);

		Espruino.addProcessor("connected", function(data, callback) {
			console.log("Espruino.addProcessor:connected: data=", data);
			callback(data);
		});

		Espruino.addProcessor("disconnected", function(data, callback) {
			console.log("Espruino.addProcessor:disconnected: data=", data);
			callback(data);
		});

		Espruino.addProcessor("getURL", function webideGetURL_processor(obj, callback) {
			console.log("hello world!");
			console.log("Espruino.addProcessor:getURL: obj=", obj);

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

	}

	function init(callback) {
		if (espruinoInitialised) {
			console.log("espruino: Already initialised.");
			return callback();
		}
		espruinoInitialised = true;

		window.$ = function() { return jqShim; };

		loadDependencies(function(err) {
			if(err) throw err;

			// Bodge up notifications
			Espruino.Core.Notifications = {
				success : function(e) { console.log("Espruino.Core.Notifications.success: ", e); },
				error : function(e) { console.error("Espruino.Core.Notifications.error: ", e); },
				warning : function(e) { console.warn("Espruino.Core.Notifications.warning: ", e); },
				info : function(e) { console.log("Espruino.Core.Notifications.info: ", e); },
			};
			Espruino.Core.Status = {
				setStatus : function(e,len) { console.log("Espruino.Core.Status.setStatus: ", e); },
				hasProgress : function(e) { console.log("Espruino.Core.Status.hasProgress: ", e); return false; },
				incrementProgress : function(amt) { console.log("Espruino.Core.Status.incrementProgress: ", amt); }
			};

			// Finally init everything
			jqReady.forEach(function(cb){cb();});
			Espruino.init();
			callback();
		});
	}

	function sendCode(port, code, callback) {
		var response = "";
		init(function() {
			Espruino.Core.Serial.startListening(function(data) {
				data = new Uint8Array(data);
				for (var i=0;i<data.length;i++)
					response += String.fromCharCode(data[i]);
			});
			Espruino.Core.Serial.open(port, function(status) {
				if (status === undefined) {
					console.error("Unable to connect!");
					return callback(new Error("Unable to connect!"));
				}
				Espruino.callProcessor("transformForEspruino", code, function(code) {
					Espruino.Core.CodeWriter.writeToEspruino(code, function() {
						setTimeout(function() {
							Espruino.Core.Serial.close();
						}, 500);
					});
				});
			}, function() { // disconnected
				if (callback)
					callback(null, response);
			});
		});
	};

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
