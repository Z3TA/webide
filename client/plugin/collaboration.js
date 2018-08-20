(function() {
	"use strict";

	/*
		
		Problem: How to get the current event.id for a file !?
		Solution: Have the server keep track of event id's for each file
		
	*/
	
	var eventOrder = 0;
	var userConnectionId = 0;
	var events = {}; // filePath: ev: Store latest events for use in transormation
	
	EDITOR.plugin({
		desc: "Let you see changes live while logged in from different devices",
		load: loadCollaboration() {

			EDITOR.on("fileOpen", collabFileOpen);
			EDITOR.on("fileClose", collabFileClose);
			EDITOR.on("fileChange", collabFileChange);
			
			CLIENT.on("echo", collabHandleEcho);
			CLIENT.on("loginSuccess", collabLoginSuccess);
		},
		unload: unloadCollaboration() {
}
	});
	
	function collabLoginSuccess(json) {
		// json: {user: userConnectionName, cId: userConnectionId, installDirectory: installDirectory}
		
		userConnectionId = json.cId;
		
		// Get the ECHO_COUNTER
		CLIENT.cmd("echo", {ping: new Date().getTime()});
	}
	
	function collabFileOpen(file) {
		
	}

	function collabFileClose(file) {
		
	}
	
	function collabFileChange(file, change, text, index, row, col) {
		//if(change != "undo-redo") throw new Error("We really need to make a new undo-redo!"
		
		eventOrder++;
		var ev = {
			filePath: file.path, 
			type: change, 
			text: text, 
			index: index, 
			order: eventOrder, 
			cId: userConnectionId
		};
		events[][eventOrder] = ev;
		
		CLIENT.cmd("echo", {change: ev});
		
	}
	
	function collabHandleEcho(json) {
		
		if(json.ping) {
			console.log("Server latency: " + (new Date()).getTime() - json.ping) + "ms");
			eventOrder = json.ECHO_COUNTER;
		}
		else if(json.change) {

			var ev = json.change;
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
				if(events[ev.order].cId == userConnectionId) {
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
					var previousEvent = events[ev.order];
					transformBackwards(ev, previousEvent);
				}
			}
			else if(ev.order < eventOrder {
				// Someone is lagging behind
				var order = ev.order;
				while(order++ < eventOrder) transformBackwards(ev, events[order]);
				
			}
			else {
				throw new Error("ev.order=" + ev.order + " eventOrder=" + eventOrder);
			}
			
			
			
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
			
			// Need to do some transformation so that inserts/deletions are done in the right places
			
			eventOrder++;
			
			events[eventOrder] = ev;
			
			
			
			
		}
		
	}
	
})();
