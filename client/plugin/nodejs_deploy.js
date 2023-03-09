(function() {
	"use strict";
	
	var winMenuProdDeploy, winMenuProdRestart, winMenuProdStop, winMenuProdRemove, winMenuProdList;
	var activated = false;
	var deployedScriptWidget;
	var scriptList;
	var pwDate = new Date();
	var tmpPw = "";
	var dialogCode = "PROD_DEPL";

	EDITOR.plugin({
		desc: "Allows deoploying Node.js scripts",
		load: function loadNodeJsDeploy() {
			
			// Make sure init service is running before activating the plugin
			if(CLIENT.connectionId) checkInitService();
			else CLIENT.on("loginSuccess", checkInitServiceOnceLoggedIn);
			
			function checkInitServiceOnceLoggedIn() {
				CLIENT.removeEvent("loginSuccess", checkInitServiceOnceLoggedIn);
				checkInitService();
			}
			
			function checkInitService() {
				console.log("nodejs_deploy: Checking of node_init service is available...");
				CLIENT.cmd("nodejs_init_ping", {}, function(err, resp) {
					if(err) {
						console.warn("nodejs_deploy: Init serivice problem: " + err.message);
						
						// Should we keep checking in case the service comes online !?
						// or add a menu entry for connecting to prod service !?
						if(EDITOR.settings.devMode) setTimeout(checkInitService, 5000);
					
						return;
					}
					
					if(!resp.online) {
						console.warn("nodejs_deploy: Init serivice not online! " + JSON.stringify(resp));
					}
					else {
						
						var keyF1 = 112;
						var keyF3 = 114;
						EDITOR.bindKey({desc: S("deploy_current_nodejs_project"), fun: prodDeployFile, charCode: keyF1, combo: CTRL});
						EDITOR.bindKey({desc: S("restart_nodejs_project_in_production"), fun: prodRestartFile, charCode: keyF1, combo: SHIFT + CTRL});
						EDITOR.bindKey({desc: S("stop_nodejs_project_in_production"), fun: prodStopFile, charCode: keyF3, combo: CTRL});
						EDITOR.bindKey({desc: S("remove_nodejs_project_from_production"), fun: prodRemoveFile, charCode: keyF3, combo: SHIFT + CTRL});
						
						winMenuProdDeploy = EDITOR.windowMenu.add(S("deploy_to_production"), ["Node.js", 5], prodDeployFile, "top");
						winMenuProdRestart = EDITOR.windowMenu.add(S("restart_production"), ["Node.js", 5], prodRestartFile);
						winMenuProdStop= EDITOR.windowMenu.add(S("stop_production"), ["Node.js", 5], prodStopFile);
						winMenuProdRemove = EDITOR.windowMenu.add(S("remove_from_production"), ["Node.js", 5], prodRemoveFile, "bottom");
						winMenuProdList = EDITOR.windowMenu.add("List deployed scripts", ["Node.js", 5], nodejsProdList, "bottom");

						var discoveryItem = document.createElement("img");
						discoveryItem.setAttribute("id", "deployDiscovery");
						discoveryItem.src = "gfx/upload.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
						discoveryItem.title = S("nodejs_deploy") + " (" + EDITOR.getKeyFor(prodDeployFile) + ")";
						discoveryItem.onclick = deployFromDiscoveryBar;
						EDITOR.discoveryBar.add(discoveryItem, 90);
						
						activated = true;
					}
				});
			}
			},
		unload: function unloadNodeJsDeploy() {
			
			if(!activated) return;
			
			EDITOR.unbindKey(prodDeployFile);
			EDITOR.unbindKey(prodRestartFile);
			EDITOR.unbindKey(prodStopFile);
			EDITOR.unbindKey(prodRemoveFile);
			
			EDITOR.windowMenu.remove(winMenuProdDeploy);
			EDITOR.windowMenu.remove(winMenuProdRestart);
			EDITOR.windowMenu.remove(winMenuProdStop);
			EDITOR.windowMenu.remove(winMenuProdRemove);
			EDITOR.windowMenu.remove(winMenuProdList);

		},
	});
	
	function askForPassword(msg, callback) {

		var expireTime = 10*60*1000;
		var timeSinceLastPrompt = pwDate && (new Date())-pwDate;

		console.log("nodejs_deploy: askForPassword: pwDate=" + pwDate + " timeSinceLastPrompt=" + timeSinceLastPrompt + " expireTime=" + expireTime);

		if(tmpPw && timeSinceLastPrompt < expireTime) return callback(tmpPw);

		promptBox("Enter password " + (msg ? msg:""), {isPassword: true, dialogDelay: 0}, function(pw) {
			tmpPw = pw;
			pwDate = new Date();

			callback(pw);
		});
	}

	function nodejsProdList() {
		if(!deployedScriptWidget) deployedScriptWidget = EDITOR.createWidget(buildDeployedScriptManager);
		
		winMenuProdList.hide();

		askForPassword(" in order to list scripts:", function (pw) {
			CLIENT.cmd("nodejs_init_list", {pw: pw}, function(err, resp) {
				if(err) {
					return alertBox(err.message, dialogCode);
				}

				console.log("nodejs_deploy: nodejsProdList: " + JSON.stringify(resp, null, 2));

				if(!deployedScriptWidget.mainElement) deployedScriptWidget.show(); // Build the UI

				while (scriptList.firstChild) scriptList.removeChild(scriptList.lastChild); // Empty list
				
				if(resp.scripts.length == 0) {
					var tr = document.createElement("tr");
					var td = document.createElement("td");
					td.innerText = "No deployed services found";
					tr.appendChild(td);
					scriptList.appendChild(tr);
				}
				else {
					for(var script in resp.scripts) {
					scriptList.appendChild( makeListItem(resp.scripts[script]) );
				}
				}
				deployedScriptWidget.show(); // Will call EDITOR.resizeNeeded();

			});
		});
	}

	function makeListItem(script) {
		console.log("nodejs_deploy:makeListItem: script=" + JSON.stringify(script));
		// {"main":"/home/ltest1/.webide/prod/hello_world/hello.js","name":"hello_world","pathToFolder":"/home/ltest1/.webide/prod/hello_world/","log":"/home/ltest1/log/hello_world.log","running":true}

		var status = script.status;
		
		var tr = document.createElement("tr");

		var name = document.createElement("td");
		name.innerText = script.name;

		var tdStatus = document.createElement("td");
		tdStatus.innerText = status;

		var actions = document.createElement("td");
		
		var nameOfFolder = UTIL.getFolderName(script.pathToFolder);

		var openLog = document.createElement("button");
		openLog.innerText = "Open log";
		openLog.classList.add("button");
		openLog.classList.add("half");
		openLog.onclick = function() {
			EDITOR.openFile(script.log, {show: true, tail: true});
		}

		var restart = document.createElement("button");
		restart.innerText = "(Re)start";
		restart.classList.add("button");
		restart.classList.add("half");
		restart.onclick = function() {
			prodRestart(nameOfFolder, function() {
				// ignore callback error because we already got a dialog about it
				nodejsProdList(); // Refresh list
			});
		}

		var stop = document.createElement("button");
		stop.innerText = "Stop";
		stop.classList.add("button");
		stop.classList.add("half");
		stop.onclick = function() {
			prodStop(nameOfFolder, function() {
				// ignore callback error because we already got a dialog about it
				nodejsProdList(); // Refresh list
			});
		}

		var remove = document.createElement("button");
		remove.innerText = "Remove";
		remove.classList.add("button");
		remove.classList.add("half");
		remove.onclick = function() {
			prodRemove(nameOfFolder, function() {
				// ignore callback error because we already got a dialog about it
				nodejsProdList(); // Refresh list
			});
		}

		actions.appendChild(openLog);
		actions.appendChild(restart);
		actions.appendChild(stop);
		actions.appendChild(remove);

		tr.appendChild(name);
		tr.appendChild(tdStatus);
		tr.appendChild(actions);

		return tr;
	}

	function buildDeployedScriptManager() {

		var main = document.createElement("div");

		var table = document.createElement("table");
		table.classList.add("data");

		var thead = document.createElement("thead");
		var tbody = document.createElement("tbody");

		var tr = document.createElement("tr");

		var name = document.createElement("th");
		name.innerText = "Name";

		var status = document.createElement("th");
		status.innerText = "Status";

		var actions = document.createElement("th");
		actions.innerText = "Actions";

		tr.appendChild(name);
		tr.appendChild(status);
		tr.appendChild(actions);
		
		thead.appendChild(tr);
		
		table.appendChild(thead);
		table.appendChild(tbody);

		scriptList = tbody;

		main.appendChild(table);


		var refreshButton = document.createElement("button");
		refreshButton.innerText = "Refresh";
		refreshButton.classList.add("button");
		refreshButton.onclick = function() {
			nodejsProdList();
		}

		var closeButton = document.createElement("button");
		closeButton.innerText = "Close";
		closeButton.classList.add("button");
		closeButton.onclick = function() {
			deployedScriptWidget.hide();
		}

		main.appendChild(refreshButton);
		main.appendChild(closeButton);


		return main;
	}

	function deployFromDiscoveryBar() {
		prodDeployFile(EDITOR.currentFile);
	}
	
	function prodStopFile(currentFile) {
		console.log("prodStopFile: currentFile=" + currentFile && currentFile.path);
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) return alertBox(err.message, dialogCode);

			var nameOfFolder = UTIL.getFolderName(folder);
			prodStop(nameOfFolder);
		});
		return false;
	}

	// stop and start should only require the name (of the folder)

	function prodStop(nameOfFolder, callback) {
		console.log("nodejs_deploy:prodStop: nameOfFolder=" + nameOfFolder);
		var msg = "Enter password to stop " + nameOfFolder+ " in production:";
		askForPassword(msg, function(pw) {
			if(pw == null) {
				console.log("nodejs_deploy:prodStop: nameOfFolder=" + nameOfFolder + " No password provided!");
				if(callback) callback(new Error("No password given"));
				return;
			}
			CLIENT.cmd("nodejs_init_stop", {folder: UTIL.trailingSlash(nameOfFolder), pw: pw}, function(err, resp) {
				console.log("nodejs_deploy:prodStop:nodejs_init_stop: err=" + JSON.stringify(err) + " resp=" + JSON.stringify(resp));

				if(err) alertBox("Unable to stop " + nameOfFolder + ": " + err.message, dialogCode);
				else alertBox(nameOfFolder + " stopped!", dialogCode);

				if(callback) callback(err);
			});
		});
	}
	
	function prodRemoveFile(currentFile) {
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) return alertBox(err.message, dialogCode);
			var nameOfFolder = UTIL.getFolderName(folder);
			 prodRemove(nameOfFolder);
		});
		return false;
	}

	function prodRemove(nameOfFolder, callback) {
		var msg = "Enter password to remove " + nameOfFolder + " from production:"
		askForPassword(msg, function(pw) {
			if(pw == null) {
				if(callback) callback(new Error("No password given"));
				return;
			}

			CLIENT.cmd("nodejs_init_remove", {folder: UTIL.trailingSlash(nameOfFolder), pw: pw}, function(err, resp) {
				console.log("nodejs_deploy:nodejs_init_remove: " + JSON.stringify(resp, null, 2) );
				if(err) alertBox("Unable to remove " + nameOfFolder + ": " + err.message, dialogCode);
				else alertBox(nameOfFolder + " removed from production!", dialogCode);

				if(callback) callback(err);
			});
			});
	}
	
	function prodRestartFile(currentFile) {
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) return alertBox(err.message, dialogCode);

			var nameOfFolder = UTIL.getFolderName(folder);
			prodRestart(nameOfFolder);
		});
		return false;
	}

	function prodRestart(nameOfFolder, callback) {
		var msg = "Enter password to restart " + nameOfFolder + " in production:";
		askForPassword(msg, function(pw) {
			if(pw == null) {
				if(callback) callback(new Error("No password given"));
				return;
			}

			CLIENT.cmd("nodejs_init_restart", {folder: UTIL.trailingSlash(nameOfFolder), pw: pw}, function(err, resp) {
				if(err) alertBox("Unable to restart " + nameOfFolder + ": " + err.message, dialogCode);
				else alertBox(nameOfFolder + " restarted!", dialogCode);

				if(callback) callback(err);
			});
		});
	}
	
	function getProjFolder(currentFile, callback) {
		if(!currentFile) throw new Error("currentFile=" + currentFile);

		var filePath = currentFile.path;

		var folders = UTIL.getFolders(filePath);
		
		var folder = folders.pop();
		
		readPj(folder);
		
		function readPj(folder) {
			EDITOR.readFromDisk(folder + "package.json", function fileRead(readFileErr, filePath, fileContent) {
				if(readFileErr) {
					if(readFileErr.code == "ENOENT" && folders.length > 0) {
						folder = folders.pop();
						readPj(folder);
					}
					else if(folders.length == 0) {
						callback(new Error("Unable to find a package.json in " + UTIL.getDirectoryFromPath(filePath) + " and it's parent directories" ));
					}
					else {
						throw readFileErr;
					}
				}
				else {
					
					// Found a package.json!
					try {
						var json = JSON.parse(fileContent);
					}
					catch(parseErr) {
						return callback(new Error("Failed the parse " + filePath + "! " + parseErr.message));
					}
					
					callback(null, folder, json);
					
				}
			});
		}
	}
	
	function prodDeployFile(file) {
		if(!file) return alertBox("Open the file (main script) you want to deploy then try again");

		prodDeploy(file.path, function(err) {
			if(err) alertBox(err.message);
		});
	}

	function prodDeploy(fileOrPath, callback) {
		
		// Figure out what folder (project) the user wants to deploy ...
		
		if(typeof fileOrPath == "string") {
			var filePath = fileOrPath;
		}
		else if(typeof fileOrPath.path != "undefined") {
			var filePath = fileOrPath.path;
		}
		else {
			throw new Error("prodDeployFile: " + typeof fileOrPath + " fileOrPath=" + fileOrPath);
		}

		if(callback && typeof callback != "function") throw new Error("prodDeployFile: Not a function: (" + typeof callback + ") callback=" + callback);

		var folders = UTIL.getFolders(filePath);
		
		var folder = folders.pop();
		
		readPj(folder);
		
		return false;
		
		function readPj(folder) {
			if(folder == undefined) throw new Error("folder=" + folder);
			
			//console.log("nodejs_deploy: Looking for package.json in folder=" + folder + " ..."); 
			EDITOR.readFromDisk(folder + "package.json", function fileRead(readFileErr, filePath, fileContent) {
				if(folder == undefined) throw new Error("folder=" + folder);
				
				if(readFileErr) {
					if(readFileErr.code == "ENOENT" && folders.length > 0) {
						folder = folders.pop();
						readPj(folder);
					}
					else if(folders.length == 0) {
						var createPj = "Create package.json";
						var cancel = "No, cancel deployment";
						folder = UTIL.getDirectoryFromPath(filePath) || EDITOR.workingDirectory;
						confirmBox("Unable to find a package.json in " + folder + ". Do you want to create it ?", [createPj, cancel], function(answer) {
							if(answer == createPj) {
							
								var pjTemplate = {
									"name": UTIL.getFolderName(folder),
									"version": "1.0.0",
									"description": "What this micro service does",
									"author": EDITOR.user.name,
									"main": UTIL.getFilenameFromPath(filePath)
								};
								
								EDITOR.openFile(folder + "package.json", JSON.stringify(pjTemplate, null, 2), {savedAs: false, isSaved: false}, function(openFileErr, file) {
									if(openFileErr) alertBox(openFileErr.message, dialogCode);
									else alertBox("Try deploying again when you have saved package.json", dialogCode);
								});
								
							}
						});
					}
					else {
						throw readFileErr;
					}
				}
				else {
					
					// Found a package.json!
					try {
						var pj = JSON.parse(fileContent);
					}
					catch(parseErr) {
						alertBox("Failed to parse " + filePath + "! " + parseErr.message, dialogCode);
						if(callback) callback(parseErr);
						return;
					}
					
					if(pj.main == undefined) {
						var error = filePath + " needs to have a main (file path entry)!"
						alertBox(error.message, dialogCode);
						if(callback) callback(error);
						return;
					}

					else {
						var message = "Enter password to deploy " + pj.name + ":";
						askForPassword(message, function(pw) {
							if(pw == null) return;

							CLIENT.cmd("nodejs_init_deploy", {folder: folder, pw: pw}, function(err, resp) {
								if(err) {
									alertBox(err.message, dialogCode);
									if(callback) callback(err);
								}
								else {

									//console.log( JSON.stringify(resp, null, 2) );
									var logDir = UTIL.joinPaths(EDITOR.user.homeDir, "log/");
									alertBox(pj.name + ' deployed to production!\nLog files can be found in <a href="#" onclick="EDITOR.fileExplorer(\'' + logDir + '\');">' + logDir + '</a>', dialogCode);
									EDITOR.stat("nodejs_deploy");

									if(callback) callback(null);

								}
							});
						
						});
					}
					
				}
			}); 
		}
		
	}
	
	// TEST-CODE-START
	
	EDITOR.addTest(1, function testNodejsDeployAddToProd(testCallback) {

		var dir = UTIL.joinPaths(EDITOR.user.homeDir, "nodejs/testProgram/");
		var testFile = UTIL.joinPaths(dir, "testfile.txt");

		var testProgram = 'var counter = 0;\nsetInterval(test, 500);\nfunction test() {\ncounter=counter+1;\nconsole.log("test " + counter);\n'
		testProgram = testProgram + 'var fs = require("fs");\nfs.appendFile("' + testFile + '", "testfile " + counter, function dataAppended(err) {\n'
		testProgram = testProgram + 'if (err) throw err;\n});\n}\n'
		
		var packageJson = '{"name": "testProgram",\n"version": "1.0.0",\n"description": "test nodejs deploy",\n"author": "ltest1",\n"main": "test.js"\n}';

		tmpPw = "123"; // The password for the test account
		pwDate = new Date();

		EDITOR.createPath(dir, function(err) {
			if(err) throw err;
			EDITOR.saveToDisk(UTIL.joinPaths(dir, "test.js"), testProgram, function(err) {
				if(err) throw err;
				EDITOR.saveToDisk(UTIL.joinPaths(dir, "package.json"), packageJson, function(err) {
					if(err) throw err;

					prodDeploy(dir, function(err) {
						if(err) throw err;

						setTimeout(testCheckLog, 1000);
					});
				});
			});
		})

		function testCheckLog() {
var logFile = UTIL.joinPaths(EDITOR.user.homeDir, "log/testProgram.log");

			EDITOR.doesFileExist(logFile, function(err, exist) {
				if(err) throw err;

				if(!exist) throw new Error("Log file was not created: " + logFile);

				testStopProgram();
			});
		}

		function testStopProgram() {
			prodStop(dir, function(err) {
				if(err) throw err;

				makeSureItsStopped(function(err) {
					if(err) throw err;

					testStartAndRestart();
				});
				
			});
		}

		function testStartAndRestart() {
			prodRestart(dir, function(err) {
				if(err) throw err;

				makeSureItsRunning(function(err) {
					if(err) throw err;

					testRemoveFromProd();
				});
			});
		}

		function testRemoveFromProd() {
			prodRemove(dir, function(err) {
				if(err) throw err;

				makeSureItsStopped(function(err) {
					if(err) throw err;

					// Make sure it no longer exist
					CLIENT.cmd("nodejs_init_list", {pw: tmpPw}, function(err, resp) {
						if(err) throw err;

						console.log("nodejs_deploy: test: scripts=" + JSON.stringify(resp.scripts, null, 2));

						for(var script in resp.scripts) {
							if(script.main == "test.js") throw new Error("testProgram still exist in prod!");
						}

						EDITOR.closeAllDialogs(dialogCode);

						testCallback(true);
					});
				});
			});
		}

		function makeSureItsRunning(callback) {
			EDITOR.getFileSizeOnDisk(testFile, function(err, sizeA) {
				if(err) return callback(err);

				setTimeout(function() {
					EDITOR.getFileSizeOnDisk(testFile, function(err, sizeB) {
						if(err) return callback(err);

						if(sizeB <= sizeA) return callback(new Error("It seems testProgram is not running!"));

						callback(null);
					});
				}, 1000);
			});
		}

		function makeSureItsStopped(callback) {
			EDITOR.getFileSizeOnDisk(testFile, function(err, sizeA) {
				if(err) return callback(err);

				setTimeout(function() {
					EDITOR.getFileSizeOnDisk(testFile, function(err, sizeB) {
						if(err) return callback(err);

						if(sizeA != sizeB) return callback(new Error("It seems testProgram is still running!"));

						callback(null);
					});
				}, 1000);
			});
		}
	});
	
	// TEST-CODE-END

})();