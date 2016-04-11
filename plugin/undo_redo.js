
(function() {
	
	"use strict";
	
	var sizeLimit = 1000000;
	
	var history = {}, // Holds the state of all files
		versionIndex = {}; // Keeps track of current index in the state array
	
	
	editor.on("start", undor_redo_init, 0); // High prio! Run before keyboard_delete and backspace! Set order low
	
	function undor_redo_init() {
		
		editor.keyBindings.push({charCode: 89, fun: redo, combo: CTRL});
		
		editor.keyBindings.push({charCode: 90, fun: undo, combo: CTRL});
		
		// When to save state !??
		editor.keyBindings.push({charCode: 46, fun: saveState}); // Delete
		editor.keyBindings.push({charCode: 8, fun: saveState}); // Backspace

		editor.on("paste", saveState); // Before pasting text
		
		editor.on("fileOpen", saveState); // When loading a file

		
		/* Save state every seconds!
		setInterval(function() {
			if(editor.currentFile) {
				saveState(editor.currentFile);
			}
		}, 1000);
		*/
		
		console.log("undo_redo.js loaded!");

	}
	
	editor.on("fileChange", function(file, change, text, index, row, col) {
		
		if(change != "undo-redo") {
			
			// Make the current state the last state (delete future states) when something is changed
			if(versionIndex.hasOwnProperty(file.path)) {
					
				history[file.path].length = versionIndex[file.path]+1;
			
			}
		}
		
	});

	
	function undo(file) {
		
		if(editor.input) {
			
			console.log("UNDO");
			
			if(versionIndex.hasOwnProperty(file.path)) {
				
				// If we are at last/current/latest state, save before going back.
				if(versionIndex[file.path] == history[file.path].length-1) {
					if(saveState(file)) {
						//versionIndex[file.path]--;
					};
					
				}
				
				if(versionIndex[file.path] > 0) {
					versionIndex[file.path]--;
				}
				else {
					console.log("Did not go back because we are already at the very first");
				}
				
				loadState(file, versionIndex[file.path]);
				
				
			}
			else {
				console.warn("No saved state!");
			}
			
			return false; // Prevent default
		}
		
	}
	
	
	function redo(file) {
		
		if(editor.input) {
			
			console.log("REDO");
			
			if(versionIndex.hasOwnProperty(file.path)) {
				
				if(versionIndex[file.path] < history[file.path].length-1) {
					versionIndex[file.path]++;
					
					loadState(file, versionIndex[file.path]);
				}
				else {
					console.log("We are already at the latest saved sate! version=" + versionIndex[file.path] + " history.lenght-1=" + (history[file.path].length -1) + "");
				}
				
			}
			else {
				console.warn("No saved state!");
			}
			
			return false; // Prevent default
		}
			
			
	}
	
	
	function timeDiff(d1, d2) {
		var time = (d1.getTime() - d2.getTime()) / 1000;
		var hours = Math.floor(time / 3600);
		var minutes = Math.floor((time - hours * 3600) / 60);
		var seconds = time - minutes * 60 - hours * 3600;
		

		return fillZero(hours) + ":" + fillZero(minutes) + ":" + fillZero(seconds);
		
		function fillZero(n) {
			n = parseInt(n);
			
			if(n<10) {
				return "0" + n;
			}
			else {
				return n;
			}
		}
		
	}
	
	
	function loadState(file, stateIndex) {
		
		var state = history[file.path][stateIndex],
			timeAgo = timeDiff(new Date(), state.date);
		
		if(file.text == state.text) {
			console.warn("Current state is not different then the state you try to load! state-index=" + stateIndex + "");
			return;
		}
		
		console.log("Loading file state from " + timeAgo + " ago ...");
		
		// Scroll to first diff
		var oldGrid = file.text.split("\n");
		var newGrid = state.text.split("\n");
		
		for(var i=0; i<oldGrid.length, i<newGrid.length; i++) {
			if(oldGrid[i] != newGrid[i]) {
				console.log("First diff on line=" + i);
				// Do not scroll if it's visible
				if(i < file.startRow || i > (file.startRow + editor.view.visibleRows)) {
					file.scrollTo(0, Math.round(i-editor.view.visibleRows/2));
				}
				break;
			}
		}
		
		file.text = state.text;
		file.selected = state.selected.splice(); // copy
		file.grid = file.createGrid();
		//file.fixCaret(state.caret); // I shouldn't be needing this! 
		file.mutateCaret(file.caret, state.caret);
		
		
		// Call file edit listeners
		file.change("undo-redo", state.text, 0, 0, 0) // change, text, index, row, col

		editor.renderNeeded();
		
		if(file.savedAs) {
		// Check if this is the current version on the disk:
			editor.readFromDisk(file.path, function compare(path, string) {
			if(file.text == string) {
				// It's saved
					file.saved(); // Doesn't actually save on disk. Only calls event listeners and sets state to saved.
					}
			});
			}
		
	}
	
	
	
	function saveState(file) {
		
		if(file.text.length > editor.settings.bigFileSize || file.isBig) {
			console.warn("Not saving undor/redo state for file because it has more then " + editor.settings.bigFileSize + " characters! (or is a stream) file.path=" + file.path);
			return true;
		}
		
		if(editor.input) {
			var state;
			
			//console.log("saveState:\n" + file.text);

			
			if(!history.hasOwnProperty(file.path)) {
				history[file.path] = [];
				versionIndex[file.path] = 0;
				state = history[file.path];
			}
			else {
				state = history[file.path];
				// Do not save if current state is the same as last state
				var lastState = state[state.length-1];
				
				if(file.text == lastState.text) {
					console.log("current state is the same as last state");
					return false;
				}
			}
			
			// Only save if versionIndex is at current state!
			if(versionIndex[file.path] != (state.length-1) && state.length > 0) {
				console.log("Current state version=" + versionIndex[file.path] + " is not the last version=" + (state.length-1) + ".");
				return false;
			}

			versionIndex[file.path] = state.push({
				date: new Date(),
				text: file.text, // copy text
				caret: file.mutateCaret({}, file.caret), // copy caret
				selected: file.selected.slice() // copy selected
			}) - 1; // Array.push returns the new length, hence the minus 1 to get the new index
			
			
			console.log("State for " + file.name + " saved!");
			
			return false;
			
		}
		
		return true;
	}
	
	
})();