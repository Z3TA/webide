(function() {
	"use strict";
	
	/*
		
		Work in progres ...
		
		
		Problem: How to get the current event.id for a file !?
		Solution: Have the server keep track of event id's for each file
		
		Problem: We don't just want to have collaboration when logging in to the same account
		Solution: Make it possible to share the session, by giving a temorary login token/password
		
		Dilemma: Should we make this into a separate mode, so we can have different functionality
		to for example Ctrl+Z (undo/redo) !?
		Or should we let this module handle all undo/redo !?
		Decision: Let this module handle all undo/redo
		
		Dilemma: Should we keep track of undo/redo history branches
		Answer: No, keep it simple!
		
		problem: Hmm, how will this work with the terminal !? Make the terminal only send to the client with the terminal !?
		solution: The terminal plugin marks the file with file.noCollaboration. Terminal events are already sent out to all client, so no other sync is needed!
		
		todo: Handle file renaming (keep history)
		
		
		Problem: When you join (late) the order is > 0 and you get a hole in the change event array
		Sulution: Allow hole in the beginning, but not in the middle
		Problem: What if the user leaves, then joins again ?
		Solutions: Allow holes. Just show a warning instead of throwing.
		
	*/
	
	var eventOrder = -1;
	var eventOrderSynced = false;
	var userConnectionId = -1;
	var fileChangeEvents = {}; // filePath: [order][n]ev: Store latest events for use in transformation
	var collabMode = false;
	var ignoreFileChange = false;
	var fileChangeEventOrderCounters = {}; // Separate order counters for each file(path): filePath: order (Number: counter)
	var meMaster = false;
	var connectionClosedDialog;
	var clientLeaveDialog = {}; 
	var undoRedoHistory = {}; // filePath:changeEvent
	var saveUndoRedoHistory = true;
	var carets = {}; // filePath: {cId, caret}
	var menu;
	var bindTest = false;
	var ignoreFileSave = "";
	
	EDITOR.plugin({
		desc: "Let you see changes live while logged in from different devices. Also handles undo/redo",
		load: function loadCollaboration() {
			
			//EDITOR.addMode("collaboration", "default");
			
			//EDITOR.addRender(renderCollaborationCarets);
			//EDITOR.on("moveCaret", collabMoveCaret);
			
			EDITOR.on("fileOpen", collabFileOpen);
			EDITOR.on("fileClose", collabFileClose);
			EDITOR.on("fileChange", collabFileChange);
			EDITOR.on("afterSave", callabFileSaved);
			EDITOR.on("select", collabSelectText);
			
			/*
				EDITOR.on("interaction", function(file, action, ev) {
				console.log("Interaction: " + action);
				});
			*/
			
			CLIENT.on("echo", collabHandleEcho);
			CLIENT.on("loginSuccess", collabLoginSuccess);
			CLIENT.on("clientJoin", collabJoin);
			CLIENT.on("clientLeave", collabLeave);
			CLIENT.on("connectionLost", collabConnectionLost);
			
			var Y = 89;
			var Z = 90;
			
			EDITOR.bindKey({desc: "Redo change", charCode: Y, fun: collabRedo, combo: CTRL});
			EDITOR.bindKey({desc: "Undo change", charCode: Z, fun: collabUndo, combo: CTRL});
			
			EDITOR.registerAltKey({char: "ABC", label: "undo", alt: 1, fun: collabUndo}); 
			EDITOR.registerAltKey({char: "ABC", label: "redo", alt: 2, fun: collabRedo});
			
			menu = EDITOR.addMenuItem("Invite collaborator", invite, 14);
			
			// TEST-CODE-START
			if(EDITOR.settings.devMode) {
				var C = 67;
				bindTest = true;
				EDITOR.bindKey({desc: "Run collaboration test suite", fun: testEditAtTheSameTime, charCode: C, combo: CTRL+SHIFT});
				EDITOR.bindKey({desc: "Run undo/redo test suite", fun: testUndoRedo, charCode: Z, combo: CTRL+SHIFT});
			}
			// TEST-CODE-END
		},
		unload: function unloadCollaboration() {
			
			//EDITOR.removeRender(renderCollaborationCarets);
			//EDITOR.removeEvent("moveCaret", collabMoveCaret);
			
			EDITOR.removeEvent("fileOpen", collabFileOpen);
			EDITOR.removeEvent("fileClose", collabFileClose);
			EDITOR.removeEvent("fileChange", collabFileChange);
			EDITOR.removeEvent("fileOpen", collabFileOpen);
			EDITOR.removeEvent("afterSave", callabFileSaved);
			EDITOR.removeEvent("select", collabSelectText);
			
			CLIENT.removeEvent("echo", collabHandleEcho);
			CLIENT.removeEvent("loginSuccess", collabLoginSuccess);
			CLIENT.removeEvent("clientJoin", collabJoin);
			CLIENT.removeEvent("clientLeave", collabLeave);
			CLIENT.removeEvent("connectionLost", collabConnectionLost);
			
			// TEST-CODE-START
			if(bindTest) {
			EDITOR.unbindKey(testCollaboration);
				EDITOR.unbindKey(testUndoRedo);
			}
			// TEST-CODE-END
			
			EDITOR.unbindKey(collabRedo);
			EDITOR.unbindKey(collabUndo);
			
			EDITOR.unregisterAltKey(collabUndo);
			EDITOR.unregisterAltKey(collabRedo);
			
		},
		order: 100
	});
	
	function callabFileSaved(file) {
		console.log("callabFileSaved: file.path=" + file.path + " ignoreFileSave=" + ignoreFileSave);
		if(ignoreFileSave == file.path) return true;
		
		var fileSaveEvent = {
			path: file.path,
			hash: file.hash
		};
		CLIENT.cmd("echo", {eventOrder: ++eventOrder, fileSaved: fileSaveEvent});
		
		return true;
	}
	
	function invite(file, combo, character, charCode, direction, clickEvent) {
		EDITOR.hideMenu();
		
		CLIENT.cmd("invite", {}, function(err, login) {
			
			if(err) return alertBox(err.message);
			
			var txt = "Let someone else login to your account using:\n" + 
			"Username: " + login.username + "\n" + 
			"Password: " + login.password + "\n" + 
			"\n";
			
			var url = window.location.protocol + "//" + window.location.host + "/?user=" + login.username + "&pw=" + login.password;
			
			if(file) {
				txt += "And tell them to open (Ctrl+O) the file:\n" + file.path + "\n\n";
				
				url += "&open=" + file.path;
			}
			
			txt += "Or use the following url:\n" + url + "\n\n";
			
			EDITOR.openFile("/tmp/collaboration_instructions.txt", txt);
			
		});
		
	}
	
	function collabLoginSuccess(json) {
		// Login success comes before collabConnect!
		// json: {user: userConnectionName, cId: userConnectionId, installDirectory: installDirectory}
		
		for(var filePath in undoRedoHistory) {
			for (var i=0; i<undoRedoHistory[filePath].length; i++) {
				if(undoRedoHistory[filePath][i].cId == userConnectionId) undoRedoHistory[filePath][i].cId = json.cId;
			}
		}
		userConnectionId = json.cId;
		
		// Get the eventOrder, (currently echoCounter)
		CLIENT.cmd("echo", {eventOrder: -1, ping: new Date().getTime()});
		
		if(connectionClosedDialog) connectionClosedDialog.close();
		
		if(QUERY_STRING.open && !EDITOR.files.hasOwnProperty(QUERY_STRING.open)) EDITOR.openFile(QUERY_STRING.open);
		
	}
	
	function collabJoin(json) {
		// A new client has connected
		
		console.log("collabJoin: " + JSON.stringify(json));
		
		var connectedClientIds = json.connectedClientIds;
		
		connectedClientIds.sort(function sortNumber(a,b) {
			return a - b;
		});
		
		if(connectedClientIds.length > 1) {
			// More then one user logged in to the same account
			
			var wasInCollabMode = collabMode;
			
			collabMode = true;
			/*
				Need to sync unsaved savedAs files
				Problem: Who is going to send the state to the new client !?
				Answer: The one with the lowest client id
				Problem2: The "master" might have the file unsaved, while the new client might have the file modified
				Answer: 
			*/
			
			var master = connectedClientIds[0]; // The one with the lowest connection-id
			
			console.log("master=" + master + " userConnectionId=" + userConnectionId + " connectedClientIds=" + JSON.stringify(connectedClientIds));
			
			if(userConnectionId == master) {
				for(var path in EDITOR.files) {
					if(!fileChangeEventOrderCounters.hasOwnProperty(path)) fileChangeEventOrderCounters[path] = -1;
				}
				CLIENT.cmd("echo", {eventOrder: ++eventOrder, fileChangeEventOrderCounters: fileChangeEventOrderCounters});
			}
			
			var file;
			for(var path in EDITOR.files) {
				file = EDITOR.files[path];
				if(!file.isSaved && file.savedAs) syncFile(file);
			}
			
			var showCollaborationNotice = !(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("collaboration_notice") != -1);
			if(showCollaborationNotice) {
			if(json.cId == userConnectionId) {
				var msg = "You are in collaboration mode with ";
				var others = connectedClientIds.filter(notMe);
				if(others.length > 2) {
					for (var i=0; i < others.length-1; i++) {
						msg += json.connectionCLientAliases[ others[i] ] + ", ";
				}
					msg += "and " + json.connectionCLientAliases[others[others.length-1]];
				}
				else if(others.length == 2) {
					msg += json.connectionCLientAliases[ others[0] ] + " and " + json.connectionCLientAliases[ others[1] ]
				}
				else if(others.length == 1) {
					msg += json.connectionCLientAliases[ others[0] ]
				}
				else throw new Error("others.length=" + others.length);
				
					alertBox(msg, "COLLABORATION_NOTICE");
			}
			else {
				if(clientLeaveDialog.hasOwnProperty(json.alias)) {
					clientLeaveDialog[json.alias].close();
					delete clientLeaveDialog[json.alias];
				}
				else {
					var msg = json.alias + " joined your session.";
					
					if(!wasInCollabMode) msg += "\nYou are now in collaboration mode!";
					
						alertBox(msg, "COLLABORATION_NOTICE");
				}
			}
			}
			
		}
		
		function notMe(id) {
			return id != userConnectionId;
		}
	}
	
	function syncFile(file) {
		
		var fileSyncEv = {
			path: file.path,
			text: file.text,
			hash: file.hash,
			caret: file.caret,
		};
		
		CLIENT.cmd("echo", {eventOrder: ++eventOrder, sync: fileSyncEv});
	}
	
	function collabLeave(json) {
		// A client has disconnected
		
		console.log("collabLeave: " + JSON.stringify(json));
		
		var connectedClientIds = json.connectedClientIds;
		
		var msg = json.alias + " client disconnected.";
		
		if(connectedClientIds.length == 1) {
			// We are the only connected client
			if(connectedClientIds[0] != userConnectionId) throw new Error("Unexpected: userConnectionId=" + userConnectionId + " connectedClientIds=" + JSON.stringify(connectedClientIds))
			collabMode = false;
			msg += "\nWe are no longer in collaboration mode !";
		}
		
		var showCollaborationNotice = !(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("collaboration_notice") != -1);
		
		if(!clientLeaveDialog.hasOwnProperty(json.alias) && showCollaborationNotice) clientLeaveDialog[json.alias] = alertBox(msg, "COLLABORATION_NOTICE");
		
		return true;
	}
	
	function collabConnectionLost() {
		// We have lost the connection from the server
		
		for(var filePath in undoRedoHistory) {
			for (var i=0; i<undoRedoHistory[filePath].length; i++) {
				if(undoRedoHistory[filePath][i].cId == userConnectionId) undoRedoHistory[filePath][i].cId = -1;
			}
		}
		
		userConnectionId = -1;
		
		if(!connectionClosedDialog && collabMode) connectionClosedDialog = alertBox("We have lost the connection to the server. Exiting collaboraction mode!");
		
		collabMode = false;
		
	}
	
	
	function collabMoveCaret(file, caret) {
		
		if(file.noCollaboration) {
console.warn("Not moving caret because collaboration disabled in " + file.path);
		return;
		}
		
		var caretEvent = {
			filePath: file.path,
			caret: caret,
		}
		
		CLIENT.cmd("echo", {eventOrder: ++eventOrder, moveCaret: caretEvent});
		
		return true;
	}
	
	function collabFileOpen(file) {
		if(!fileChangeEventOrderCounters.hasOwnProperty(file.path)) fileChangeEventOrderCounters[file.path] = -1; // -1 to prevent 0:null
		
		if(!collabMode) return true;
		
		if(file.noCollaboration) {
console.warn("Collaboration disabled in " + file.path);
		return;
		}
		
		if(!file.isSaved) syncFile(file);
		else {
			// Ask other clients if they have a newer version of the file
			
			var fileOpenEv = {
				path: file.path,
				hash: file.hash,
			};
			
			CLIENT.cmd("echo", {eventOrder: ++eventOrder, fileOpen: fileOpenEv});
		}
		
		return true;
	}
	
	function collabFileClose(file) {
		
		return true;
	}
	
	function collabSelectText(file, selection) {
		if(!collabMode) return true;
		if(file.noCollaboration) {
console.warn("Collaboration disabled in " + file.path);
		return;
		}
		
		console.log(selection);
		
		if(selection.length == 0) return true;
		
		selection.sort(function sortByIndex(a, b) {
			return a.index - b.index;
		});
		
		var selectEvent = {
			filePath: file.path,
			start: selection[0].index,
			end: selection[selection.length-1].index,
		}
		
		CLIENT.cmd("echo", {eventOrder: ++eventOrder, select: selectEvent});
		
		return true;
	}
	
	function collabFileChange(file, change, text, index, row, col) {
		if(ignoreFileChange) return true;
		
		console.log("fileChangeEvents: " + JSON.stringify(fileChangeEvents, null, 2));
		
		console.log("collabFileChange: index=" + index + " row=" + row + " col=" + col);
		
		if(file.noCollaboration) {
console.warn("Collaboration disabled in " + file.path);
		return;
		}
		
		if(file == undefined) throw new Error("file=" + file);
			if(change == undefined) throw new Error("change=" + file);
			if(text == undefined) throw new Error("text=" + file);
			if(index == undefined) throw new Error("index=" + index);
			if(row == undefined) throw new Error("row=" + row);
			if(col == undefined) throw new Error("col=" + col);
			
			if(!fileChangeEventOrderCounters.hasOwnProperty(file.path)) throw new Error("fileChangeEventOrderCounters: " + JSON.stringify(fileChangeEventOrderCounters, null, 2));
			
			var fileChangeEvent = {
				filePath: file.path, 
				type: change, 
				text: text, 
				index: index, 
				row: row || file.caret.row,
				col: col || file.caret.col,
				order: ++fileChangeEventOrderCounters[file.path], 
				cId: userConnectionId // The server adds cId, but we also want it in the file change object
			};
		
		console.log("fileChangeEvent.order=" + fileChangeEvent.order);
		
		if(collabMode) {
			if(!fileChangeEvents.hasOwnProperty(file.path)) {
				console.log("before: fileChangeEvents[" + file.path + "]=" + typeof fileChangeEvents[file.path] + " isArray ? " + Array.isArray(fileChangeEvents[file.path]));
				fileChangeEvents[file.path] = [];
				console.log("after: fileChangeEvents[" + file.path + "]=" + typeof fileChangeEvents[file.path] + " isArray ? " + Array.isArray(fileChangeEvents[file.path]));
			}
			
			if( fileChangeEvents[file.path][fileChangeEvent.order] ) throw new Error("Events for order=" + fileChangeEvent.order + " already exist for file=" + file.path + "\n" + JSON.stringify(fileChangeEvents[file.path][fileChangeEvent.order], null, 2));
			
			fileChangeEvents[file.path][fileChangeEvent.order] = [];
			
			console.log("A fileChangeEvents[" + file.path + "][" + fileChangeEvent.order + "] = " + JSON.stringify(fileChangeEvents[file.path][fileChangeEvent.order], null, 2));
			
			if(fileChangeEvent == undefined) throw new Error("fileChangeEvent=" + fileChangeEvent);
			
			// should we ?
			//fileChangeEvents[file.path][fileChangeEvent.order].push(fileChangeEvent);
			
			console.log("B fileChangeEvents[" + file.path + "][" + fileChangeEvent.order + "] = " + JSON.stringify(fileChangeEvents[file.path][fileChangeEvent.order], null, 2));
			
			console.log("Sending fileChangeEvent=" + JSON.stringify(fileChangeEvent, null, 2));
			
			CLIENT.cmd("echo", {eventOrder: ++eventOrder, fileChange: fileChangeEvent});
			
			if(EDITOR.settings.devMode) detectHoles(fileChangeEvents[file.path]); // Sanity check
			
		}
		else if(saveUndoRedoHistory) {
			saveUndoRedoHistoryEvent(fileChangeEvent)
		}
		
		return true;
	}
	
	function detectHoles(arr) {
		var hole = (arr[0] == null); // Only throw an error if there is an hole in the middle
		for (var i=0; i<arr.length; i++) {
			if(arr[i] == null) {
				if(!hole) console.warn("Hole detected: i=" + i + " is " + arr[i] + "\n" + JSON.stringify(arr, null, 2));
			}
			else hole = false;
		}
	}
	
	function saveUndoRedoHistoryEvent(ev) {
		
		//console.warn("Adding event to undo/redo history: " + JSON.stringify(ev, null, 2));
		
		var path = ev.filePath;
		
		if(path == undefined) throw new Error("path=" + path + " ev=" + JSON.stringify(ev, null, 2));
		
		if(!undoRedoHistory.hasOwnProperty(path)) {
			undoRedoHistory[path] = [];
			undoRedoHistory[path].index = -1;
		}
		
		var history = undoRedoHistory[path];
		
		if(ev.cId == userConnectionId) {
			// Change made by me
			// Am I in the middle or at the end of *my* history ?
			var middle = false;
			for (var i=history.index+1; i<history.length; i++) {
				if(history[i].cId == userConnectionId) {
					middle = true;
					break;
				}
			}
			
			if(middle) {
				// We made a change in the middle of history
				// As we have not chosen to support history branches, we will reset history
				// But only the changes we made
				
				var oldHistoryLength = history.length;
				for (var i=history.index+1, removed; i<history.length; i++) {
					if(history[i].cId == userConnectionId) {
						removed = history.splice(i, 1);
						i--;
						history.index = i;
						console.log("Removed history item: " + JSON.stringify(removed, null, 2));
					}
				}
				console.log("Removed " + (oldHistoryLength-history.length) + " items from undoRedoHistory because edit in the middleof history! history.index=" + history.index + " history.length=" + history.length + " path=" + path);
			}
		}
		else console.log("Not resetting! ev.cId=" + ev.cId + " userConnectionId=" + userConnectionId + " history.index=" + history.index + " history.length=" + history.length);
		
		var index = history.push(ev) -1;
		
		if(ev.cId == userConnectionId) {
			// Move the history index forward to this edit
			history.index = index;
		}
		
		console.log("history.index=" + history.index + " history.length=" + history.length);
		
		//console.log("undoRedoHistory: " + JSON.stringify(undoRedoHistory, null, 2));
		
		// Sanity check
		for (var i=0; i<history.length.length; i++) {
			if(history[i] == null) throw new Error("history i=" + i + " is " + history[i]);
		}
		
		
	}
	
	function collabHandleEcho(json) {
		
		console.log("collabHandleEcho: json=" + JSON.stringify(json, null, 2));
		
		if(!json.eventOrder == undefined) throw new Error("Echo without eventOrder: " + JSON.stringify(json));
		if(!json.echoCounter == undefined) throw new Error("Echo without echoCounter: " + JSON.stringify(json));
		if(!json.alias) throw new Error("Echo without alias: " + JSON.stringify(json));
		if(!json.cId == undefined) throw new Error("Echo without cId: " + JSON.stringify(json));
		
		//if(json.cId == userConnectionId) throw new Error("It should not be possible to get echo's from myself! json.cId=" + json.cId + " userConnectionId=" + userConnectionId);
		
		if(eventOrderSynced) eventOrder++;
		
		if(json.ping) {
			console.log("Server latency: " + ( (new Date()).getTime() - json.ping ) + "ms");
			eventOrder = json.echoCounter;
			console.log("Set eventOrder=" + eventOrder);
		}
		else if(eventOrderSynced && json.eventOrder > eventOrder) {
			throw new Error("Events are out of order, we have missed " + (json.eventOrder-eventOrder) + " events! json.eventOrder=" + json.eventOrder + " eventOrder=" + eventOrder);
		}
		else if(json.fileChangeEventOrderCounters) {
			fileChangeEventOrderCounters = json.fileChangeEventOrderCounters;
		}
		else if(json.fileOpen) {
			var file = EDITOR.files[json.fileOpen.path];
			if(!file) console.log("File not opened: " + json.fileOpen.path);
			else {
				if(file.hash != json.fileOpen.hash) {
					console.log("Syncing file because hash missmatch: " + file.path);
					syncFile(file);
				}
				else if(file.changed) {
					console.log("Syncing file because it has changed: " + file.path);
					syncFile(file);
				}
				else {
					console.log("No need to sync file because it's has the same hash and has not changed. (file.hash=" + file.hash + ", json.fileOpen.hash=" + json.fileOpen.hash + ", file.isSaved=" + file.isSaved + ")");
				}
			}
			
		}
		else if(json.sync && json.cId != userConnectionId) {
			
			// ### Sync file
			var sync = json.sync;
			var file = EDITOR.files[sync.path];
			if(!file) console.log("File not opened, no need to sync: path=" + sync.path);
			else {
				if(file.noCollaboration) {
console.warn("Not syncing because collaboration is disabled in " + file.path);
				return;
				}
				
				if(file.isSaved && file.hash == sync.hash) updateFileConent(file, sync.text);
				else if(file.text == sync.text) console.log("No update needed, sync and file is the same!");
				else {
					var update = "Just update";
					var backup = "Save a backup"
					confirmBox( json.alias  + " has made changes to:\n" + sync.path + "\n\nSave a backup before updating ?", [update, backup], function(answer) {
						if(answer == update) updateFileConent(file, sync.text, sync.hash);
						else if(answer == backup) {
							var backupPath = file.path + ".bak";
							EDITOR.saveFile(file, backupPath, function(err) {
								if(err) throw err;
								
								EDITOR.openFile(sync.path, sync.text, {savedAs: true, isSaved: false, changed: true}, function (err, file) {
									file.hash = sync.hash;
									
								});
								
							});
						}
						else throw new Error("Unknown answer=" + answer);
					});
				}
				
			}
			
		}
		else if(json.fileChange) {
			// ### File change event
			
			var ev = json.fileChange;
			ev.cId = json.cId;
			
			if(ev.filePath == undefined) throw new Error("ev.filePath=" + ev.filePath + " ev=" + JSON.stringify(ev));
			
			var file = EDITOR.files[ev.filePath];
			
			if(file == undefined) {
				console.warn("Got change to a file that we do not have open: " + ev.filePath);
				return;
			}
			
			if(file.noCollaboration) {
console.warn("Not updating because collaboration disabled in " + file.path);
			return;
			}
			
			if(!fileChangeEventOrderCounters.hasOwnProperty(file.path)) throw new Error("fileChangeEventOrderCounters: " + JSON.stringify(fileChangeEventOrderCounters, null, 2));
			
			var currentOrder = fileChangeEventOrderCounters[file.path];
			if(ev.order > currentOrder) fileChangeEventOrderCounters[file.path]++;
			
			console.log("currentOrder=" + currentOrder + " ev.order=" + ev.order);
			
			var arr = fileChangeEvents[file.path] && fileChangeEvents[file.path][ev.order];
			
			if(ev.order > currentOrder+1) {
				throw new Error("File change events are out of order, we have missed " + (ev.order-fileChangeEventOrderCounters[file.path]) + " events!");
			}
			
			else if(ev.order == currentOrder+1) {
				console.log("ev.order=" + ev.order + " is the latest order! currentOder=" + currentOrder + ". No need to transform");
			}
			else if(ev.order == currentOrder ) {
				
				if(arr == undefined) throw new Error("History not recorded: ev.order=" + ev.order + " ignoreFileChange=" + ignoreFileChange + " file.path=" + file.path + " in fileChangeEvents ? " + 
				(fileChangeEvents.hasOwnProperty(file.path)) + " fileChangeEvents[" + file.path + "]=" + JSON.stringify(fileChangeEvents[file.path], null, 2) + " typeof " + (typeof fileChangeEvents[file.path]) );
				
				for (var previousEvent, i=arr.length-1; i>-1; i--) {
					previousEvent = arr[i];
					
					//if(arr[i].cId == userConnectionId) {
						// I just sent an event with this order
						// In my point of view I was first
						//console.warn("Change " + i + "/" + arr.length + " of ev.order=" + ev.order + " was made by this client.");
						// We need to transform the event with the other event in mind
						//transformBackwards(ev, previousEvent);
					//}
					if(arr[i].cId == ev.cId) {
						throw new Error("User with cId=" + ev.cId + " sent two change events with the same order! " + JSON.stringify(arr[i]) + " vs " + JSON.stringify(ev));
					}
					else {
						//alertBox("Same time!");
						// Two different users who are not me, sent an event at the same time
						// In my point of view, the event we have already recived came first!
						// We have to transform from the previous event
						console.log("Transforming with previous event: " + JSON.stringify(previousEvent));
						transformBackwards(ev, previousEvent);
					}
					
				}
				
			}
			else if(ev.order < currentOrder) {
				console.log(json.alias +  " is behind! ev.order=" + ev.order + " currentOrder=" + currentOrder);
				var order = ev.order;
				var changeEvents = fileChangeEvents[file.path];
				if(!changeEvents) throw new Error(  "file.path=" + file.path + " not in " + JSON.stringify( Object.keys(fileChangeEvents) )  );
				if(!Array.isArray(changeEvents)) throw new Error("Not an array: changeEvents=" + JSON.stringify(changeEvents, null, 2));
				while(order++ < currentOrder) {
					arr = changeEvents[order];
					
					if(!arr) {
						throw new Error( "order=" + order + " not in changeEvents=" + JSON.stringify(changeEvents, null, 2) );
					}
					
					for (var i=arr.length-1; i>-1; i--) {
						transformBackwards(ev, arr[i]);
					}
				}
			}
			else {
				throw new Error("ev.order=" + ev.order + " currentOrder=" + currentOrder);
			}
			
			if(!fileChangeEvents.hasOwnProperty(file.path)) fileChangeEvents[file.path] = [];
			
			if( !fileChangeEvents[file.path][ev.order] ) fileChangeEvents[file.path][ev.order] = [];
			
			if(ev == undefined) throw new Error("ev=" + ev);
			if(ev.order == undefined) throw new Error("ev.order=" + ev.order + " ev=" + JSON.stringify(ev, null, 2));
			
			fileChangeEvents[file.path][ev.order].push(ev);
			
			if(EDITOR.settings.devMode) detectHoles(fileChangeEvents[file.path]); // Sanity check
			
			if(json.cId != userConnectionId) {
			// ### Apply file change
				
			ignoreFileChange = true;
			redo(file, ev, false);
			ignoreFileChange = false;
			
			if(file == EDITOR.currentFile) EDITOR.renderNeeded();
			}
			// Undo-redo
			saveUndoRedoHistoryEvent(ev);
			
		}
		else if(json.select) {
			// ### Selected text
			
			var selectEvent = json.select;
			
			console.log("selectEvent: " + JSON.stringify(selectEvent));
			
			var file = EDITOR.files[selectEvent.filePath];
			
			if(file == undefined) {
				console.warn("Text was selected in a file that is not open: " + selectEvent.filePath);
				return;
			}
			
			file.highLightTextRange(selectEvent.start, selectEvent.end);
			EDITOR.renderNeeded();
		}
		else if(json.moveCaret) {
			// ### Someone moved their caret
			if( !carets.hasOwnProperty(json.moveCaret.filePath) ) carets[json.moveCaret.filePath] = {};
			
			carets[json.moveCaret.filePath][json.cId] = json.moveCaret.caret;
			
			EDITOR.renderNeeded();
		}
		else if(json.fileSaved) {
			// ### File saved
			var file = EDITOR.files[json.fileSaved.path];
			if(file) {
				// Update the hash so we do not get an error when saving
				file.hash = json.fileSaved.hash;
				
				// Mark the file as saved
				ignoreFileSave = file.path; // Ignore the save event we will get when the file is marked as saved - to prevent endless loop
				console.log("Marking file as saved: file.path=" + file.path + " ignoreFileSave=" + ignoreFileSave);
				file.saved(function(err) {
					if(ignoreFileSave==file.path) ignoreFileSave = "";
					console.log("File now marked as saved! file.path=" + file.path + " ignoreFileSave=" + ignoreFileSave);
				});
			}
		}
		
		return true;
		
		
		
		function updateFileConent(file, text, hash) {
			ignoreFileChange = true;
			file.reload(text);
			ignoreFileChange = false;
			if(hash != undefined) file.hash = hash; // So that we do not get an error when saving
		}
	}
	
	function transformBackwards(ev, prev) {
		
		if(prev == undefined || ev == undefined) throw new Error("ev=" + JSON.stringify(ev) + " prev=" + JSON.stringify(prev));
		
		var textLength = prev.text.length;
		
		console.log("Transforming backwards from prev.type=" + prev.type + " prev.index=" + prev.index + " ev.index=" + ev.index + " prev.text=" + prev.text);
		
		/*
			We only need to know index and row
		*/
		
		if(prev.type == "removeRow" && ev.index > prev.index) {
			ev.index -= textLength;
			ev.row--;
		}
		else if(prev.type == "text" && ev.index >= prev.index) { // Text was inserted
			ev.index += textLength;
			ev.row += UTIL.occurrences(prev.string, "\n");
		}
		else if(prev.type == "insert" && ev.index >= prev.index) { // One character was inserted
			ev.index += 1;
		}
		else if(prev.type == "deleteTextRange" && ev.index > prev.index) { // Delete a bunch of text
			ev.index -= textLength;
			ev.row -= UTIL.occurrences(prev.string, "\n");
		}
		else if(prev.type == "linebreak" && ev.index > prev.index) { // A line break was inserted
			ev.index += textLength; // Lf or CrLf
			ev.row++;
		}
		else if(prev.type == "delete" && ev.index >= prev.index) { // One or more characters was deleted (can include line breaks)
			ev.index -= textLength;
			if(prev.text.indexOf("\n") != -1) ev.row--;
		}
		//else if(prev.type == "reload") { // The file was reloaded with new text
			// No need to transform, the chnage was over-written
		//}
		
	}
	
	function collabRedo(file) {
		if(!undoRedoHistory.hasOwnProperty(file.path)) {
console.warn("Unable to redo: " + file.path + " has no undo/redo history!");
			return PREVENT_DEFAULT;
		}
		
		var history = undoRedoHistory[file.path];
		
		if(history.length == 0) {
console.warn("Unable to redo: No undo/redo history to undo! history.length=" + history.length + "");
			return PREVENT_DEFAULT;
		}
		
		if(history.index == history.length-1) {
			console.warn("Unable to redo: undo/redo history index=" + history.index + " has reached the top");
			return PREVENT_DEFAULT;
		}
		
		if(history.index >= history.length) throw new Error("history.index=" + history.index + " history.length=" + history.length);
		
		// Move the history index forward before!
		
		// Move history index forward to a change we made
		var oldIndex = history.index;
		history.index++;
		for (var i=history.index; i<history.length; i++) {
			if(history[i].cId == userConnectionId) break;
			history.index++;
		}
		console.log("Redo: Moved history index from " + oldIndex + " to " + history.index + " history.length=" + history.length);
		
		if(history.index > history.length) throw new Error("history.index=" + history.index + " history.length=" + history.length);
		
		if(history.index >= history.length) {
			console.warn("Unable to redo: undo/redo history index=" + history.index + " has reached the top");
			
			return PREVENT_DEFAULT;
		}
		
		var historyItem = history[history.index];
		
		if(!historyItem) throw new Error("historyItem=" + historyItem + " history.index=" + history.index + " history.length=" + history.length + " history=" + JSON.stringify(history,  null, 2));
		
		if(historyItem.cId != userConnectionId) throw new Error("history index should always point to a change we made! history.index=" + history.index + " historyItem=" + JSON.stringify(historyItem, null, 2));
		
		var change = copyObjProp(historyItem);
		
		if(collabMode) {
			
			console.log("Transforming change=" + JSON.stringify(change));
			for (var i=history.index+1; i<history.length; i++) {
				if(history[i].cId != userConnectionId) transformBackwards(change, history[i]);
			}
			console.log("Transformed change=" + JSON.stringify(change));
			}
		
		saveUndoRedoHistory = false;
		redo(file, change, true);
		saveUndoRedoHistory = true;
		
		return PREVENT_DEFAULT;
	}
	
	function collabUndo(file) {
		if(!file) return true;
		if(!EDITOR.input) return true;
			
		if(!undoRedoHistory.hasOwnProperty(file.path)) {
console.warn(file.path + " has no undo/redo history!");
			return PREVENT_DEFAULT;
		}
		
		var history = undoRedoHistory[file.path];
		
		console.log("collabUndo: history.length=" + history.length + " history.index=" + history.index + " history=" + JSON.stringify(history, null, 2));
		
		if(history.length == 0) {
console.warn("No undo/redo history to undo! history.length=" + history.length + "");
			return PREVENT_DEFAULT;
		}
		
		if(history.index < 0) {
console.warn("undo/redo history index=" + history.index + " has reached the bottom");
			return PREVENT_DEFAULT;
		}
		
		// Change the history.index afterwards!
		
		if(history.index >= history.length) throw new Error("Should not be able to reach the cealing: history.index=" + history.index + " history.length=" + history.length);
		
		var historyItem = history[history.index];
		
		if(historyItem == undefined) throw new Error("historyItem=" + historyItem + " history.index=" + history.index + " history.length=" + history.length);
		
		if(historyItem.cId != userConnectionId) throw new Error("history index should always point to a change we made! history.index=" + history.index + " historyItem=" + JSON.stringify(historyItem, null, 2));
		
		var change = copyObjProp(historyItem);
		
		if(collabMode) {
			if(change.cId != userConnectionId) throw new Error("Change was made by someone else: history.index=" + history.index + " change=" + JSON.stringify(change, null, 2) + " history=" + JSON.stringify(history, null, 2));
			
			// We have to tranform the change to the correct position
			// Always transform with change events that came after (both for undo and redo)
			console.log("Transforming change=" + JSON.stringify(change) + " from history.index=" + history.index);
			//for (var i=history.length-1; i>=history.index; i--) {
			for (var i=history.index+1; i<history.length; i++) {
				//console.log("i=" + i + " history.length=" + history.length);
				if(history[i].cId != userConnectionId) {
transformBackwards(change, history[i]);
					console.log("Ended up with index=" + change.index + " and row=" + change.row);
				}
			}
			console.log("Transformed change=" + JSON.stringify(change));
		}
		
		if(change == undefined) throw new Error("change=" + change + " history.index=" + history.index + " history:" + JSON.stringify(history, null, 2));
		
		// Move the history index back to a change that was made by me
		var oldIndex = history.index;
		history.index--;
		for (var i=history.index; i>-1; i--) {
			if(history[i].cId == userConnectionId) break;
			history.index--;
		}
		// If no change was found: history.index=-1
		console.log("Undo: Moved history index from " + oldIndex + " to " + history.index + " change=" + JSON.stringify(history[history.index], 1) );
		
		/*
			Question: Should we ignore the file change event !?
			Answer: We want to send the change to other clients, but not add it to our own undo/redo history
		*/ 
		saveUndoRedoHistory = false;
		undo(file, change, true);
		saveUndoRedoHistory = true;
		
		return PREVENT_DEFAULT;
	}
	
	function undo(file, ev, moveCaret) {
		if(!ev.type) throw new Error("File change event without type: " + JSON.stringify(ev));
		
		console.log("Undoing file change: ev.type=" + ev.type + " ev.index=" + ev.index + " ev.text=" + ev.text);
		
		if(ev.type == "removeRow") {
			var caret = file.createCaret(ev.index);
			console.log("Re-adding row on row=" + caret.row);
			if(caret.row != ev.row) throw new Error("caret.row=" + caret.row + " does not match ev.row=" + ev.row + "\nev:" + JSON.stringify(ev, null, 2) + "\ncaret=" + JSON.stringify(caret));
			file.insertTextRow(ev.row);
		}
		else if(ev.type == "text") { // Text was inserted
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Undoing insert text (" + ev.text.length + " chars) at caret=" + JSON.stringify(caret));
			file.deleteTextRange(caret.index, caret.index + ev.text.length - 1);
			if(file.grid[caret.row].length == caret.col) caret.eol = true; 
		}
		else if(ev.type == "insert") { // One character was inserted
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Undoing " + JSON.stringify(ev) + " at caret=" + JSON.stringify(caret));
			file.deleteCharacter(caret);
		}
		else if(ev.type == "deleteTextRange") { // Deleted a bunch of text
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Undoing deleting of " + ev.text.length + " characters at index=" + ev.index);
			file.insertText(ev.text, caret);
		}
		else if(ev.type == "linebreak") { // A line break was inserted
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Undoing inserting a line break at caret=" + JSON.stringify(caret));
			file.deleteCharacter(caret);
		}
		else if(ev.type == "delete") { // One character was deleted
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Undoing deleting character=" + UTIL.lbChars(ev.text) + " at caret=" + JSON.stringify(caret));
			
			if(ev.text.indexOf("\n") != -1) file.insertLineBreak(caret);
			else file.putCharacter(ev.text, caret);
			
		}
		else if(ev.type == "reload") { // The file was reloaded with new text
			console.log("Reloading text! ev.text.length=" + ev.text.length);
			file.reload(ev.text);
		}
		else throw new Error("Unknown ev.type=" + ev.type);
		
		if(moveCaret && caret) {
			file.caret = caret;
file.fixCaret();
			file.scrollToCaret();
		}
		
		EDITOR.renderNeeded();
	}
	
	function redo(file, ev, moveCaret) {
		console.log("Applying file change: ev.type=" + ev.type + " ev.index=" + ev.index + " ev.text=" + ev.text + " moveCaret=" + moveCaret);
		
		if(ev.type == "removeRow") {
			var caret = file.createCaret(ev.index);
			console.log("Removing row on row=" + caret.row);
			file.removeRow(ev.row);
		}
		else if(ev.type == "text") { // Text was inserted
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Inserting text at caret=" + JSON.stringify(caret));
			file.insertText(ev.text, caret);
		}
		else if(ev.type == "insert") { // One character was inserted
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Putting character=" + ev.text + " at caret=" + JSON.stringify(caret));
			file.putCharacter(ev.text, caret);
		}
		else if(ev.type == "deleteTextRange") { // Delete a bunch of text
			console.log("Deleting " + ev.text.length + " characters at index=" + ev.index);
			file.deleteTextRange(ev.index, ev.index + ev.text.length-1);
		}
		else if(ev.type == "linebreak") { // A line break was inserted
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Inserting a line break at caret=" + JSON.stringify(caret));
			file.insertLineBreak(caret);
		}
		else if(ev.type == "delete") { // One character was deleted
			var caret = file.createCaret(ev.index, ev.row, ev.col);
			console.log("Deleting character=" + ev.text + " at caret=" + JSON.stringify(caret));
			file.deleteCharacter(caret);
		}
		else if(ev.type == "reload") { // The file was reloaded with new text
			console.log("Reloading text! ev.text.length=" + ev.text.length);
			file.reload(ev.text);
		}
		else throw new Error("Unknown ev.type=" + ev.type);
		
		if(moveCaret && caret) {
			file.caret = caret;
		}
		
		EDITOR.renderNeeded();
	}
	
	function copyObjProp(fromObj) {
		var obj = {};
		for(var prop in fromObj) {
			obj[prop] = fromObj[prop];
		}
		return obj;
	}
	
	function renderCollaborationCarets(ctx, buffer, file, startRow, containZeroWidthCharacters) {
		// Math.floor to prevent sub pixels
		
		var fileCarets = carets[file.path];
		
		if(!fileCarets) return;
		
		var top, left, row, col, color, mod;
		
		for (var cId in fileCarets) {
			row = fileCarets[cId].row;
			col = fileCarets[cId].col;
			top = Math.floor(EDITOR.settings.topMargin + (row - file.startRow) * EDITOR.settings.gridHeight);
			left = Math.floor(EDITOR.settings.leftMargin + (col + (file.grid[row].indentation * EDITOR.settings.tabSpace) - file.startColumn) * EDITOR.settings.gridWidth);
			mod = cId % (EDITOR.settings.style.altColors.length-1);
			color = EDITOR.settings.style.altColors[ mod ];
			
			ctx.fillStyle = color;
			
			ctx.fillRect(left-cId%3, top, EDITOR.settings.caret.width, EDITOR.settings.gridHeight/2);
		}
		
	}
	
	
	// TEST-CODE-START
	
	function testCollaboration(callback) {
		// This function is sync, but need to be run async because the cleanup is async
		
		var ENTER = 13;
		
		collabMode = true;
		
		var testUserConnectionId = userConnectionId + 1;
		var testUserAlias = "Test";
		var testEventOrder = 1;
		var fakeEchoCounter = 1;
		var testFile;
		var fileChangeOrder = 0;
		
		function f(o) {
			
			if(o.index == undefined) throw new Error("Must specify index!");
			if(o.change == undefined) throw new Error("Must specify change!");
			
			var caret = testFile.createCaret(o.index);
			
			var json = {
				cId: testUserConnectionId,
				alias: testUserAlias,
				eventOrder: ++testEventOrder,
				echoCounter: ++fakeEchoCounter,
				fileChange: {
					filePath: testFile.path,
					type: o.change,
					text: o.text || "",
					index: o.index || caret.index,
					row: o.row || caret.row,
					col: o.col || caret.col,
					order: o.order || ++fileChangeOrder,
				}
			}
			
			collabHandleEcho(json);
		}
		
		EDITOR.openFile("collabtest.txt", "\n", function colaborationTestFileOpened(err, file) {
			if(err) throw err;
			
			testFile = file;
			
			if(!EDITOR.currentFile) throw new Error("EDITOR.currentFile=" + EDITOR.currentFile + " EDITOR.files=", EDITOR.files);
			
			if(EDITOR.currentFile != file) throw new Error("EDITOR.currentFile=" + EDITOR.currentFile.path + " expected file=" + file.path);
			
			eventOrder = 1;
			
			EDITOR.mock("typing", "abc");
			if(file.text != "abc\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			// This test fill fail if we are in collaboration mode already when running the test!
			fileChangeOrder = 2; // 3 characters typed (abc) fileChangeOrder:0-1-2
			if(fileChangeEventOrderCounters[file.path] != fileChangeOrder) throw new Error("Unexpeced fileChangeOrder=" + fileChangeOrder + " but got fileChangeEventOrderCounters[" + file.path + "]=" + fileChangeEventOrderCounters[file.path]);
			
			f({change: "linebreak", index: 3, text: "\n"});
			if(file.text != "abc\n\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			f({change: "insert", index: 4, text: "d"});
			if(file.text != "abc\nd\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			f({change: "insert", index: 5, text: "e"});
			if(file.text != "abc\nde\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			f({change: "insert", index: 0, text: "0"});
			if(file.text != "0abc\nde\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			f({change: "delete", index: 0, text: "0"});
			if(file.text != "abc\nde\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			// note: Testing for edit's at the same time need to be async, we'll test edit's ad the same time in another test!
			file.moveCaret(6);
			EDITOR.mock("typing", "f");
			f({change: "insert", index: 7, text: "z"});
			if(file.text != "abc\ndefz\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			// note: Can't test undo/redo in colaboration mode as it has to be async, we'll do that in another test!
			
			
			
			//console.log(JSON.stringify(fileChangeEvents, null, 2));
			
			
			collabMode = false;
			
			setTimeout(function cleanup() {

				// Clean for next run
				for(var obj in fileChangeEventOrderCounters) delete fileChangeEventOrderCounters[obj];
				for(var obj in fileChangeEvents) delete fileChangeEvents[obj];
				
				if(typeof callback == "function") {
					EDITOR.closeFile(file);
					callback(true);
				}
				else {
					file.write("\n\nTests passed!"); // Write at EOF
					EDITOR.renderNeeded();
				}
				
			}, 100);
			
		});
		
		if(typeof callback != "function") return false;
	}
	
	EDITOR.addTest(false, testCollaboration);
	
	
	function testUndoRedoWhileInCollabMode(callback) {
		
		// Undo/redo in colaboration mode
		EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Undo insert f
		if(file.text != "abc\ndez\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
		
		EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Undo insert c
		if(file.text != "ab\ndez\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
		
		fileChangeOrder = 10;
		
		f({change: "insert", index: 0, text: "å"});
		if(file.text != "åab\ndez\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
		
		EDITOR.mock("keydown", {char: "Y", ctrlKey: true}); // Redo insert c
		if(file.text != "åabc\ndez\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
		
		fileChangeOrder = 12;
		
		f({change: "insert", index: 1, text: "ä"});
		if(file.text != "åäabc\ndez\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
		
		EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Undo insert c
		if(file.text != "åäab\ndez\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
	}
	
	
	function testUndoRedo(callback) {
		var Z = 90;
		
		EDITOR.openFile("undoredo.txt", "\n", function colaborationTestFileOpened(err, file) {
			if(err) throw err;

			EDITOR.mock("typing", "ab");
			if(file.text != "ab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "a\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("typing", "12");
			if(file.text != "12\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			if(undoRedoHistory[file.path].length != 2) throw new Error("undoRedoHistory did not reset! index=" + undoRedoHistory[file.path].index + "  undoRedoHistory=" + JSON.stringify(undoRedoHistory, null, 2));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "1\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Should do nothing
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Should do nothing
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Should do nothing
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			
			
			EDITOR.mock("typing", "abc");
			if(file.text != "abc\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "ab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "a\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Should do nothing
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Y", ctrlKey: true});
			if(file.text != "a\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Y", ctrlKey: true});
			if(file.text != "ab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Y", ctrlKey: true});
			if(file.text != "abc\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Y", ctrlKey: true}); // Should do nothing
			if(file.text != "abc\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "ab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			
			// Typing in the middle of the history should reset it
			EDITOR.mock("typing", "åä");
			if(file.text != "abåä\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			console.log("Did history reset ? " + JSON.stringify(undoRedoHistory[file.path], null, 2));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "abå\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "ab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Y", ctrlKey: true});
			if(file.text != "abå\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Y", ctrlKey: true});
			if(file.text != "abåä\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "abå\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "ab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "a\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			
			// Inserting and removing many characters
			file.insertText("xyz");
			if(file.text != "xyz\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Y", ctrlKey: true});
			if(file.text != "xyz\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			file.deleteTextRange(0, 2);
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true});
			if(file.text != "xyz\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			EDITOR.mock("keydown", {char: "Y", ctrlKey: true}); // Redo delete
			if(file.text != "\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			
			// Removing many lines
			file.insertText("123\nabc\ndef\n456");
			if(file.text != "123\nabc\ndef\n456\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			var sel = file.createTextRange(4,10);
			file.select(sel);
			file.deleteSelection();
			if(file.text != "123\n456\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Undo delete selection
			if(file.text != "123\nabc\ndef\n456\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			
			if(typeof callback == "function") {
				EDITOR.closeFile(file);
				callback(true);
			}
			else {
				file.write("\n\nundo/redo test suite passed!"); // Write at EOF
				EDITOR.renderNeeded();
			}
		});
		
		if(typeof callback != "function") return false;
	}
	
	EDITOR.addTest(testUndoRedo);
	
	function testEditAtTheSameTime(callback) {
		collabMode = true;
		
		var testUserConnectionId = userConnectionId + 1;
		var testUserAlias = "Other";
		var testEventOrder = 1;  // Clients send this with each echo
		var fakeEchoCounter = 1; // Managed by the server, server increments for each echo
		var testFile;
		var fileChangeOrder = 0;
		var myAlias = "Me";
		
		/*
			The server will only send echo's to other client!
			So we will not get the echo's we generate! ?????????????
		*/
		
		function f(o) {
			
			if(o.index == undefined) throw new Error("Must specify index!");
			if(o.change == undefined) throw new Error("Must specify change!");
			
			var caret = testFile.createCaret(o.index);
			
			var json = {
				cId: testUserConnectionId,
				alias: testUserAlias,
				eventOrder: ++testEventOrder,
				echoCounter: ++fakeEchoCounter,
				fileChange: {
					filePath: testFile.path,
					type: o.change,
					text: o.text || "",
					index: o.index || caret.index,
					row: o.row || caret.row,
					col: o.col || caret.col,
					order: o.order || ++fileChangeOrder,
				}
			}
			
			collabHandleEcho(json);
		}
		
		function me(o) {
			
			if(o.index == undefined) throw new Error("Must specify index!");
			if(o.change == undefined) throw new Error("Must specify change!");
			
			var caret = testFile.createCaret(o.index);
			
			var json = {
				cId: userConnectionId,
				alias: myAlias,
				eventOrder: ++testEventOrder,
				echoCounter: ++fakeEchoCounter,
				fileChange: {
					filePath: testFile.path,
					type: o.change,
					text: o.text || "",
					index: o.index || caret.index,
					row: o.row || caret.row,
					col: o.col || caret.col,
					order: o.order || ++fileChangeOrder,
				}
			}
			
			collabHandleEcho(json);
		}
		
		EDITOR.openFile("testEditAtTheSameTime.txt", "\n", function (err, file) {
			if(err) throw err;
			
			testFile = file;
			
			if(!EDITOR.currentFile) throw new Error("EDITOR.currentFile=" + EDITOR.currentFile + " EDITOR.files=", EDITOR.files);
			
			if(EDITOR.currentFile != file) throw new Error("EDITOR.currentFile=" + EDITOR.currentFile.path + " expected file=" + file.path);
			
			eventOrder = 1;
			
			timeSerial([
				function() {
					console.log("timeSerial step 1");
					// Close any alert boxes that would prevent insert
					if(EDITOR.openDialogs.length > 0) EDITOR.closeAllDialogs("TESTS");
					
			EDITOR.mock("typing", "abc");
			if(file.text != "abc\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
				}, function() {
					
					// This test fill fail if we are in collaboration mode already when running the test!
					fileChangeOrder = 2; // 3 characters typed (abc) fileChangeOrder:0-1-2
					if(fileChangeEventOrderCounters[file.path] != fileChangeOrder) throw new Error("Unexpeced fileChangeOrder=" + fileChangeOrder + " but got fileChangeEventOrderCounters[" + file.path + "]=" + fileChangeEventOrderCounters[file.path]);
					
					EDITOR.mock("typing", "m");
					
				}, function() {

					fileChangeOrder = 3;
					// We should now have recived our own echo
					var lastChange = fileChangeEvents[file.path][fileChangeOrder][0];
					
					if(lastChange.text != "m") throw new Error("Unexpected lastChange=" + JSON.stringify(lastChange));
					
					fileChangeOrder = 2; // So that the following will get order=3
					f({change: "insert", index: 3, text: "g"});
					
					// Our own change was first
					if(file.text != "abcmg\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
					EDITOR.mock("typing", "x"); 
					// By the time we receive our own echo, we will already have received the following
					f({change: "insert", index: 5, text: "y"}); 
					
					if(file.text != "abcmgyx\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
					
				}, function() {

					// We have now recieved our own echo. The result should still be the same
					if(file.text != "abcmgyx\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
					collabMode = false;
					
					// Clean for next run
					for(var obj in fileChangeEventOrderCounters) delete fileChangeEventOrderCounters[obj];
					for(var obj in fileChangeEvents) delete fileChangeEvents[obj];
					
					if(callback) {
						EDITOR.closeFile(file);
						callback(true);
					}
				}
			]);
		});
		
		// When called by key combo, it needs to return either true or false! (prevent default)
		if(typeof callback != "function") return false;
	}
	
	EDITOR.addTest(false, testEditAtTheSameTime);
	
	function timeSerial(func) {
		// Wait between each step
		var timeMult = 100;
		for(var i=0; i<func.length; i++) {
			setTimeout(func[i], i*timeMult);
		}
	}
	
	// TEST-CODE-END
	
	
})();
