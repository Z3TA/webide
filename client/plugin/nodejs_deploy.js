(function() {
	"use strict";
	
	var winMenuProdDeploy, winMenuProdRestart, winMenuProdStop, winMenuProdRemove, winMenuProdList;
	var activated = false;
	var deployedScriptWidget;
	var scriptList;
	var pwDate = new Date();
	var tmpPw = "";

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
						EDITOR.bindKey({desc: S("deploy_current_nodejs_project"), fun: nodejsDeploy, charCode: keyF1, combo: CTRL});
						
						EDITOR.bindKey({desc: S("restart_nodejs_project_in_production"), fun: nodejsProdRestart, charCode: keyF1, combo: SHIFT + CTRL});
						
						EDITOR.bindKey({desc: S("stop_nodejs_project_in_production"), fun: nodejsProdStop, charCode: keyF3, combo: CTRL});
						
						EDITOR.bindKey({desc: S("remove_nodejs_project_from_production"), fun: nodejsProdRemove, charCode: keyF3, combo: SHIFT + CTRL});
						
						winMenuProdDeploy = EDITOR.windowMenu.add(S("deploy_to_production"), ["Node.js", 5], nodejsDeploy, "top");
						winMenuProdRestart = EDITOR.windowMenu.add(S("restart_production"), ["Node.js", 5], nodejsProdRestart);
						winMenuProdStop= EDITOR.windowMenu.add(S("stop_production"), ["Node.js", 5], nodejsProdStop);
						winMenuProdRemove = EDITOR.windowMenu.add(S("remove_from_production"), ["Node.js", 5], nodejsProdRemove, "bottom");
						winMenuProdList = EDITOR.windowMenu.add("List deployed scripts", ["Node.js", 5], nodejsProdList, "bottom");

						var discoveryItem = document.createElement("img");
						discoveryItem.setAttribute("id", "deployDiscovery");
						discoveryItem.src = "gfx/upload.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
						discoveryItem.title = S("nodejs_deploy") + " (" + EDITOR.getKeyFor(nodejsDeploy) + ")";
						discoveryItem.onclick = nodejsDeployFromDiscoveryBar;
						EDITOR.discoveryBar.add(discoveryItem, 90);
						
						activated = true;
					}
				});
			}
			
			
			
		},
		unload: function unloadNodeJsDeploy() {
			
			if(!activated) return;
			
			EDITOR.unbindKey(nodejsDeploy);
			
			EDITOR.windowMenu.remove(winMenuProdDeploy);
			EDITOR.windowMenu.remove(winMenuProdRestart);
			EDITOR.windowMenu.remove(winMenuProdStop);
			EDITOR.windowMenu.remove(winMenuProdRemove);
			EDITOR.windowMenu.remove(winMenuProdList);

		},
	});
	
	function askForPassword(msg, callback) {

		var expireTime = 10*60*1000;

		if(tmpPw && (new Date())-pwDate < expireTime) return callback(null, tmpPw);

		promptBox("Enter password " + (msg ? msg:""), {isPassword: true, dialogDelay: 0}, function(pw) {
			tmpPw = pw;
			pwDate = new Date();

			callback(null, pw);
		});
	}

	function nodejsProdList() {
		if(!deployedScriptWidget) deployedScriptWidget = EDITOR.createWidget(buildDeployedScriptManager);

		winMenuProdList.hide();

		askForPassword(" in order to list scripts:", function (err, pw) {
			if(err) return alertBox(err.message);
			CLIENT.cmd("nodejs_init_list", {pw: pw}, function(err, resp) {
				if(err) {
					return alertBox(err.message);
				}

				console.log("nodejs_deploy: nodejsProdList: " + JSON.stringify(resp, null, 2));

				if(!deployedScriptWidget.mainElement) deployedScriptWidget.show(); // Build the UI

				while (scriptList.firstChild) scriptList.removeChild(scriptList.lastChild); // Empty list
				
				for(var script in resp.scripts) {
					scriptList.appendChild( makeListItem(resp.scripts[script]) );
				}

				deployedScriptWidget.show(); // Will call EDITOR.resizeNeeded();

			});
		});
	}

	function makeListItem(script) {
		console.log("nodejs_deploy:makeListItem: script=" + JSON.stringify(script));
		// {"main":"/home/ltest1/.webide/prod/hello_world/hello.js","name":"hello_world","pathToFolder":"/home/ltest1/.webide/prod/hello_world/","log":"/home/ltest1/log/hello_world.log","running":true}

		var stats = "stopped";
		if(script.running) status = "enabled";

		var tr = document.createElement("tr");

		var name = document.createElement("td");
		name.innerText = script.name;


		var mainScript = document.createElement("a");
		mainScript.innerText = script.main;
		mainScript.onclick = function openFile() {
			EDITOR.openFile(script.main);
		}

		var main = document.createElement("td");
		main.appendChild(mainScript);

		var status = document.createElement("td");
		status.innerText = "Entry point";

		tr.appendChild(name);
		tr.appendChild(main);
		tr.appendChild(status);

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

		var mainScript = document.createElement("th");
		mainScript.innerText = "Entry point";

		var status = document.createElement("th");
		status.innerText = "Entry point";

		tr.appendChild(name);
		tr.appendChild(mainScript);
		tr.appendChild(status);

		thead.appendChild(tr);
		
		table.appendChild(thead);
		table.appendChild(tbody);

		scriptList = tbody;

		main.appendChild(table);

		return main;
	}


	function nodejsDeployFromDiscoveryBar() {
		nodejsDeploy(EDITOR.currentFile);
	}
	
	function nodejsProdStop(currentFile) {
		
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) alertBox(err.message);
			else promptBox("Enter password to stop " + pj.name + " in production:", {isPassword: true, dialogDelay: 0}, function(pw) {
				if(pw != null) CLIENT.cmd("nodejs_init_stop", {folder: folder, pw: pw}, function(err, resp) {
					if(err) alertBox(err.message);
					else alertBox(pj.name + " stopped!");
				});
			});
		});
		
		return false;
	}
	
	function nodejsProdRemove(currentFile) {
		
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) alertBox(err.message);
			else promptBox("Enter password to remove " + pj.name + " from production:", {isPassword: true, dialogDelay: 0}, function(pw) {
				if(pw != null) CLIENT.cmd("nodejs_init_remove", {folder: folder, pw: pw}, function(err, resp) {
					if(err) alertBox(err.message);
					else alertBox(pj.name + " removed from production!");
				});
			});
		});
		
		return false;
	}
	
	function nodejsProdRestart(currentFile) {
		
		getProjFolder(currentFile, function(err, folder, pj) {
			if(err) alertBox(err.message);
			else promptBox("Enter password to restart " + pj.name + " in production:", {isPassword: true, dialogDelay: 0}, function(pw) {
				if(pw != null) CLIENT.cmd("nodejs_init_restart", {folder: folder, pw: pw}, function(err, resp) {
					if(err) alertBox(err.message);
					else alertBox(pj.name + " restarted!");
				});
			});
		});
		
		return false;
	}
	
	function getProjFolder(currentFile, callback) {
		var folders = UTIL.getFolders(currentFile.path);
		
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
						callback(new Error("Unable to find package.json"));
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
						return callback("Failed the parse " + filePath + "! " + parseErr.message);
					}
					
					callback(null, folder, json);
					
				}
			});
		}
	}
	
	
	function nodejsDeploy(currentFile) {
		
		// Figure out what folder (project) the user wants to deploy ...
		
		if(!currentFile) alertBox("No current file open!");
		
		var folders = UTIL.getFolders(currentFile.path);
		
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
						folder = UTIL.getDirectoryFromPath(currentFile.path) || EDITOR.workingDirectory;
						confirmBox("Unable to find a package.json in " + folder + ". Do you want to create it ?", [createPj, cancel], function(answer) {
							if(answer == createPj) {
							
								var pjTemplate = {
									"name": UTIL.getFolderName(folder),
									"version": "1.0.0",
									"description": "What this micro service does",
									"author": EDITOR.user.name,
									"main": UTIL.getFilenameFromPath(currentFile.path)
								};
								
								EDITOR.openFile(folder + "package.json", JSON.stringify(pjTemplate, null, 2), {savedAs: false, isSaved: false}, function(openFileErr, file) {
									if(openFileErr) alertBox(openFileErr.message);
									else alertBox("Try deploying again when you have saved package.json");
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
						return alertBox("Failed the parse " + filePath + "! " + parseErr.message);
					}
					
					if(pj.main == undefined) alertBox(filePath + " needs to have a main (file path entry)!");
					else promptBox("Enter password to deploy " + pj.name + ":", {isPassword: true, dialogDelay: 0}, function(pw) {
						
						if(pw != null) CLIENT.cmd("nodejs_init_deploy", {folder: folder, pw: pw}, function(err, resp) {
							if(err) alertBox(err.message);
							else {
alertBox(pj.name + " deployed to production: " + resp.prodFolder);
								EDITOR.stat("nodejs_deploy");
							}
						});
						
					});
					
				}
			}); 
		}
		
	}
	
	
})();