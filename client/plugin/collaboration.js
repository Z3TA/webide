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
	
	var eventOrder = 0;
	var userConnectionId = 0;
	var events = {}; // filePath: ev: Store latest events for use in transformation
	var collabMode = false;
	var ignoreNextFileChangeEvent = false;
	var collabClients = []; // client id, only the one who first connected has the full list
	
	EDITOR.plugin({
		desc: "Let you see changes live while logged in from different devices",
		load: function loadCollaboration() {

			EDITOR.on("fileOpen", collabFileOpen);
			EDITOR.on("fileClose", collabFileClose);
			EDITOR.on("fileChange", collabFileChange);
			EDITOR.on("moveCaret", collabMoveCaret);
			
			CLIENT.on("echo", collabHandleEcho);
			CLIENT.on("loginSuccess", collabLoginSuccess);
			CLIENT.on("clientJoin", collabJoin);
			CLIENT.on("clientLeave", collabLeave);
			CLIENT.on("connectionLost", collabConnectionLost);
			
			
		},
		unload: function unloadCollaboration() {
			
			EDITOR.removeEvent("fileOpen", collabFileOpen);
			EDITOR.removeEvent("fileClose", collabFileClose);
			EDITOR.removeEvent("fileChange", collabFileChange);
			EDITOR.removeEvent("moveCaret", collabMoveCaret);
			
			CLIENT.removeEvent("echo", collabHandleEcho);
			CLIENT.removeEvent("loginSuccess", collabLoginSuccess);
			CLIENT.removeEvent("clientJoin", collabJoin);
			CLIENT.removeEvent("clientLeave", collabLeave);
			CLIENT.removeEvent("connectionLost", collabConnectionLost);
			
},
		order: 100
	});
	
	function collabLoginSuccess(json) {
		// Login success comes before collabConnect!
		// json: {user: userConnectionName, cId: userConnectionId, installDirectory: installDirectory}
		
		userConnectionId = json.cId;
		
		// Get the eventOrder, (currently echoCounter)
		CLIENT.cmd("echo", {ping: new Date().getTime()});
		
	}
	
	
	function collabJoin(json) {
		// A new client has connected
		
		console.log("collabJoin: " + JSON.stringify(json));
		
		if(json.connectionCount > 1) {
			// More then one user logged in to the same account
			
			collabMode = true;
			
			/*
				Need to sync unsaved savedAs files
				Problem: Who is going to send the state to the new client !?
				Answer: The one with the lowest client id
				Problem2: The "master" might have the file unsaved, while the new client might have the file modified
				Answer: 
			*/
			
			if(json.cId == undefined) throw new Error("json.cId=" + json.cId);
			if(collabClients.indexOf(json.cId) != -1) throw new Error("json.cId=" + json.cId + " already in collabClients=" + JSON.stringify(collabClients));
			collabClients.push(json.cId);
			collabClients.sort(function sortNumber(a,b) {
				return a - b;
			});
			//if(collabClients.length != json.connectionCount) throw new Error("json.connectionCount=" + json.connectionCount + " collabClients.length=" + collabClients.length + " collabClients=" + JSON.stringify(collabClients));
			//if(collabClients[0] > collabClients[0]) throw new Error("Wrong sort order: collabClients=" + JSON.stringify(collabClients));
			
			var master = collabClients[0];
			if(userConnectionId == master) {
				var file;
				for(var path in EDITOR.files) {
					file = EDITOR.files[path];
					if(!file.isSaved && file.savedAs) syncFile(file);
				}
			}
			
			if(json.cId != userConnectionId) {
				alertBox(json.alias || json.ip + " client joined your session.\nYou are now in collaboration mode!");
			}
			
		}
		
		function syncFile(file) {
			
			eventOrder++;
			var ev = {
				path: file.path,
				text: file.text,
				hash: file.hash,
				caret: file.caret,
				order: eventOrder,
				cId: userConnectionId,
				collabClients: collabClients
			};
			
			CLIENT.cmd("echo", {sync: ev});
		}
		
	}
	
	function collabLeave(json) {
		// A client has disconnected
		
		console.log("collabLeave: " + JSON.stringify(json));
		
		if(json.connectionCount == 1) {
			// We are the only connected client
			collabMode = false;
			alertBox(json.alias || json.id + " client disconnected.\nWe are no longer in collaboration mode !");
		}
		else if(json.connectionCount > 1) {
			alertBox(json.alias || json.id + " client disconnected");
		}
		else throw new Error("json.connectionCount=" + json.connectionCount + " json:" + JSON.stringify(json, null, 2));
		
		if(json.cId == undefined) throw new Error("json.cId=" + json.cId);
		var collabClientsIndex = collabClients.indexOf(json.cId);
		if(collabClientsIndex == -1) console.warn("json.cId=" + json.cId + " not in collabClients=" + JSON.stringify(collabClients));
		collabClients.splice(collabClientsIndex, 1);
		
		return true;
	}
	
	function collabConnectionLost() {
		// We have lost the connection from the server
		
		userConnectionId = null;
		
		alertBox("We have lost the connection to the server. Exiting collaboraction mode!");
		collabMode = false;
		
		collabClients.length = 0;
		
	}
	
	
	function collabMoveCaret(file, caret) {
		return true;
	}
	
	function collabFileOpen(file) {
		
		return true;
	}
	
	function collabFileClose(file) {
		
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
		
		eventOrder++;
		var fileChangeEvent = {
			filePath: file.path, 
			type: change, 
			text: text, 
			index: index, 
			row: row || file.caret.row,
			col: col || file.caret.col,
			order: eventOrder, 
			cId: userConnectionId
		};
		
		if(!events.hasOwnProperty(file.path)) events[file.path] = [];
		
		events[file.path][eventOrder] = fileChangeEvent;
		
		CLIENT.cmd("echo", {fileChange: fileChangeEvent});
		
		return true;
	}
	
	function collabHandleEcho(json) {
		
		if(json.ping) {
			console.log("Server latency: " + ( (new Date()).getTime() - json.ping ) + "ms");
			eventOrder = json.echoCounter;
		}
		else if(json.sync) {
			
			// ### Sync file
			var sync = json.sync;
			var file = EDITOR.files[sync.path];
			if(!file) console.log("File not opened, no need to sync: path=" + sync.path);
			else {
				
				if((file.isSaved || file.text == sync.text) && file.hash == sync.hash) updateFileConent(file, sync.text);
				else {
					var update = "Just update";
					var backup = "Save a backup"
					confirmBox( (sync.alias || sync.ip) + " has made changes to:\n" + sync.path + "\n\nSave a backup before updating ?", [update, backup], function(answer) {
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
			
			var ev = json.fileChange;
			var file = EDITOR.files[ev.filePath];
			
			if(ev.cId == userConnectionId) {
				// Event from myself, can be ignored
				return;
			}
			
			// Apply change
			if(file == undefined) {
				console.warn("Got change to a file that we do not have open: " + ev.filePath);
				return;
			}
			
			
			if(ev.order > (eventOrder+1)) {
				throw new Error("Events are out of order, we have missed " + (ev.order-eventOrder) + " events!");
			}
			else if(ev.order == (eventOrder+1)) {
				// This is "latest". No need to transform
			}
			else if(ev.order == eventOrder) {
				// Two events at the same time. We need to transform
				if(events[file.path][ev.order].cId == userConnectionId) {
					// I just sent an event with this order
					// In my point of view I was first
				}
				else if(ev[ev.order].cId == ev.cId) {
					throw new Error("User with cId=" + ev.cId + " sent two change events with the same order!");
				}
				else {
					// Two different users who are not me, sent an event at the same time
					// In my point of view, the event we have already recived came first!
					// We have to transform from the previous event
					var previousEvent = events[file.path][ev.order];
					transformBackwards(ev, previousEvent);
				}
			}
			else if(ev.order < eventOrder) {
				// Someone is lagging behind
				var order = ev.order;
				while(order++ < eventOrder) transformBackwards(ev, events[file.path][order]);
				
			}
			else {
				throw new Error("ev.order=" + ev.order + " eventOrder=" + eventOrder);
			}
			
			
			// Need to do some transformation so that inserts/deletions are done in the right places
			
			eventOrder++;
			
			if(!events.hasOwnProperty(file.path)) events[file.path] = [];
			
			events[file.path][eventOrder] = ev;
			
			// ### Apply change
			
			ignoreNextFileChangeEvent = true;
			
			if(ev.type == "removeRow") {
				file.removeRow(ev.row);
			}
			else if(ev.type == "text") { // Text was inserted
				var caret = file.createCaret(ev.index, ev.row, ev.col);
				file.insertText(ev.text, caret);
			}
			else if(ev.type == "insert") { // One character was inserted
				var caret = file.createCaret(ev.index, ev.row, ev.col);
				file.putCharacter(ev.text, caret);
			}
			else if(ev.type == "deleteTextRange") { // Delete a bunch of text
				file.deleteTextRange(ev.index, ev.index + ev.text.length);
			}
			else if(ev.type == "linebreak") { // A line break was inserted
				var caret = file.createCaret(ev.index, ev.row, ev.col);
				file.insertLineBreak(caret);
			}
			else if(ev.type == "delete") { // One character was deleted
				var caret = file.createCaret(ev.index, ev.row, ev.col);
				file.deleteCharacter(caret);
			}
			else if(ev.type == "reload") { // The file was reloaded with new text
				file
			}
			
			ignoreNextFileChangeEvent = false;
			
			if(file == EDITOR.currentFile) EDITOR.renderNeeded();
			
		}
		
		return true;
		
		function transformBackwards(ev, prev) {
			
			var textLength = prev.text.length;
			
			console.log("Transforming backwards from prev.type=" + prev.type + " ");
			
			if(prev.type == "removeRow") {
				if(ev.index > prev.index) ev.index -= textLength;
			}
			else if(prev.type == "text") { // Text was inserted
				if(ev.index > prev.index) ev.index += textLength;
			}
			else if(prev.type == "insert") { // One character was inserted
				if(ev.index > prev.index) ev.index -= 1;
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
	
})();
