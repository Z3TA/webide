(function() {
	"use strict";
	
	/*
		
		Work in progres ...
		
		
		Problem: How to get the current event.id for a file !?
		Solution: Have the server keep track of event id's for each file
		
		Problem: We don't just want to have collaboration when logging in to the same account
		Solution: Make it possible to share the session, by giving a temorary login token/password
		
		Hmm, how will this work with the terminal !? Make the terminal only send to the client with the terminal !?
		
	*/
	
	var eventOrder = -1;
	var eventOrderSynced = false;
	var userConnectionId = 0;
	var fileChangeEvents = {}; // filePath: ev: Store latest events for use in transformation
	var collabMode = false;
	var ignoreNextFileChangeEvent = false;
	var fileChangeEventOrders = {}; // Separate order counters for each file(path): filePath: order (Number: counter)
	var meMaster = false;
	var connectionClosedDialog;
	var clientLeaveDialog = {}; 
	
	EDITOR.plugin({
		desc: "Let you see changes live while logged in from different devices",
		load: function loadCollaboration() {
			
			EDITOR.on("fileOpen", collabFileOpen);
			EDITOR.on("fileClose", collabFileClose);
			EDITOR.on("fileChange", collabFileChange);
			EDITOR.on("moveCaret", collabMoveCaret);
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
			
			if(EDITOR.settings.devMode) {
				var charC = 67;
				EDITOR.bindKey({desc: "Run collaboration test suite", fun: testCollaboration, charCode: charC, combo: CTRL+SHIFT});
			}
			
		},
		unload: function unloadCollaboration() {
			
			EDITOR.removeEvent("fileOpen", collabFileOpen);
			EDITOR.removeEvent("fileClose", collabFileClose);
			EDITOR.removeEvent("fileChange", collabFileChange);
			EDITOR.removeEvent("moveCaret", collabMoveCaret);
			EDITOR.removeEvent("fileOpen", collabFileOpen);
			EDITOR.removeEvent("select", collabSelectText);
			
			CLIENT.removeEvent("echo", collabHandleEcho);
			CLIENT.removeEvent("loginSuccess", collabLoginSuccess);
			CLIENT.removeEvent("clientJoin", collabJoin);
			CLIENT.removeEvent("clientLeave", collabLeave);
			CLIENT.removeEvent("connectionLost", collabConnectionLost);
			
			EDITOR.unbindKey(testCollaboration);
			
		},
		order: 100
	});
	
	function collabLoginSuccess(json) {
		// Login success comes before collabConnect!
		// json: {user: userConnectionName, cId: userConnectionId, installDirectory: installDirectory}
		
		userConnectionId = json.cId;
		
		// Get the eventOrder, (currently echoCounter)
		CLIENT.cmd("echo", {eventOrder: -1, ping: new Date().getTime()});
		
		if(connectionClosedDialog) connectionClosedDialog.close();
		
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
					if(!fileChangeEventOrders.hasOwnProperty(path)) fileChangeEventOrders[path] = 0;
				}
				CLIENT.cmd("echo", {eventOrder: ++eventOrder, fileChangeEventOrders: fileChangeEventOrders});
			}
			
			var file;
			for(var path in EDITOR.files) {
				file = EDITOR.files[path];
				if(!file.isSaved && file.savedAs) syncFile(file);
			}
			
			if(json.cId != userConnectionId) {
				if(clientLeaveDialog.hasOwnProperty(json.alias)) {
					clientLeaveDialog[json.alias].close();
					delete clientLeaveDialog[json.alias];
				}
				else alertBox(json.alias + " client joined your session.\nYou are now in collaboration mode!");
			}
			
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
		
		if(connectedClientIds.length == 1) {
			// We are the only connected client
			if(connectedClientIds[0] != userConnectionId) throw new Error("Unexpected: userConnectionId=" + userConnectionId + " connectedClientIds=" + JSON.stringify(connectedClientIds))
			collabMode = false;
			if(!clientLeaveDialog.hasOwnProperty(json.alias)) clientLeaveDialog[json.alias] = alertBox(json.alias + " client disconnected.\nWe are no longer in collaboration mode !");
		}
		else if(connectedClientIds.length > 1) {
			if(!clientLeaveDialog.hasOwnProperty(json.alias)) clientLeaveDialog[json.alias] = alertBox(json.alias || json.id + " client disconnected");
		}
		else throw new Error("connectedClientIds.length=" + jconnectedClientIds.length + " json:" + JSON.stringify(json, null, 2));
		
		return true;
	}
	
	function collabConnectionLost() {
		// We have lost the connection from the server
		
		userConnectionId = null;
		
		if(!connectionClosedDialog) connectionClosedDialog = alertBox("We have lost the connection to the server. Exiting collaboraction mode!");
		
		collabMode = false;
		
	}
	
	
	function collabMoveCaret(file, caret) {
		return true;
	}
	
	function collabFileOpen(file) {
		
		if(!fileChangeEventOrders.hasOwnProperty(file.path)) fileChangeEventOrders[file.path] = 0;
		
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
		console.log(selection);
		
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
		//if(change != "undo-redo") throw new Error("We really need to make a new undo-redo!"
		
		if(!collabMode) return;
		if(ignoreNextFileChangeEvent) return;
		
		if(file == undefined) throw new Error("file=" + file);
		if(change == undefined) throw new Error("change=" + file);
		if(text == undefined) throw new Error("text=" + file);
		if(index == undefined) throw new Error("index=" + index);
		if(row == undefined) throw new Error("row=" + row);
		if(col == undefined) throw new Error("col=" + col);
		
		if(!fileChangeEventOrders.hasOwnProperty(file.path)) throw new Error("fileChangeEventOrders: " + JSON.stringify(fileChangeEventOrders, null, 2));
		
		var fileChangeEvent = {
			filePath: file.path, 
			type: change, 
			text: text, 
			index: index, 
			row: row || file.caret.row,
			col: col || file.caret.col,
			order: ++fileChangeEventOrders[file.path], 
			cId: userConnectionId // The server adds cId, but we also want it in the file change object
		};
		
		if(!fileChangeEvents.hasOwnProperty(file.path)) fileChangeEvents[file.path] = [];
		
		fileChangeEvents[file.path][fileChangeEvent.order] = fileChangeEvent;
		
		console.log("Sending fileChangeEvent=" + JSON.stringify(fileChangeEvent, null, 2));
		
		CLIENT.cmd("echo", {eventOrder: ++eventOrder, fileChange: fileChangeEvent});
		
		return true;
	}
	
	function collabHandleEcho(json) {
		
		console.log("collabHandleEcho: json=" + JSON.stringify(json, null, 2));
		
		if(!json.eventOrder == undefined) throw new Error("Echo without eventOrder: " + JSON.stringify(json));
		if(!json.echoCounter == undefined) throw new Error("Echo without echoCounter: " + JSON.stringify(json));
		if(!json.alias) throw new Error("Echo without alias: " + JSON.stringify(json));
		if(!json.cId == undefined) throw new Error("Echo without cId: " + JSON.stringify(json));
		
		if(json.cId == userConnectionId) throw new Error("It should not be possible to get echo's from myself! json.cId=" + json.cId + " userConnectionId=" + userConnectionId);
		
		if(eventOrderSynced) eventOrder++;
		
		if(json.ping) {
			console.log("Server latency: " + ( (new Date()).getTime() - json.ping ) + "ms");
			eventOrder = json.echoCounter;
			console.log("Set eventOrder=" + eventOrder);
		}
		else if(eventOrderSynced && json.eventOrder > eventOrder) {
			throw new Error("Events are out of order, we have missed " + (json.eventOrder-eventOrder) + " events! json.eventOrder=" + json.eventOrder + " eventOrder=" + eventOrder);
		}
		else if(json.fileChangeEventOrders) {
			fileChangeEventOrders = json.fileChangeEventOrders;
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
		else if(json.sync) {
			
			// ### Sync file
			var sync = json.sync;
			var file = EDITOR.files[sync.path];
			if(!file) console.log("File not opened, no need to sync: path=" + sync.path);
			else {
				
				if(file.isSaved && file.hash == sync.hash) updateFileConent(file, sync.text);
				else if(file.text == sync.text) console.log("No update needed, sync and file is the same!");
				else {
					var update = "Just update";
					var backup = "Save a backup"
					confirmBox( json.alias  + " has made changes to:\n" + sync.path + "\n\nSave a backup before updating ?", [update, backup], function(answer) {
						if(answer == update) updateFileConent(file, sync.text);
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
			
			if(!fileChangeEventOrders.hasOwnProperty(file.path)) throw new Error("fileChangeEventOrders: " + JSON.stringify(fileChangeEventOrders, null, 2));
			
			var currentOrder = fileChangeEventOrders[file.path];
			fileChangeEventOrders[file.path]++;
			
			console.log("currentOrder=" + currentOrder + " ev.order=" + ev.order);
			
			if(ev.order > currentOrder+1) {
				throw new Error("File change events are out of order, we have missed " + (ev.order-fileChangeEventOrders[file.path]) + " events!");
			}
			
			else if(ev.order == currentOrder+1) {
				console.log("ev.order=" + ev.order + " is the latest order! currentOder=" + currentOrder + ". No need to transform");
			}
			else if(ev.order == currentOrder ) {
				console.log("Two file change events with the same ev.order=" + ev.order + " currentOrder=" + currentOrder + ". We need to transform!");
				if(fileChangeEvents[file.path][ev.order].cId == userConnectionId) {
					// I just sent an event with this order
					// In my point of view I was first
					console.log("Change ev.order=" + ev.order + " was made by this client.");
					// We need to transform the event with the other event in mind
					var previousEvent = fileChangeEvents[file.path][ev.order];
					transformBackwards(ev, previousEvent);
				}
				else if(ev[ev.order].cId == ev.cId) {
					throw new Error("User with cId=" + ev.cId + " sent two change events with the same order!");
				}
				else {
					// Two different users who are not me, sent an event at the same time
					// In my point of view, the event we have already recived came first!
					// We have to transform from the previous event
					var previousEvent = fileChangeEvents[file.path][ev.order];
					console.log("Transforming with previous event: " + JSON.stringify(previousEvent));
					transformBackwards(ev, previousEvent);
				}
			}
			else if(ev.order < currentOrder) {
				console.log(json.alias +  " is behind! ev.order=" + ev.order + " currentOrder=" + currentOrder);
				var order = ev.order;
				while(order++ < currentOrder) transformBackwards(ev, fileChangeEvents[file.path][order]);
				
			}
			else {
				throw new Error("ev.order=" + ev.order + " currentOrder=" + currentOrder);
			}
			
			if(!fileChangeEvents.hasOwnProperty(file.path)) fileChangeEvents[file.path] = [];
			
			fileChangeEvents[file.path][currentOrder] = ev;
			
			
			// ### Apply file change
			
			ignoreNextFileChangeEvent = true;
			
			console.log("Applying file change: ev.type=" + ev.type + " ev.index=" + ev.index);
			
			if(ev.type == "removeRow") {
				console.log("Removing row on row=" + row);
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
				file.deleteTextRange(ev.index, ev.index + ev.text.length);
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
			
			ignoreNextFileChangeEvent = false;
			
			if(file == EDITOR.currentFile) EDITOR.renderNeeded();
			
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
		
		return true;
		
		function transformBackwards(ev, prev) {
			
			if(prev == undefined || ev == undefined) throw new Error("ev=" + JSON.stringify(ev) + " prev=" + JSON.stringify(prev));
			
			var textLength = prev.text.length;
			
			console.log("Transforming backwards from prev.type=" + prev.type + " prev.index=" + prev.index + " ev.index=" + ev.index);
			
			if(prev.type == "removeRow") {
				if(ev.index > prev.index) ev.index -= textLength;
			}
			else if(prev.type == "text") { // Text was inserted
				if(ev.index >= prev.index) ev.index += textLength;
			}
			else if(prev.type == "insert") { // One character was inserted
				if(ev.index >= prev.index) ev.index += 1;
			}
			else if(prev.type == "deleteTextRange") { // Delete a bunch of text
				if(ev.index > prev.index) ev.index -= textLength;
			}
			else if(prev.type == "linebreak") { // A line break was inserted
				
			}
			else if(prev.type == "delete") { // One character was deleted
			}
			else if(prev.type == "reload") { // The file was reloaded with new text
			}
			
		}
		
		
		function updateFileConent(file, text) {
			ignoreNextFileChangeEvent = true;
			file.reload(text);
			ignoreNextFileChangeEvent = false;
		}
	}
	
	
	
	// TEST-CODE-START
	
	function testCollaboration(callback) {
		
		var ENTER = 13;
		
		collabMode = true;
		
		var testUserConnectionId = userConnectionId + 1;
		var testUserAlias = "Test";
		var testEventOrder = 1;
		var fakeEchoCounter = 1;
		var testFile;
		var fileChangeOrder = 1;
		
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
					order: o.order || ++fileChangeOrder,
					index: o.index || caret.index,
					row: o.row || caret.row,
					col: o.col || caret.col,
					text: o.text || "",
					type: o.change
				}
			}
			
			collabHandleEcho(json);
		}
		
		EDITOR.openFile("collabtest.txt", "\n", function(err, file) {
			if(err) throw err;
			
			testFile = file;
			
			eventOrder = 1;
			
			EDITOR.mock("typing", "abc");
			if(file.text != "abc\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			fileChangeOrder = 3; // 3 characters type (abc)
			if(fileChangeEventOrders[file.path] != fileChangeOrder) throw new Error("Unexpected: fileChangeOrder=" + fileChangeOrder + " fileChangeEventOrders[" + file.path + "]=" + fileChangeEventOrders[file.path]);
			
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
			
			// Edit at the same time
			file.moveCaret(6);
			EDITOR.mock("typing", "f");
			f({change: "insert", index: 6, text: "z"});
			if(file.text != "abc\ndefz\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
			
			
			
			
			
			if(typeof callback == "function") callback(true);
			else {
				file.write("\n\nCollaboration test suite passed!"); // Write at EOF
			}
			collabMode = false;
			
		});
		
		if(typeof callback != "function") return false;
	}
	
	EDITOR.addTest(testCollaboration);
	
	// TEST-CODE-END
	
	
})();
