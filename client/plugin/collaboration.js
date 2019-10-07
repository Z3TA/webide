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
	var ignoreUndoRedoEvent = {}; // filePath: [ev.order...]
	var winMenuUndo, winMenuRedo, winMenuInvite, winMenuRecord;
	
	var recordTimeline, recordButton, playButton, isRecording = false, record = [], playbackFPS = 25;
	var playbackInterval, isPlaying = false, recordInfo, lastRecordItem = -1;
	var saveRecordButton, recordWidget, audioPlayer, soundVisualizer, mediaRecorder;
	var audioBlob, loadedAudioFile, lastRecordedMouseCaretRow = -1, lastRecordedMouseCaretCol = -1;
	var fakeMouseElement, playbackMouseSize = EDITOR.settings.gridWidth, mousePlaybackCountdown = 0, mousePlaybackPositionX = -100;
	var mousePlaybackPositionY = -100, mousePlaybackDeltaX = 0, mousePlaybackDeltaY = 0, keyComboDiv;
	var lastRecordedMouseTarget, mousePlaybackPositionLastSetX, mousePlaybackPositionLastSetY, fakeMouseElementHideTimer;
	
	var targetsToBeIgnoredRegexp = [];
	var targetsToBeIgnored = [
		"canvas", 
		"discoveryBar", 
		"leftColumn",
		"tabList", 
		"windowMenu", 
		"windowMenuHeight", 
		"errorOverlay", 
		"body", 
		"footer", 
		"header", 
		"saveRecordButton", 
		"publishRecordButton", 
		"cancelRecordningButton", 
		"recordTimeline", 
		"recordningAudioPlayer", 
		"recordningSoundVisualizer", 
		"startOrStopRecordningButton", 
		"startOrStopPlaybackButton",
		"restartPlaybackButton",
		"wireframe"
	];
	
	// todo: use collabreod and collabundo when playing back so that the watcher can also type
	
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
			EDITOR.on("deselect", recordDeselect);
			
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
			EDITOR.registerAltKey({char: "(", label: "Invite collaborator", alt: 3, fun: invite});
			
			menu = EDITOR.ctxMenu.add("Invite collaborator", invite, 14);
			
			recordWidget = EDITOR.createWidget(buildRecordWidget);
			
			winMenuUndo = EDITOR.windowMenu.add("Undo", ["Edit", 3], collabUndoViaMenu, collabUndo);
			winMenuRedo = EDITOR.windowMenu.add("Redo", ["Edit", 3], collabRedoViaMenu, collabRedo);
			winMenuInvite = EDITOR.windowMenu.add("Invite collaborator", ["Editor", 3], invite);
			winMenuRecord = EDITOR.windowMenu.add("Record tutorial", ["Tools", 30], recordWidget.show);
			
			var discoveryItem = document.createElement("img");
			discoveryItem.setAttribute("id", "collaborationDiscovery");
			discoveryItem.src = "gfx/treaty.svg"; // Icon created by: https://www.flaticon.com/authors/phatplus
			discoveryItem.title = "Invite collaborator";
			discoveryItem.onclick = inviteFromDiscoveryBar;
			EDITOR.discoveryBar.add(discoveryItem, 70);
			
			
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
			EDITOR.removeEvent("deselect", recordDeselect);
			
			CLIENT.removeEvent("echo", collabHandleEcho);
			CLIENT.removeEvent("loginSuccess", collabLoginSuccess);
			CLIENT.removeEvent("clientJoin", collabJoin);
			CLIENT.removeEvent("clientLeave", collabLeave);
			CLIENT.removeEvent("connectionLost", collabConnectionLost);
			
			EDITOR.ctxMenu.remove(menu);
			EDITOR.windowMenu.remove(winMenuUndo);
			EDITOR.windowMenu.remove(winMenuRedo);
			EDITOR.windowMenu.remove(winMenuInvite);
			
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
			EDITOR.unregisterAltKey(invite);
			
		},
		order: 100
	});
	
	function buildRecordWidget() {
		
		var wrap = document.createElement("div");
		
		playButton = document.createElement("button");
		playButton.setAttribute("id", "startOrStopPlaybackButton");
		playButton.classList.add("playButton", "button", "half");
		playButton.innerText = "▶ Start playback";
		playButton.onclick = startOrStopPlayback;
		wrap.appendChild(playButton);
		
		recordButton = document.createElement("button");
		recordButton.setAttribute("id", "startOrStopRecordningButton");
		recordButton.classList.add("recordButton", "button", "half");
		recordButton.innerText = "● Start recording";
		recordButton.onclick = startOrStopRecording;
		wrap.appendChild(recordButton);
		
		var restartButton = document.createElement("button");
		restartButton.setAttribute("id", "restartPlaybackButton");
		restartButton.classList.add("restartButton", "button", "half");
		restartButton.innerText = "Restart";
		restartButton.onclick = restartPlayback;
		wrap.appendChild(restartButton);
		
		soundVisualizer = document.createElement("canvas");
		soundVisualizer.setAttribute("id", "recordningSoundVisualizer");
		soundVisualizer.classList.add("soundVisualizer");
		soundVisualizer.setAttribute("width", "200");
		soundVisualizer.setAttribute("height", "26");
		wrap.appendChild(soundVisualizer);
		
		audioPlayer = document.createElement("audio");
		audioPlayer.setAttribute("id", "recordningAudioPlayer");
		audioPlayer.classList.add("audioPlayer");
		audioPlayer.setAttribute("controls", "true");
		wrap.appendChild(audioPlayer);
		
		if(!navigator.mediaDevices) {
			var inputSound = document.createElement("input");
			inputSound.setAttribute("type", "file");
			inputSound.setAttribute("accept", "audio/*");
			inputSound.setAttribute("capture", "trye");
			inputSound.addEventListener('change', function(e) {
				var file = e.target.files[0];
				audioPlayer.srcObject = file;
			});
			wrap.appendChild(inputSound);
		}
		
		var saveRecordButton = document.createElement("button");
		saveRecordButton.setAttribute("id", "saveRecordButton");
		saveRecordButton.classList.add("button", "half");
		saveRecordButton.innerText = "Save recording";
		saveRecordButton.onclick = saveRecord;
		wrap.appendChild(saveRecordButton);
		
		var publishRecordButton = document.createElement("button");
		publishRecordButton.setAttribute("id", "publishRecordButton");
		publishRecordButton.classList.add("button", "half");
		publishRecordButton.innerText = "Publish recording";
		publishRecordButton.onclick = publishRecord;
		wrap.appendChild(publishRecordButton);
		
		var cancelButton = document.createElement("button");
		cancelButton.setAttribute("id", "cancelRecordningButton");
		cancelButton.classList.add("button", "half");
		cancelButton.innerText = "Cancel";
		cancelButton.onclick = recordWidget.hide;
		wrap.appendChild(cancelButton);
		
		
		recordTimeline = document.createElement("input");
		recordTimeline.setAttribute("id", "recordTimeline");
		recordTimeline.classList.add("timeline");
		recordTimeline.setAttribute("type", "range");
		recordTimeline.setAttribute("min", 0);
		recordTimeline.setAttribute("max", 10*60*1000/playbackFPS); // 10 minutes in ms
		recordTimeline.setAttribute("value", 0);
		onRangeChange(recordTimeline, timelineChange);
		wrap.appendChild(recordTimeline);
		
		return wrap;
		
		function onRangeChange(inputRange, callback) {
			var gotInputEvent = false;
			var currentValue = inputRange.value;
			var oldValue = 0;
			inputRange.addEventListener("input", function(e) {
				currentValue = inputRange.value;
				if(currentValue != oldValue) callback(currentValue, oldValue, e);
				oldValue = currentValue;
				gotInputEvent = true;
			});
			inputRange.addEventListener("change", function(e) {
				if(!gotInputEvent) {
					currentValue = inputRange.value;
					callback(currentValue, oldValue, e);
					oldValue = currentValue;
				}
			});
			inputRange.addEventListener("mousedown", function getOldValue(e) {
				if(!oldValue) oldValue = inputRange.value;
				inputRange.removeEventListener("mousedown", getOldValue);
			});
		}
	}
	
	function saveRecord() {
		
		var audioFilePath = UTIL.joinPaths("/recordings/", recordInfo.startFile + ".ogg");
		
		if(!recordInfo || !record) return alertBox("Unable to save recordning. No recorded input?");
		
		if(typeof FileReader != "undefined") {
			if(audioBlob) {
				saveAudio(audioBlob, audioFilePath, function(err) {
					if(err) alertBox(err.message);
					else {
recordInfo.audioPath = audioFilePath;
					}
					saveData();
				});
			}
			else {
alertBox("No audio data!");
				saveData();
			}
		}
		else saveData();
		
		function saveData() {
			var data = {
				info: recordInfo,
				record: record
			}
			
			EDITOR.openFile(UTIL.joinPaths("/recordings/", recordInfo.startFile + ".json"), JSON.stringify(data, null, 2));
		}
	}
	
	function saveAudio(audioBlob, audioFilePath, callback) {
		var folder = UTIL.getDirectoryFromPath(audioFilePath);
		var reader = new FileReader();
		reader.readAsDataURL(audioBlob);
		reader.onload = function gotData() {
			var base64AudioMessage = reader.result.split(',')[1];
			EDITOR.createPath(folder, function(err) {
				if(err) {
					if(callback) callback(err);
					return alertBox("Failed to create folder: " + folder + " Error: " + err.message);
				}
				console.log("saveAudio: Created path: " + folder);
				EDITOR.saveToDisk(audioFilePath, base64AudioMessage, false, "base64", function(err, path, hash) {
					if(err) {
alertBox("Failed to save audio data! " + err.message);
						if(callback) callback(err);
						return;
					}
					loadedAudioFile = path;
					
					console.log("saveAudio: Saved audio in path=" + path);
					
					if(callback) callback(null, path);
					
				});
			});
		};
	}
	
	function publishRecord(clickEvent) {
		
		var file = EDITOR.currentFile;
		var audioSaved = false;
		var dataSaved = false;
		
		if(recordInfo && record) {
			
			if(recordInfo.startFile == undefined || recordInfo.startFile == "undefined") {
throw new Error("recordInfo.startFile=" + recordInfo.startFile + " recordInfo=" + JSON.stringify(recordInfo, null, 2));
			}
			
			var data = {
				info: recordInfo,
				record: record
			}
			
		}
		else {
			loadRecord(file);
		}
		
		var wwwpub = "/wwwpub";
		var rootFolder = UTIL.joinPaths(wwwpub, "/recordings/");
		var audioFilePath = UTIL.joinPaths(rootFolder, recordInfo.startFile + ".ogg");
		var dataFilePath = UTIL.joinPaths(rootFolder, recordInfo.startFile + ".json");
		var dataFolder = UTIL.getDirectoryFromPath(dataFilePath);
		var publicAudioUrl = document.location.protocol + "//" + EDITOR.user.name + "." + document.location.hostname + audioFilePath.replace(wwwpub, "");
		
		if(!data) return alertBox("No recording available! Either open a saved recordning (json) file, or make a new recording.");
		
		EDITOR.createPath(dataFolder, function(err) {
			if(err) return alertBox("Failed to create dataFolder=" + dataFolder + " Error: " + err.message);
			
			
			if(loadedAudioFile) {
				// Move the audio file to wwwpub
				EDITOR.move(loadedAudioFile, audioFilePath, whenAudioSaved);
			}
			else if(audioBlob) {
				// Save the audio file
				saveAudio(audioBlob, audioFilePath, whenAudioSaved);
			}
			else if(recordInfo.audioPath) {
				// Move the audio file to wwwpub
				EDITOR.move(recordInfo.audioPath, audioFilePath, whenAudioSaved);
			}
			else {
				alertBox("No audio data detected! Sharing recording without audio ...");
				saveDataFile(data);
			}
			
		});
		
		
		function whenAudioSaved(err) {
			if(err) {
alertBox("Failed to save audio: " + err.message);
			}
			else {
				recordInfo.audioPath = publicAudioUrl;
			}
			
			saveDataFile(data);
		}
		
		function saveDataFile(data) {
			
			var dataStr = JSON.stringify(data, null, 2);
			EDITOR.saveToDisk(dataFilePath, dataStr, function(err) {
				if(err) return alertBox("Failed to save data: " + err.message);
				
				EDITOR.share(dataFilePath, clickEvent, function() {

				});
				
			});
		}
		
		
	}
	
	function startOrStopRecording() {
		if(isRecording) stopRecording();
		else startRecordning();
	}
	
	function startOrStopPlayback() {
		if(isPlaying) stopPlayback();
		else startPlayback();
	}
	
	function stopRecording() {
		isRecording = false;
		recordButton.innerText = "● Start recordning";
		
		EDITOR.removeEvent("mouseMove", recordMouseMovement);
		EDITOR.removeEvent("mouseClick", recordMouseClick);
		EDITOR.removeEvent("fileShow", recordFileShow);
		EDITOR.removeEvent("keyPressed", recordKeyPress);
		EDITOR.removeEvent("keyDown", recordKeyCombo);
		
		// Stop the audio stream
		mediaRecorder.stop();
		console.log(mediaRecorder.state);
		console.log("recorder stopped");
		// mediaRecorder.requestData();
		
		/*
			var stream = audioPlayer.srcObject;
			var tracks = stream.getTracks();
			tracks.forEach(function(track) {
			track.stop();
			});
		*/
		
	}
	
	function startRecordning() {
		// todo: Better indicator that we are actually recording. Very annoying if it somehow stops recordning and we don't notice it.
		
		if(isRecording) {
			alertBox("Already recording! Click stop before retake.");
			return;
		}
		
		var file = EDITOR.currentFile;
		if(!file) return alertBox("Need to start the recording inside a file! (no file is open)");
		if(!file.savedAs) return alertBox("The file need to be saved-as before starting a recording! (empty file is fine, we just need a name!)");
		
		if(navigator.mediaDevices) navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(gotAudio).catch(function(err) {
			alertBox("Failed to get microphone access! Error: " + err.message);
		});
		
		if(record.length > 0) {
			var yes = "Overwrite";
			var no = "Cancel";
			confirmBox("Do you want to replace the current recording ?", [yes, no], function(answer) {
				if(answer == yes) sure();
				else if(answer == no) {
					
				}
				else throw new Error("Unknown answer=" + answer);
			});
		}
		else sure();
		
		function sure() {
			
			if(!recordInfo) recordInfo = {};
			
			recordInfo.startFile = file.path;
			recordInfo.alias = (EDITOR.user && EDITOR.user.name) || "Playback";
			
			if(!recordInfo.files) recordInfo.files = {};
			if(!recordInfo.files.hasOwnProperty(file.path)) {
				recordInfo.files[file.path] = {
					startText: file.text
				};
			}
		
		recordInfo.startDate = (new Date()).getTime();
		
		EDITOR.on("mouseMove", recordMouseMovement);
			EDITOR.on("mouseClick", recordMouseClick, {dir: "down"});
			EDITOR.on("fileShow", recordFileShow);
			EDITOR.on("keyPressed", recordKeyPress);
			EDITOR.on("keyDown", recordKeyCombo);
		
		record.length = 0; // Reset
		
		isRecording = true;
		recordButton.innerText = "■ Stop recordning";
			
			EDITOR.stat("recording");
		}
	}
	
	function recordKeyCombo(file, character, combo, keyDownEvent) {
		/*
			
			We are only interested into keyboard combinations, so that we can then show they combo and run the function during playback
			Don't bother trying to record/playback terminal in vim mode interaction.
			
		*/
		
		if(combo.sum == 0) return;
		if(!character) return;
		
		// When playing back, the othe ruser might have rebinded the key, we still want to fire the same function, so save the names of the keybinding functions triggered
		var matchedKeyBindings = [];
		
		var charCode = keyDownEvent.charCode || keyDownEvent.keyCode || null;
		var key = keyDownEvent.key || null;
		var keyBindings = EDITOR.keyBindings();
		for(var i=0, binding; i<keyBindings.length; i++) {
			binding = keyBindings[i];
			if( (binding.char === character || binding.charCode === charCode || binding.key === key) && // === so that undefined doesn't match null
			(binding.combo == combo.sum || binding.combo === undefined) &&
			(binding.dir == "down" || binding.dir === undefined) && // down is the default direction
			(binding.mode == EDITOR.mode || binding.mode == "*") ) {
				matchedKeyBindings.push(UTIL.getFunctionName(binding.fun));
			}
		}
		
		if(matchedKeyBindings.length == 0) {
			console.log("recordKeyCombo: Did not find any key binding for character=" + character + " and combo=" + JSON.stringify(combo));
			return;
		}
		
		var keyComboEvent = {
			combo: combo,
			target: keyDownEvent.target.className,
			filePath: file.path,
			keyBindings: matchedKeyBindings
		};
		
console.log("recordKeyCombo: " + JSON.stringify(keyComboEvent, null, 2));

		record.push({date: (new Date()).getTime(), keyCombo: keyComboEvent});
	}
	
	function otransform(file, fileChangeEvent) {
		var order = recordInfo.lastOrder;
		var changeEvents = fileChangeEvents[file.path];
		if(!changeEvents) {
			stopPlayback();
			throw new Error(  "file.path=" + file.path + " not in " + JSON.stringify( Object.keys(fileChangeEvents) )  );
		}
		if(!Array.isArray(changeEvents)) {
			stopPlayback();
			throw new Error("Not an array: changeEvents=" + JSON.stringify(changeEvents, null, 2));
		}
		var currentOrder = fileChangeEventOrderCounters[file.path];
		var arr;
		console.log("mousePlayback: order=" + order + " currentOrder=" + currentOrder + " fileChangeEvent=" + JSON.stringify(fileChangeEvent));
		while(order++ < currentOrder) {
			
			arr = changeEvents[order];
			
			if(!arr) {
				stopPlayback();
				throw new Error( "order=" + order + " not in changeEvents=" + JSON.stringify(changeEvents, null, 2) + " currentOrder=" + currentOrder + " changeEvents.length=" + changeEvents.length + "changeEvents=" + JSON.stringify(changeEvents) + " fileChangeEventOrderCounters[file.path]=" + JSON.stringify(fileChangeEventOrderCounters[file.path]) + " file.path=" + file.path + " recordInfo.files=" + JSON.stringify(recordInfo.files) );
			}
			
			for (var i=arr.length-1; i>-1; i--) {
				transformBackwards(fileChangeEvent, arr[i]);
			}
			
			console.log("mousePlayback: Loop: order=" + order + " currentOrder=" + currentOrder + " fileChangeEvent=" + JSON.stringify(fileChangeEvent));
		}
		
		return fileChangeEvent;
	}
	
	function playbackSelect(selectEvent) {
		var filePath = playBackFile(selectEvent.filePath);
		if(!EDITOR.files.hasOwnProperty(filePath)) {
			stopPlayback();
			throw new Error("File not open? filePath=" + filePath);
		}
		var file = EDITOR.files[filePath];
		
		var start = otransform(file, {index: selectEvent.start, row: 0});
		var end = otransform(file, {index: selectEvent.end, row: 0});
		
		file.highLightTextRange(start.index, end.index);
		EDITOR.renderNeeded();
	}
	
	function playbackDeselect(deselectEvent) {
		var filePath = playBackFile(deselectEvent.filePath);
		if(!EDITOR.files.hasOwnProperty(filePath)) {
			stopPlayback();
			throw new Error("File not open? filePath=" + filePath);
		}
		var file = EDITOR.files[filePath];
		
		var start = otransform(file, {index: deselectEvent.start, row: 0});
		var end = otransform(file, {index: deselectEvent.end, row: 0});
		
		file.removeHighLightTextRange(start.index, end.index);
		EDITOR.renderNeeded();
	}
	
	function playbackKeyCombo(keyComboEvent) {
		
		var keyDownEvent = null;
		
		var descriptions = [];
		
		console.log("playbackKeyCombo: " + JSON.stringify(keyComboEvent, null, 2));
		
		var filePath = playBackFile(keyComboEvent.filePath);
		if(!EDITOR.files.hasOwnProperty(filePath)) {
			stopPlayback();
			throw new Error("File not open? filePath=" + filePath);
		}
		var file = EDITOR.files[filePath];
		
		var keyBindings = EDITOR.keyBindings();
		for(var i=0, binding, fName, funReturn; i<keyBindings.length; i++) {
			binding = keyBindings[i];
			fName = UTIL.getFunctionName(binding.fun);
			if(keyComboEvent.keyBindings.indexOf(fName) != -1) {
				descriptions.push(binding.desc);
				funReturn = binding.fun(file, keyComboEvent.combo);
			}
		}
		
		if(!keyComboDiv) {
			keyComboDiv = document.createElement("div");
			keyComboDiv.classList.add("playbackKeyCombo");

			var big = document.createElement("div");
			big.classList.add("combo");
			
			var small = document.createElement("div");
			small.classList.add("description");
			
			keyComboDiv.appendChild(big);
			keyComboDiv.appendChild(small);

			document.documentElement.appendChild(keyComboDiv);
}

		keyComboDiv.childNodes[0].innerText = EDITOR.getKeyFor(keyComboEvent.keyBindings[0]);
		keyComboDiv.childNodes[1].innerText = descriptions.join("\n");
		keyComboDiv.classList.remove("hidden")

setTimeout(function() {
			keyComboDiv.classList.add("hidden")
}, 5000);
		
	}
	
	function recordKeyPress(file, character, combo, keyPressEvent) {
		// All file changes are already recorded. Only record key-presses outside the editor. eg. in html input's
		if(EDITOR.input) return ALLOW_DEFAULT;
		
		var el = keyPressEvent.target;
		
		var keyPressEvent = {
			char: character,
			target: {
				tag: el.tagName
			}
		}
		
		var target = keyPressEvent.target;
		if(el.id) target.id = el.id;
		else if(el.name) target.name = el.name;
		else throw new Error("No id or name attribute in " + target.tag + ". Can not record key press!")
		
		
		record.push({date: (new Date()).getTime(), keyPress: keyPressEvent});
		
		return ALLOW_DEFAULT;
	}
	
	function keyPressPlayback(keyPressEvent, backwards) {
		
		if(keyPressEvent.target.id) {
			var target = document.getElementById(keyPressEvent.target.id);
		}
		else if(keyPressEvent.target.name) {
			var nodes = document.getElementsByName(keyPressEvent.target.name);
			if(nodes.length > 1) {
console.warn("More then one item with with name=" + keyPressEvent.target.name, nodes);
				alertBox("More then one item with with name=" + keyPressEvent.target.name);
				return;
			}
			var target = nodes[0];
			
		}
		else if(keyPressEvent.target.tag) {
			var nodes = document.getElementsByTagName(keyPressEvent.target.tag);
			if(nodes.length > 1) {
				console.warn("More then one item with with name=" + keyPressEvent.target.name, nodes);
				alertBox("More then one item with with name=" + keyPressEvent.target.name);
				return;
			}
			var target = nodes[0];
		}
		
		if(!target) {
			alertBox("Unable to find target for keyPressEvent=" + JSON.stringify(keyPressEvent));
			return;
		}
		
		if(backwards) {
			EDITOR.typeIntoElement(target, "\b");
		}
		else {
			EDITOR.typeIntoElement(target, keyPressEvent.char);
		}
	}
	
	function recordFileShow(file, lastFile) {
		
		if(!lastFile) lastFile = EDITOR.currentFile;
		
		if(lastFile) {
			record.push({date: (new Date()).getTime(), changeFile: {to: file.path, from: lastFile.path}});
		}
	}
	
	function gotAudio(stream) {
		
		document.activeElement.blur(); // Don't want keystrokes to accidentally push stop
		EDITOR.input = true;
		
		// It will take some time for the user to allow the audio capture, so reset the start date to when we start recording!
		recordInfo.startDate = (new Date()).getTime();
		
		var chunks = [];
		
		mediaRecorder = new MediaRecorder(stream);
		
		visualize(stream);
		
		mediaRecorder.start();
		console.log(mediaRecorder.state);
		console.log("recorder started");
		
		mediaRecorder.onstop = function(e) {
			console.log("data available after MediaRecorder.stop() called.");
			
			audioPlayer.controls = true;
			audioBlob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
			chunks = [];
			var audioURL = window.URL.createObjectURL(audioBlob);
			audioPlayer.src = audioURL;
			console.log("recorder stopped");
			
		}
		
		mediaRecorder.ondataavailable = function(e) {
			chunks.push(e.data);
		}
		
	}
	
	function visualize(stream) {
		var audioCtx = new (window.AudioContext || webkitAudioContext)();
		var canvasCtx = soundVisualizer.getContext("2d");
		
		var source = audioCtx.createMediaStreamSource(stream);
		
		var analyser = audioCtx.createAnalyser();
		analyser.fftSize = 2048;
		var bufferLength = analyser.frequencyBinCount;
		var dataArray = new Uint8Array(bufferLength);
		
		source.connect(analyser);
		//analyser.connect(audioCtx.destination);
		
		draw();
		
		var fillColor = "#555";
		var strokeColor = "#fff";
		
		function draw() {
			var WIDTH = soundVisualizer.width;
			var HEIGHT = soundVisualizer.height;
			
			requestAnimationFrame(draw);
			
			analyser.getByteTimeDomainData(dataArray);
			
			canvasCtx.fillStyle = fillColor;
			canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
			
			canvasCtx.lineWidth = 1;
			canvasCtx.strokeStyle = strokeColor;
			
			canvasCtx.beginPath();
			
			var sliceWidth = WIDTH * 1.0 / bufferLength;
			var x = 0;
			
			
			for(var i = 0; i < bufferLength; i++) {
				
				var v = dataArray[i] / 128.0;
				var y = v * HEIGHT/2;
				
				if(i === 0) {
					canvasCtx.moveTo(x, y);
				} else {
					canvasCtx.lineTo(x, y);
				}
				
				x += sliceWidth;
			}
			
			canvasCtx.lineTo(soundVisualizer.width, soundVisualizer.height/2);
			canvasCtx.stroke();
			
		}
	}
	
	function recordMouseMovement(mouseX, mouseY, target, mouseMoveEvent) {
		
		if(target.className == "fileCanvas") {
			var file = EDITOR.currentFile;
			
			var grid = file.rowColFromMouse(mouseX, mouseY);
			
			// Index is needed for the transform
			console.log("recordMouseMovement: row=" + grid.row + " col=" + grid.col);
			if(grid.row >= 0 && file.grid.length-1 >= grid.row) {
				if(grid.col >= 0 && file.grid[grid.row].length-1 >= grid.col) {
					var index = file.getIndexFromRowCol(grid.row, grid.col);
				}
				else {
					var gridRow = file.grid[grid.row];
					if(file.grid.length-1 == grid.row) {
						if(gridRow.length > 0) var index = gridRow[gridRow.length-1].index;
						else var index = gridRow.startIndex;
					}
					else var index = file.grid[grid.row+1].startIndex;
				}
			}
			else var index = -1;
			
			if(grid.row != lastRecordedMouseCaretRow || grid.col != lastRecordedMouseCaretCol) {
				var mouseEvent = {
					index: index, 
					row: grid.row,
					col: grid.col
				};
			}
			
			lastRecordedMouseCaretRow = grid.row;
			lastRecordedMouseCaretCol = grid.col;
		}
		else {
			
			var mouseTarget = findMouseTarget(target, "move");
			
			if(mouseTarget) {
				
				var mouseEvent = {
					target: mouseTarget
				};
				
				lastRecordedMouseTarget = target;
			}
		}
		
		if(mouseEvent) {
			mouseEvent.type = "move";
			record.push({date: (new Date()).getTime(), mouse: mouseEvent});
		}
		
	}
	
	
	
	function recordMouseClick(mouseX, mouseY, caret, mouseDirection, button, target, keyboardCombo, mouseDownEvent) {
		
		console.log("recordMouseClick: button=" + button + " mouseDirection=" + mouseDirection + "");
		
		if(target.className == "fileCanvas") {
			var file = EDITOR.currentFile;
			var grid = file.rowColFromMouse(mouseX, mouseY);
			var mouseClick = {
				row: grid.row,
				col: grid.col,
				mouseButton: button,
				keyboardCombo: keyboardCombo,
				type: "click"
			};
			
			console.log("recordMouseClick: row=" +  grid.row + " col=" +  grid.col);
			
		}
		else {
			var mouseTarget = findMouseTarget(target, "click");
			
			if(mouseTarget) {
				
				var mouseClick = {
					target: mouseTarget,
					mouseButton: button,
					keyboardCombo: keyboardCombo,
					type: "click"
				};
				
				console.log("recordMouseClick: mouseTarget=" + JSON.stringify(mouseTarget));
			}
			else if(target.id != "startOrStopRecordningButton") {
				console.warn("Failed to find a suitable target for mouse click: target:", target)
				alertBox("Failed to find a suitable target for mouse click: id=" + target.id + " tagName=" + target.tagName + " type=" + target.type + " value=" + target.value + " innerText=" + target.innerText);
			}
		}
		
		if(mouseClick) record.push({date: (new Date()).getTime(), mouse: mouseClick});
		
		return true;
	}
	
	function findMouseTarget(target, type, recursion, last) {
		// Find the click target, it can be an ID or a tagName and innerText
		
		if(recursion == undefined) recursion = 0;
		else recursion++;
		
		if(!target) {
			console.log("findMouseTarget: target=" + target + " recursion=" + recursion + " last=" + JSON.stringify(last) + " (no more parent nodes to check)");
			
			if(last) return last;
			else return null;
		}
		
		if(type == "move") {
			// No need to record same target over and over
			if(target == lastRecordedMouseTarget) {
				console.log("findMouseTarget: target=", target, " is same as lastRecordedMouseTarget");
				return null;
			}
			
			// Ignore if target is a parent of last target to prevent mouse from jumping in playback
			var allChildren = target.getElementsByTagName("*");
			for(var i=0; i<allChildren.length; i++) {
				if(allChildren[i] == lastRecordedMouseTarget) {
					console.log("findMouseTarget: target=", target, " is a parent/grandparent for lastRecordedMouseTarget=", lastRecordedMouseTarget);
					return null;
				}
			}
		}
		
		if(recursion > 100) throw new Error("Max recursion reached! target=", target);
		
		var id = target.id;
		var mouseTarget = {};
		var tag = target.tagName;
		
		if(tag == "HTML" || tag == "BODY") {
			console.log("findMouseTarget: Giving up because tag=" + tag);
return null;
		}
		
		if(id) {
			if(targetsToBeIgnored.indexOf(id) != -1) {
				console.log("findMouseTarget: Ignoring id=" + id);
				return findMouseTarget(target.parentNode, type, recursion, last);
			}
			
			for(var i=0; i<targetsToBeIgnoredRegexp.length; i++) {
				if(id.match( targetsToBeIgnoredRegexp[i] )) {
					console.log("findMouseTarget: Regexp ignoring id=" + id);
					return findMouseTarget(target.parentNode, type, recursion, last);
				}
			}
			
			mouseTarget.id = id;
			mouseTarget.tag = tag; // Save tag for debugging
			console.log("findMouseTarget: Found id=" + id + " with tag=" + tag);
return mouseTarget;
		}
		
		
		var innerText = typeof target.innerText == "string" && target.innerText.trim();
		
		if(tag && typeof innerText == "string" && innerText.length > 0) {
			// Is it unique ?
			var elements = document.getElementsByTagName(tag);
			var elementsWithText = 0;
			for(var i=0; i<elements.length; i++) {
				if(elements[i].innerText.trim() == innerText) elementsWithText++;
			}
			if(elementsWithText == 1) {
				mouseTarget.tag = tag;
				mouseTarget.text = innerText;
				console.log("findMouseTarget: Found tag=" + tag + " innerText=" + innerText + " type=" + target.type);
				// We prefer id over tag and innerText, so keep looking until we find and id, or use last
				if(type == "move") return mouseTarget; // Prefer upper most element when recordning mouse movements
				else if(type == "click") {
					// Prefer elements that has click handlers if we are recordning clicks
					if(typeof target.onclick == "function") return mouseTarget;
					
					// Buttons is always good for click events
					if(tag == "BUTTON") return mouseTarget;
					
				}
				
				return findMouseTarget(target.parentNode, type, recursion, last ? last : mouseTarget);
			}
		}
		else if(tag == "INPUT" && (target.type=="button" || target.type=="submit") && target.value) {
			mouseTarget.tag = tag;
			mouseTarget.text = target.value;
			return mouseTarget;
		}
		else if(tag == "BUTTON" && innerText) {
			mouseTarget.tag = tag;
			mouseTarget.text = innerText;
			return mouseTarget;
		}
		
		console.log("findMouseTarget: Not suitable id=" + id + " tag=" + tag + " innerText=" + innerText + " value=" + target.value);
		
		// Does it have any click/mouseover/mousedown handlers ?
		
		
		return findMouseTarget(target.parentNode, type, recursion, last);
		
	}
	
	
	function recordFileChange(file, fileChangeEvent) {
		
		if(!recordInfo.files.hasOwnProperty(file.path)) {
recordInfo.files[file.path] = {
				startText: file.text
			};
		}
		
		record.push({date: (new Date()).getTime(), change: fileChangeEvent});
	}
	
	function stopPlayback() {
		isPlaying = false;
		audioPlayer.pause();
		clearInterval(playbackInterval);
		playButton.innerText = "▶ Start playback";
		if(fakeMouseElement) fakeMouseElement.classList.add("hidden");
	}
	
	function isRecordJson(file) {
		if(!file) return null;
		
		var ext = UTIL.getFileExtension(file.path);
		if(ext != "json") return null;
		
		var reRecord = /"record": \[/;
		if(!file.text.match(reRecord)) return null;
		
		try {
			var data = JSON.parse(file.text);
		}
		catch {
			console.warn("Parse failed: " + err.message);
			return null;
		}
		
		if(!data) return null;
		if(!data.info) return null;
		if(!data.record) return null;
		
		return data;
	}
	
	function loadRecord(fileOrData) {
		
		if(fileOrData instanceof File) {
var file = fileOrData;
		}
		else if(typeof fileOrData == "object") {
			var data = fileOrData;
		}
		else if(fileOrData == undefined) {
			var file = EDITOR.currentFile;
		}
		else {
			throw new Error("Unable to load record: " + fileOrData); 
		}
		
		if(file && !data) {
			var data = isRecordJson(file);
		}
		
		if(data) {
			record = data.record;
			recordInfo = data.info;
			
			recordTimeline.value = 0;
			
			setTimelineMax();
		}
		
	}
	
	function initPlayback(file, callback) {
		
		var error = null;
		
		// typeof File == "object"
		if(typeof file == "function" && callback == undefined) {
			callback = file;
			file = EDITOR.currentFile;
		}
		
		console.log("initPlayback!");
		
		// Load playback record if it's not yet loaded
		if(!recordInfo) loadRecord(file);
		
		if(!recordInfo) return callback(new Error(UTIL.getFilenameFromPath(file.path) + " doesn't seem to be a editor recording (JSON log)" ));
		
		if(record.length == 0) {
			var error = new Error("Current opened file doesn't seem to be a editor recording (json log). And there are no editor recording already loaded.");
			error.code = "NO_RECORD";
			return callback(error);
		}
		
		// Rest if user has put the recordTimeline range to start position, or if it's at the end position
		if(recordTimeline.value == 0 || lastRecordItem >= record.length-1) {
			lastRecordItem = -1; // first "frame" is 0, so -1 means it has not yet started playing
		}
		
		if(lastRecordItem == -1) {
			resetPlayback(function(err) {
				if(err) return callback(err);
				else callback(null);
			});
		}
		else return callback(null);
		
	}
	
	function restartPlayback() {
		stopPlayback();
		lastRecordItem = -1; // first "frame" is 0, so -1 means it has not yet started playing
		recordTimeline.value = 0;
		seekAudio();
	}
	
	function resetPlayback(callback) {
		
		// Because the playback might have opened these
		EDITOR.ctxMenu.hide(); 
		EDITOR.windowMenu.hide();
		
		// ### Open files for playback
		var filesToReset = 0;
		var filesReset = 0;
		var filePath, file;
		var startText;
		for(var origFilePath in recordInfo.files) {
			filePath = playBackFile(origFilePath);
			filesToReset++;
			startText = recordInfo.files[origFilePath].startText;
			
			// Save file changes made by the user during the playback in order to transform the playback events
			// The order counter need to start at the max order value from the recordning
			if(recordInfo.lastOrder == undefined) {
				for(var i=record.length-1; i>0; i--) {
					if(record[i].change) {
						recordInfo.lastOrder = record[i].change.order;
						break;
					}
				}
			}
			if(recordInfo.lastOrder == undefined) recordInfo.lastOrder = 0;
			
			fileChangeEventOrderCounters[filePath] = recordInfo.lastOrder;
			fileChangeEvents[filePath] = [];
			
			if(EDITOR.files.hasOwnProperty(filePath)) {
				file = EDITOR.files[filePath];
				file.reload(startText);
				filesReset++;
			}
			else {
				EDITOR.openFile(filePath, startText, function(err, file) {
					filesReset++;
					if(err) return callback(new Error("Unable to reset filePath=" + filePath + " Error: " + err.message));
					else allFilesResetMaybe();
				});
			}
		}
		
		allFilesResetMaybe();
		
		function allFilesResetMaybe() {
			
			if(filesReset == filesToReset) callback(null);
			else console.log("Done resetting " + filesReset + " of " + filesToReset + " files");
		}
	}
	
	function loadAudio(audioPlayer, audioFilePath, callback) {
		console.log("Loading audio file " + audioFilePath + " ...");
		
		if(audioFilePath.match(/^https?:/i)) {
			audioPlayer.src = audioFilePath;
			
			// The file loads, but audioPlayer.onloadeddata doesn't fire ...
			
			console.log("audioPlayer.readyState=" + audioPlayer.readyState);
			
			var wait = function wait() {
				var waitInterval = setInterval(function() {
					console.log("audioPlayer.readyState=" + audioPlayer.readyState);
					
					var HAVE_ENOUGH_DATA = 4;
					
					if(audioPlayer.readyState == HAVE_ENOUGH_DATA) {
						clearInterval(waitInterval);
						done(null);
					}
					
				}, 100);
			}
			
			wait();
			
		}
		else {
			
			audioPlayer.onloadeddata = function audioLoadedEvent() {
				done(null);
			};
			
			// couln't find a way to decode a binary string to something the audio player can understand, but it can however understand base64!'
			EDITOR.readFromDisk(audioFilePath, false, "base64", function(err, path, data, hash) {
				if(err) {
					var error = new Error("Unable to read " + audioFilePath + " Error: " + err.message);
					return done(error);
				}
				
				var audioData = data;
				
				console.log("Audio file loaded! path=" + path + " audioData=" + (typeof audioData) + " isAraray?" + Array.isArray(audioData) + " data.length=" + audioData.length);
				
				/*
					var context = new AudioContext();
					var source = context.createBufferSource();
					context.decodeAudioData(audio.data, function(buffer) {
					source.buffer = buffer;
					}, null);
				*/
				
				//var buffer = str2ab(audioData);
				
				//var audioBlob = new Blob(audioData, { 'type' : 'audio/ogg; codecs=opus' });
				//var audioURL = window.URL.createObjectURL(audioData);
				//audioPlayer.src = audioURL;
				
				audioPlayer.src = getEncodedString(audioData);
				
				loadedAudioFile = path;
				
				
				function getEncodedString(str) {
					return 'data:audio/audio/ogg;base64,' + str;
				}
				
				function str2ab(str) {
					var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
					var bufView = new Uint16Array(buf);
					for (var i=0, strLen=str.length; i < strLen; i++) {
						bufView[i] = str.charCodeAt(i);
					}
					return buf;
				}
				
				
			});
		}
		
		function done(err) {
			audioPlayer.onloadeddata = null; // Prevent the event from firing when stopping a recording
			callback(err);
			callback = null;
		}
	}
	
	function startPlayback() {
		isPlaying = true;
		
		/*
			Record changes made by the user during the playback to be able to transform the playback with the user changes!
			
			If the user is already in collaboration mode, it will appear to the othes that the user is doing to changes.
			
		*/
		
		var alreadyStarted = false;
		
		console.log("startPlayback!");
		
		// Start playback if either audio or record load loads
		
		var audioLoadedSuccessfully = false;
		
		if(!recordInfo) loadRecord();
		
		console.log("audioPlayer.readyState=" + audioPlayer.readyState);
		if(recordInfo.audioPath && loadedAudioFile != recordInfo.audioPath) {
			loadAudio(audioPlayer, recordInfo.audioPath, function(err) {
				if(err) alertBox(err);
				else audioLoadedSuccessfully = true;
				
				init();
			});
		}
		else init();
		
		function init() {
			initPlayback(EDITOR.currentFile, start);
		}
		
		function start(err) {
			if(err) {
				if(err.code == "NO_RECORD") playAudio();
				
				return alertBox(err.message);
			}
			
			if(alreadyStarted) throw new Error("Playback already started!");
			
			alreadyStarted = true;
			
			setTimelineMax();
			
			showPlaybackFile(recordInfo.startFile);
			
			playbackInterval = setInterval(playProgress, 1000/playbackFPS);
			playButton.innerText = "■ Stop playback";
			
			playAudio();
			
			EDITOR.stat("playback");
			
		}
		
		function playAudio() {
			seekAudio();
			audioPlayer.play();
		}
	}
	
	function setTimelineMax() {
		
		// Note: Audio might still be loading (audioPlayer.duration=undefined)
		
		// Max value should be total ticks = "total record time" / "time per tick"
		// Time per tick is 1000/playbackFPS
		
		var totalRecordTimeAudio = isFinite(audioPlayer.duration) ? audioPlayer.duration * 1000 : 0; // ms
		var lastItem = record[record.length-1];
		var totalRecordTimeRecord = lastItem.date-recordInfo.startDate; // ms
		var totalRecordTime = Math.max(totalRecordTimeAudio, totalRecordTimeRecord);
		
		recordTimeline.max = Math.ceil(totalRecordTime / (1000/playbackFPS)) + 1;
		
		console.log("setTimelineMax: recordInfo.startDate=" + recordInfo.startDate + " totalRecordTime=" + totalRecordTime + " totalRecordTimeAudio=" + totalRecordTimeAudio + " totalRecordTimeRecord=" + totalRecordTimeRecord + " record.length=" + record.length + " recordTimeline.max=" + recordTimeline.max + " playbackFPS=" + playbackFPS + "");
		
		if(isNaN(recordTimeline.max) || !UTIL.isNumeric(recordTimeline.max)) throw new Error("recordTimeline.max=" + recordTimeline.max);
		
		if(!isFinite(parseInt(recordTimeline.max))) throw new Error("recordTimeline.max=" + recordTimeline.max + " playbackFPS=" + playbackFPS + " totalRecordTimeAudio=" + totalRecordTimeAudio + " totalRecordTimeRecord=" + totalRecordTimeRecord);
		
	}
	
	function seekAudio() {
		
		// Note: audioPlayer.currentTime is in seconds, not milli-seconds!
		audioPlayer.currentTime = parseInt(recordTimeline.value) * 1000/playbackFPS / 1000;
		
		console.log("seekAudio: recordTimeline.value=" + recordTimeline.value + " playbackFPS=" + playbackFPS + " audioPlayer.currentTime=" + audioPlayer.currentTime + "s");
		
	}
	
	function playProgress() {
		
		if(isNaN(parseInt(recordTimeline.value))) {
			stopPlayback();
			throw new Error("Not a number: recordTimeline.value=" + recordTimeline.value + " lastRecordItem=" + lastRecordItem + " record.length=" + record.length + "");
		}
		
		recordTimeline.value = parseInt(recordTimeline.value) + 1;
		
		
		mousePlaybackAnimation();
		
		if(lastRecordItem+1 >= record.length) {
			stopPlayback();
			return;
		}
		
		var file, filePath;
		
		console.log("recordInfo.startDate=" + recordInfo.startDate + " record.length=" + record.length + " record[" + lastRecordItem + "+1].date=" + record[lastRecordItem+1].date + " diff=" + (record[lastRecordItem+1].date-recordInfo.startDate) + " time-line=" + (recordTimeline.value*1000/playbackFPS) + " recordTimeline.max=" + recordTimeline.max);
		
		// Interval time is 1000/playbackFPS
		// recordTimeline.value is incremented every 1000/playbackFPS ms
		// One tick in recordTimeline.value is roughly 1000/playbackFPS ms
		// X time-line ticks is around X*1000/playbackFPS ms
		
		var fileChangeEvent;
		var arr;
		
		while(lastRecordItem+1 < record.length && record[lastRecordItem+1].date <= (recordInfo.startDate+parseInt(recordTimeline.value)*1000/playbackFPS) ) {
			lastRecordItem++;
			
			if(parseInt(recordTimeline.value) > parseInt(recordTimeline.max)) {
				stopPlayback();
				throw new Error("recordTimeline.value=" + recordTimeline.value + " recordTimeline.max=" + recordTimeline.max + " lastRecordItem=" + lastRecordItem + " record.length=" + record.length + " ");
			}
			
			fileChangeEvent = record[lastRecordItem].change;
			
			if(fileChangeEvent) {
				
				filePath = playBackFile(fileChangeEvent.filePath);
				if(!EDITOR.files.hasOwnProperty(filePath)) {
					alertBox("File closed ? " + filePath);
					stopPlayback();
					return;
				}
				file = EDITOR.files[filePath];
				
				// The change event need to be transformed depending on the user changes during playback
				// All recorded events should be ordered before any user change
				var order = recordInfo.lastOrder;
				var changeEvents = fileChangeEvents[file.path];
				if(!changeEvents) throw new Error(  "file.path=" + file.path + " not in " + JSON.stringify( Object.keys(fileChangeEvents) )  );
				if(!Array.isArray(changeEvents)) throw new Error("Not an array: changeEvents=" + JSON.stringify(changeEvents, null, 2));
				var currentOrder = fileChangeEventOrderCounters[file.path];
				var copyOfFileChangeEvent = UTIL.cloneObject(fileChangeEvent);
				while(order++ < currentOrder) {
					arr = changeEvents[order];
					
					if(!arr) {
						throw new Error( "order=" + order + " not in changeEvents=" + JSON.stringify(changeEvents, null, 2) );
					}
					
					for (var i=arr.length-1; i>-1; i--) {
						transformBackwards(copyOfFileChangeEvent, arr[i]);
					}
				}
				
				ignoreFileChange = true;
				var caret = redo(file, copyOfFileChangeEvent);
				ignoreFileChange = false;
				
				// Show the playback caret !?
				
			}
			if(record[lastRecordItem].mouse) mousePlayback(record[lastRecordItem].mouse);
			if(record[lastRecordItem].changeFile) showPlaybackFile(record[lastRecordItem].changeFile.to);
			if(record[lastRecordItem].keyPress) keyPressPlayback( record[lastRecordItem].keyPress );
			if(record[lastRecordItem].keyCombo) playbackKeyCombo( record[lastRecordItem].keyCombo );
			if(record[lastRecordItem].select) playbackSelect( record[lastRecordItem].select );
			if(record[lastRecordItem].deselect) playbackDeselect( record[lastRecordItem].deselect );
		}
		
	}
	
	function showPlaybackFile(originalFilePath) {
		var filePath = playBackFile(originalFilePath);
		if(!EDITOR.files.hasOwnProperty(filePath)) {
			//alertBox("File closed ? " + filePath);
			
			console.warn("showPlaybackFile: Unable to show playback originalFilePath=" + originalFilePath + " because it can not be found in opened files!");
			
			stopPlayback();
			return;
		}
		var file = EDITOR.files[filePath];
		console.log("showPlaybackFile: Showing file.path=" + file.path);
		EDITOR.showFile(file);
	}
	
	function playBackFile(filePath) {
		// Prevent playback from overwriting existing files
		
		if(filePath.indexOf("/playback/") == 0) {
			// Note: The recorder might move the mouse over /foo/bar, but when playing back
console.warn("Path already in /playback/ filePath=" + filePath);
			return filePath;
		}
		
		return UTIL.joinPaths("/playback/", filePath);
	}
	
	function mousePlayback(mouseEvent, instant) {
		
		var row = mouseEvent.row;
		var col = mouseEvent.col;
		var target = mouseEvent.target;
		
		console.log("mousePlayback: row=" + row + " col=" + col + " target=" + JSON.stringify(target));
		
		// Create a fake-mouse element if one does not already exist, and show it if it's hidden
		// Don't bother checking if there actually are any mouse playback events
		if(!fakeMouseElement) {
			fakeMouseElement = document.createElement("div");
			fakeMouseElement.classList.add("fakeMouseElement");
			fakeMouseElement.style.width = playbackMouseSize + "px";
			fakeMouseElement.style.height = playbackMouseSize + "px";
			
			document.documentElement.appendChild(fakeMouseElement);
		}
		fakeMouseElement.classList.remove("hidden");
		
		if(row != undefined && col != undefined) {
			
			// We actually have to transform mouse positions too! Even if they are just screen coordinates, the "tutorial" might point to a special word that might have moved elsewhere!
			
			var order = recordInfo.lastOrder;
			var file = EDITOR.currentFile;
			var changeEvents = fileChangeEvents[file.path];
			if(!changeEvents) {
				stopPlayback();
				throw new Error(  "file.path=" + file.path + " not in " + JSON.stringify( Object.keys(fileChangeEvents) )  );
			}
			if(!Array.isArray(changeEvents)) {
				stopPlayback();
				throw new Error("Not an array: changeEvents=" + JSON.stringify(changeEvents, null, 2));
			}
			var currentOrder = fileChangeEventOrderCounters[file.path];
			var fileChangeEvent = {
				index: mouseEvent.index,
				row: row,
				col: col
			}
			var arr;
			console.log("mousePlayback: order=" + order + " currentOrder=" + currentOrder + " fileChangeEvent=" + JSON.stringify(fileChangeEvent));
			while(order++ < currentOrder) {
				
				arr = changeEvents[order];
				
				if(!arr) {
					stopPlayback();
					throw new Error( "order=" + order + " not in changeEvents=" + JSON.stringify(changeEvents, null, 2) + " currentOrder=" + currentOrder + " changeEvents.length=" + changeEvents.length + "changeEvents=" + JSON.stringify(changeEvents) + " fileChangeEventOrderCounters[file.path]=" + JSON.stringify(fileChangeEventOrderCounters[file.path]) + " file.path=" + file.path + " recordInfo.files=" + JSON.stringify(recordInfo.files) );
				}
				
				for (var i=arr.length-1; i>-1; i--) {
					transformBackwards(fileChangeEvent, arr[i]);
				}
				
				console.log("mousePlayback: Loop: order=" + order + " currentOrder=" + currentOrder + " fileChangeEvent=" + JSON.stringify(fileChangeEvent));
			}
			
			// Transformed position
			row = fileChangeEvent.row;
			col = fileChangeEvent.col;
			
			if(row != mouseEvent.row || col != mouseEvent.col) {
				console.log("mousePlayback: Transformed from row=" + mouseEvent.row + " to " + row + " and from col=" + mouseEvent.col + " to " + col + "");
			}
			
			var indentation = file.grid[row] && file.grid[row].indentation || 0;
			var indentationWidth = indentation * EDITOR.settings.tabSpace;
			var top = EDITOR.settings.topMargin + row * EDITOR.settings.gridHeight;
			var middle = top + Math.floor(EDITOR.settings.gridHeight/2);
			var left = EDITOR.settings.leftMargin + Math.max(0, indentationWidth - file.startColumn + col) * EDITOR.settings.gridWidth;
			var rect = EDITOR.canvas.getBoundingClientRect();
			
			console.log("mousePlayback: indentation=" + indentation + " indentationWidth=" + indentationWidth + " top=" + top + " middle=" + middle + " left=" + left + " rect=" + JSON.stringify(rect) + "  ");
			
			var mouseX = Math.round(rect.left + left + EDITOR.settings.gridWidth/2);
			var mouseY = rect.top + middle;
			
		}
		else if(target) {
			var targetElement = getMouseTargetElement(target);
			if(!targetElement) return console.warn("When playing back mouse event.type=" + mouseEvent.type + " was unable to locate target=" + JSON.stringify(target));
			
			var rect = targetElement.getBoundingClientRect();
			
			var mouseX = Math.round(rect.left + targetElement.offsetWidth/2);
			var mouseY = Math.round(rect.top + targetElement.offsetHeight/2);
			
		}
		else {
			stopPlayback();
			throw new Error("mouseEvent=" + JSON.stringify(mouseEvent));
		}
		
		if(!UTIL.isNumeric(mouseX) || !UTIL.isNumeric(mouseY)) throw new Error("mouseX=" + mouseX + " mouseY=" + mouseY + " rect=" + JSON.stringify(rect));
		
		fakeMouseElement.classList.remove("hidden");
		
		if(mouseEvent.type == "move") {
			
			if(targetElement) {
				fireEvent( targetElement, "mouseover" );
			}
			
			if(mousePlaybackPositionX == -100 && mousePlaybackPositionY == -100) instant = true;
			
			mousePlaybackPositionLastSetX = mouseX;
			mousePlaybackPositionLastSetY = mouseY;
			
			mousePlaybackAnimation(mouseX, mouseY, instant);
			
			
		}
		else if(mouseEvent.type == "click") {
			
			if(mouseEvent.row != undefined && mouseEvent.col != undefined) {
				// Click on canvas
				var LEFT_CLICK = 0;
				var RIGHT_CLICK = 2;
				if(mouseEvent.mouseButton != LEFT_CLICK) {
					// Editor is hard coded to show the context meny when you click with anything but the main mouse button
					EDITOR.ctxMenu.show(mouseX, mouseY);
				}
			}
			else if(targetElement) {
				targetElement.focus();
				fireEvent( targetElement, "click" );
			}
			
			// Animate
			if(fakeMouseElement) {
				fakeMouseElement.classList.add("click");
				playbackMouseSize = playbackMouseSize * 2;
				fakeMouseElement.style.width = playbackMouseSize + "px";
				fakeMouseElement.style.height = playbackMouseSize + "px";
				setTimeout(function() {
					fakeMouseElement.classList.remove("click");
					playbackMouseSize = Math.floor(playbackMouseSize / 2);
					fakeMouseElement.style.width = playbackMouseSize + "px";
					fakeMouseElement.style.height = playbackMouseSize + "px";
				}, 200);
			}
			
			mousePlaybackAnimation(mouseX, mouseY, true);
			
		}
		else throw new Error("Unknown mouse event type=" + mouseEvent.type + " in mouseEvent=" + JSON.stringify(mouseEvent));
		
		
		
		
	}
	
	function getMouseTargetElement(target) {
		
		if(target.id != undefined) {
			if(targetsToBeIgnored.indexOf(target.id) != -1) return null;
			
			return document.getElementById(target.id);
		}
		
		var elements = document.getElementsByTagName(target.tag);
		var elementsWithText = 0;
		var targetElement;
		for(var i=0; i<elements.length; i++) {
			if(elements[i].innerText.trim() == target.text || elements[i].value == target.text) {
				elementsWithText++;
				targetElement = elements[i];
			}
		}
		
		if(elementsWithText == 1) return targetElement;
		else if(elementsWithText > 1) {
			console.warn("There exist more then one element with tag=" + target.tag + " and text=" + target.text);
			return targetElement;
		}
		
		return null;
		
	}
	
	function fireEvent( el, eventName ) {
		if(el == undefined) throw new Error("fireEvent: el=" + el + ". A target element need to be specified in first argument!");
		
		var onname = 'on' + eventName;
		
		if(typeof el.dispatchEvent == "function") {
			if(typeof Event == "function") {
				var evObj = new Event(eventName);
			}
			else if(typeof document.createEvent == "function") {
				var evObj = document.createEvent( 'Events' );
				evObj.initEvent( eventName, true, false );
			}
			else throw new Error("Unable to create a new event! Event and document.createEvent are not supported by " + BROWSER);
			
			console.log("Dispatching to el=", el, " eventName=" + eventName + " evObj=", evObj);
			el.dispatchEvent( evObj );
		}
		else if(typeof el.fireEvent == "function") {
			console.log("Firing onname=" + onname + " on el=", el);
			el.fireEvent( onname );
		}
		else if(el.hasOwnProperty(onname)) {
			console.log("Calling onname=" + onname + " on el=", el);
			el[onname]();
		}
		else throw new Error("No means to trigger eventName=" + eventName + " on el=", el, " in BROWSER=" + BROWSER);
	}
	
	function mousePlaybackAnimation(newDestX, newDestY, instant) {
		
		console.log("mousePlaybackAnimation: newDestX=" + newDestX + " newDestY=" + newDestY + " instant=" + instant)
		
		if(instant) {
			if(!UTIL.isNumeric(newDestX) || !UTIL.isNumeric(newDestY)) throw new Error("mousePlaybackAnimation: newDestX=" + newDestX + " newDestY=" + newDestY + " instant=" + instant);
			
			mousePlaybackPositionX = newDestX;
			mousePlaybackPositionY = newDestY;
			mousePlaybackDeltaX = 0;
			mousePlaybackDeltaY = 0;
			mousePlaybackCountdown = 1;
		}
		else if(newDestX != undefined && newDestY != undefined) {
			var countdown = 10; // Mouse smoothness
			
			mousePlaybackDeltaX = (newDestX - mousePlaybackPositionX) / countdown;
			mousePlaybackDeltaY = (newDestY - mousePlaybackPositionY) / countdown;
			
			mousePlaybackCountdown = countdown;
		}
		
		if(mousePlaybackCountdown > 0) {
			mousePlaybackPositionX = Math.round(mousePlaybackPositionX + mousePlaybackDeltaX);
			mousePlaybackPositionY = Math.round(mousePlaybackPositionY + mousePlaybackDeltaY);
			
			console.log("mousePlaybackAnimation: mousePlaybackPositionX=" + mousePlaybackPositionX + " mousePlaybackPositionY=" + mousePlaybackPositionY + " mousePlaybackDeltaX=" + mousePlaybackDeltaX + " mousePlaybackDeltaY=" + mousePlaybackDeltaY);
			
			mousePlaybackCountdown--;
			
			if(mousePlaybackCountdown == 0) {
				// Because we are rounding the position it will be off, so we need to set it often
				mousePlaybackPositionX = mousePlaybackPositionLastSetX;
				mousePlaybackPositionY = mousePlaybackPositionLastSetY;
			}
			
			fakeMouseElement.style.left = Math.round(mousePlaybackPositionX - playbackMouseSize/2) + "px";
			fakeMouseElement.style.top = Math.round(mousePlaybackPositionY - playbackMouseSize/2) + "px";
			
		}
		
		if(isNaN(mousePlaybackPositionX) || isNaN(mousePlaybackPositionY)) {
			stopPlayback();
			throw new Error("mousePlaybackPositionX=" + mousePlaybackPositionX + " mousePlaybackPositionY=" + mousePlaybackPositionY + " mousePlaybackDeltaX=" + mousePlaybackDeltaX + " mousePlaybackDeltaY=" + mousePlaybackDeltaY + " newDestX=" + newDestX + " newDestY=" + newDestY + " instant=" + instant + " ");
		}
		
	}
	
	/*
		var playForward = playback(redo);
		var playBackward = playback(undo);
		function playback(undoRedoFunction) {
		}
	*/
	
	function timelineChange(currentValue, oldValue, e) {
		console.log("timelineChange: currentValue=" + currentValue + " oldValue=" + oldValue + " lastRecordItem=" + lastRecordItem);
		
		var filePath, file;
		var moveCaret = true;
		var playbackStart = recordInfo.startDate;
		
		EDITOR.ctxMenu.hide(); // Because the playback might have opened it
		
		if(lastRecordItem == -1) {
			resetPlayback(function(err) {
				if(err) return alertBox(err.message);
				else seek();
			});
		}
		else return seek();
		
		function seek() {
			seekAudio();
			
			if(!recordInfo.files.hasOwnProperty(EDITOR.currentFile.path)) {
				// Figure out which file we are in and switch to it
				var foundFile = false;
				if(currentValue > oldValue) {
					for(var i=Math.min(currentValue, record.length-1); i>oldValue; i--) {
						if(!record[i]) throw new Error("i=" + i + " record.length=" + record.length + " currentValue=" + currentValue + " oldValue=" + oldValue);
						if(record[i].changeFile) {
							foundFile = record[i].changeFile.to;
							break;
						}
					}
				}
				else {
					// currentValue <= oldValue
					for(var i=Math.min(currentValue, record.length-1); i<Math.min(oldValue, record.length); i++) {
						if(!record[i]) throw new Error("i=" + i + " record.length=" + record.length + " currentValue=" + currentValue + " oldValue=" + oldValue);
						if(record[i].changeFile) {
							foundFile = record[i].changeFile.to;
							break;
						}
					}
				}
				if(!foundFile) foundFile = recordInfo.startFile;
				showPlaybackFile(foundFile);
			}
			
			clearTimeout(fakeMouseElementHideTimer);
			fakeMouseElementHideTimer = setTimeout(function() {
				fakeMouseElement.classList.add("hidden");
			}, 5000);
			
			var fileChangeEvent;
			var arr;
			var order = recordInfo.lastOrder;
			
			if(currentValue > oldValue) {
				// Play forward
				for(var i=oldValue; i<currentValue; i++) {
					if(lastRecordItem+1 >= record.length) return stopPlayback();
					if(record[lastRecordItem+1].date <= (playbackStart+i*1000/playbackFPS)) {
						lastRecordItem++;
					
					fileChangeEvent = record[lastRecordItem].change;
					if(fileChangeEvent) {
						filePath = playBackFile(fileChangeEvent.filePath);
						
						if(!EDITOR.files.hasOwnProperty(filePath)) {
							alertBox("File closed ? " + filePath);
							stopPlayback();
							return;
						}
						
						var changeEvents = fileChangeEvents[filePath];
						if(!changeEvents) throw new Error(  "file.path=" + file.path + " not in " + JSON.stringify( Object.keys(fileChangeEvents) )  );
						if(!Array.isArray(changeEvents)) throw new Error("Not an array: changeEvents=" + JSON.stringify(changeEvents, null, 2));
						var currentOrder = fileChangeEventOrderCounters[filePath];
						var copyOfFileChangeEvent = UTIL.cloneObject(fileChangeEvent);
						while(order++ < currentOrder) {
							arr = changeEvents[order];
							
							if(!arr) {
								throw new Error( "order=" + order + " not in changeEvents=" + JSON.stringify(changeEvents, null, 2) );
							}
							
							for (var i=arr.length-1; i>-1; i--) {
								transformBackwards(copyOfFileChangeEvent, arr[i]);
							}
						}
						
						file = EDITOR.files[filePath];
						if(EDITOR.currentFile != file) EDITOR.showFile(file);
						ignoreFileChange = true;
						redo(file, copyOfFileChangeEvent, moveCaret);
						ignoreFileChange = false;
					}
					if(record[lastRecordItem].mouse) mousePlayback(record[lastRecordItem].mouse, true);
					if(record[lastRecordItem].changeFile) showPlaybackFile(record[lastRecordItem].changeFile.to);
					if(record[lastRecordItem].keyPress) keyPressPlayback( record[lastRecordItem].keyPress );
						if(record[lastRecordItem].keyCombo) playbackKeyCombo( record[lastRecordItem].keyCombo );
						if(record[lastRecordItem].select) playbackSelect( record[lastRecordItem].select );
						if(record[lastRecordItem].deselect) playbackDeselect( record[lastRecordItem].deselect );
				}
			}
		}
		else {
			// Play backwards
			
			if(lastRecordItem >= record.length) lastRecordItem--;
			if(lastRecordItem <= -1) return;
			
			if(!record[lastRecordItem]) throw new Error("lastRecordItem=" + lastRecordItem + " record.length=" + record.length)
			
			for(var i=oldValue; i>currentValue; i--) {
				
				if(record[lastRecordItem].date >= (playbackStart+i*1000/playbackFPS)) {
					
					if(record[lastRecordItem].change) {
						filePath = playBackFile(record[lastRecordItem].change.filePath);
						if(!EDITOR.files.hasOwnProperty(filePath)) {
							alertBox("File closed ? " + filePath);
							stopPlayback();
							return;
						}
						
						var changeEvents = fileChangeEvents[filePath];
						if(!changeEvents) throw new Error(  "file.path=" + file.path + " not in " + JSON.stringify( Object.keys(fileChangeEvents) )  );
						if(!Array.isArray(changeEvents)) throw new Error("Not an array: changeEvents=" + JSON.stringify(changeEvents, null, 2));
						var currentOrder = fileChangeEventOrderCounters[filePath];
						var copyOfFileChangeEvent = UTIL.cloneObject(record[lastRecordItem].change);
						while(order++ < currentOrder) {
							arr = changeEvents[order];
							
							if(!arr) {
								//continue;
								throw new Error( "order=" + order + " not in changeEvents=" + JSON.stringify(changeEvents, null, 2) );
							}
							
							for (var i=arr.length-1; i>-1; i--) {
								transformBackwards(copyOfFileChangeEvent, arr[i]);
							}
						}
						
						file = EDITOR.files[filePath];
						if(EDITOR.currentFile != file) EDITOR.showFile(file);
						
						ignoreFileChange = true;
						undo(file, copyOfFileChangeEvent, moveCaret);
						ignoreFileChange = false;
					}
					if(record[lastRecordItem].mouse) mousePlayback(record[lastRecordItem].mouse, true);
					if(record[lastRecordItem].changeFile) showPlaybackFile(record[lastRecordItem].changeFile.from);
					if(record[lastRecordItem].keyPress) keyPressPlayback(record[lastRecordItem].keyPress, true);
						if(record[lastRecordItem].keyCombo) playbackKeyCombo( record[lastRecordItem].keyCombo );
						
						// Reversed
						if(record[lastRecordItem].select) playbackDeselect( record[lastRecordItem].select );
						if(record[lastRecordItem].deselect) playbackSelect( record[lastRecordItem].deselect );
						
					lastRecordItem--;
				}
				
				if(lastRecordItem==-1) break;
				
			}
			
		}
		
	}
	}
	
	
	
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
	
	function inviteFromDiscoveryBar() {
		invite(EDITOR.currentFile);
	}
	
	function invite(file) {
		EDITOR.ctxMenu.hide();
		
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
			
			EDITOR.stat("collaboration_invite");
			
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
			
			EDITOR.stat("collaboration_mode");
			
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
		if(!fileChangeEventOrderCounters.hasOwnProperty(file.path)) {
			fileChangeEventOrderCounters[file.path] = -1; // -1 to prevent 0:null
		}
		if(!ignoreUndoRedoEvent.hasOwnProperty(file.path)) {
			ignoreUndoRedoEvent[file.path] = [];
		}
		
		var data = isRecordJson(file);
		if(data) {
			recordWidget.show();
			loadRecord(data);
		}
		
		if(isPlaying) {
			// New file opened during playback, save edits
			fileChangeEventOrderCounters[file.path] = recordInfo.lastOrder;
			fileChangeEvents[file.path] = [];
		}
		
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
		if(!collabMode && !isRecording) return true;
		if(file.noCollaboration) {
			console.warn("Collaboration disabled in " + file.path);
			return;
		}
		
		console.log(selection);
		
		if(!Array.isArray(selection)) {
			throw new Error("Not an array: " + JSON.stringify(selection));
		}
		
		if(selection.length == 0) return true;
		
		selection.sort(function sortByIndex(a, b) {
			return a.index - b.index;
		});
		
		var selectEvent = {
			filePath: file.path,
			start: selection[0].index,
			end: selection[selection.length-1].index,
		};
		
		if(collabMode) CLIENT.cmd("echo", {eventOrder: ++eventOrder, select: selectEvent});
		
		if(isRecording) record.push({date: (new Date()).getTime(), select: selectEvent});
		
		return true;
	}
	
	function recordDeselect(file, selection) {
		if(!isRecording) return true;
		if(file.noCollaboration) {
			console.warn("Collaboration disabled in " + file.path);
			return;
		}
		
		console.log(selection);
		
		if(!Array.isArray(selection)) {
			throw new Error("Not an array: " + JSON.stringify(selection));
		}
		
		if(selection.length == 0) return true;
		
		selection.sort(function sortByIndex(a, b) {
			return a.index - b.index;
		});
		
		var deselectEvent = {
			filePath: file.path,
			start: selection[0].index,
			end: selection[selection.length-1].index,
		};
		
		//if(collabMode) CLIENT.cmd("echo", {eventOrder: ++eventOrder, select: selectEvent});
		
		if(isRecording) record.push({date: (new Date()).getTime(), deselect: deselectEvent});
		
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
			saveUndoRedoHistoryEvent(fileChangeEvent);
		}
		
		if(!saveUndoRedoHistory) {
			// Prevent undo/redo action to be recorded when we get the echo
			ignoreUndoRedoEvent[file.path].push(fileChangeEvent.order);
		}
		
		if(isRecording) {
			recordFileChange(file, fileChangeEvent);
		}
		else if(!collabMode && recordInfo && recordInfo.files && file.path.indexOf("/playback/") == 0 && recordInfo.files.hasOwnProperty(file.path.replace("playback/", ""))) {
			// We always want to save changes if the file belongs to a playback file in order to transform the playback
			if( fileChangeEvents[file.path][fileChangeEvent.order] ) throw new Error("Events for order=" + fileChangeEvent.order + " already exist for file=" + file.path + "\n" + JSON.stringify(fileChangeEvents[file.path][fileChangeEvent.order], null, 2));
			fileChangeEvents[file.path][fileChangeEvent.order] = [];
			
			fileChangeEvents[file.path][fileChangeEvent.order].push(fileChangeEvent);
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
		
		var path = ev.filePath;
		
		console.warn("saveUndoRedoHistoryEvent: saveUndoRedoHistory=" + saveUndoRedoHistory + " ignoreUndoRedoEvent[path]=" + JSON.stringify(ignoreUndoRedoEvent[path]) + " ev.order=" + ev.order + " Adding event to undo/redo history: " + JSON.stringify(ev, null, 2));
		
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
			var indexOfIgnoreUndoRedo = ignoreUndoRedoEvent[file.path].indexOf(ev.order);
			if(indexOfIgnoreUndoRedo == -1 || ev.cId != userConnectionId) {
				saveUndoRedoHistoryEvent(ev);
			}
			
			if(indexOfIgnoreUndoRedo != -1) {
				ignoreUndoRedoEvent[file.path].splice(indexOfIgnoreUndoRedo, 1);
			}
			
		}
		else if(json.select && json.cId != userConnectionId) {
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
		else if(json.moveCaret && json.cId != userConnectionId) {
			// ### Someone moved their caret
			if( !carets.hasOwnProperty(json.moveCaret.filePath) ) carets[json.moveCaret.filePath] = {};
			
			carets[json.moveCaret.filePath][json.cId] = json.moveCaret.caret;
			
			EDITOR.renderNeeded();
		}
		else if(json.fileSaved && json.cId != userConnectionId) {
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
	
	function collabRedoViaMenu() {
		EDITOR.input = true;
		collabRedo(EDITOR.currentFile);
		EDITOR.input = false;
	}
	
	function collabRedo(file) {
		if(!file) return true;
		if(!EDITOR.input) return true; // why? Because we might be in a DOM input element!
		
		console.log("collabRedo!");
		
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
	
	
	function collabUndoViaMenu() {
		EDITOR.input = true;
		collabUndo(EDITOR.currentFile);
		EDITOR.input = false;
	}
	
	function collabUndo(file) {
		console.log("collabUndo: file.path=" + (file && file.path) + " EDITOR.input=" + EDITOR.input);
		
		if(!file) return true;
		// Why explicitly check for EDITOR.input !? Does not work if undo via window menu
		// Answer: To prevent undo when undoing something inside a <input> element!!
		if(!EDITOR.input) return true; 
		
		if(!undoRedoHistory.hasOwnProperty(file.path)) {
			console.warn("collabUndo: " + file.path + " has no undo/redo history!");
			return PREVENT_DEFAULT;
		}
		
		var history = undoRedoHistory[file.path];
		
		console.log("collabUndo: history.length=" + history.length + " history.index=" + history.index + " history=" + JSON.stringify(history, null, 2));
		
		if(history.length == 0) {
			console.warn("collabUndo: No undo/redo history to undo! history.length=" + history.length + "");
			return PREVENT_DEFAULT;
		}
		
		if(history.index < 0) {
			console.warn("collabUndo: undo/redo history index=" + history.index + " has reached the bottom");
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
			console.log("collabUndo: Transforming change=" + JSON.stringify(change) + " from history.index=" + history.index);
			//for (var i=history.length-1; i>=history.index; i--) {
			for (var i=history.index+1; i<history.length; i++) {
				//console.log("collabUndo:  i=" + i + " history.length=" + history.length);
				if(history[i].cId != userConnectionId) {
					transformBackwards(change, history[i]);
					console.log("collabUndo: Ended up with index=" + change.index + " and row=" + change.row);
				}
			}
			console.log("collabUndo: Transformed change=" + JSON.stringify(change));
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
		console.log("collabUndo: Moved history index from " + oldIndex + " to " + history.index + " change=" + JSON.stringify(history[history.index], 1) );
		
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
		
		if(!isPlaying) EDITOR.stat("undo");
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
		
		if(!isPlaying) EDITOR.stat("redo");
		
		return caret;
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
	
	EDITOR.addTest(4, false, testCollaboration);
	
	
	function testUndoRedoWhileInCollabMode(callback) {
		var ENTER = 13;
		
		collabMode = true;
		
		var testUserConnectionId = userConnectionId + 1;
		var testUserAlias = "Test";
		var testEventOrder = 1;
		var fakeEchoCounter = 1;
		var testFile;
		var fileChangeOrder = 0;
		
		EDITOR.dashboard.hide();
		
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
		
		EDITOR.openFile("testUndoRedoWhileInCollabMode.txt", "\n", function colaborationTestFileOpened(err, file) {
			if(err) throw err;
			
			testFile = file;
			
			if(!EDITOR.currentFile) throw new Error("EDITOR.currentFile=" + EDITOR.currentFile + " EDITOR.files=", EDITOR.files);
			
			if(EDITOR.currentFile != file) throw new Error("EDITOR.currentFile=" + EDITOR.currentFile.path + " expected file=" + file.path);
			
			eventOrder = 1;
			
			timeSerial([
				function() {
					
					EDITOR.mock("typing", "abc");
					if(file.text != "abc\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
					
				}, function() { // Wait until we get our own echo
					
					// Close any alert boxes that would prevent insert
					if(EDITOR.openDialogs.length > 0) EDITOR.closeAllDialogs("TESTS");
					EDITOR.input = true; // Allow input
					
					if(!collabMode) throw new Error("collabMode=" + collabMode);
					
					// Undo/redo in colaboration mode
					EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Undo insert c
					if(file.text != "ab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
				}, function() {
					
					EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Undo insert b
					if(file.text != "a\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
				}, function() {
					
					fileChangeOrder = 2; // Will cause next change to get order=3
					
					f({change: "insert", index: 0, text: "å"});
					if(file.text != "åa\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
				}, function() {
					
					EDITOR.mock("keydown", {char: "Y", ctrlKey: true}); // Redo insert b
					if(file.text != "åab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
				}, function() {
					
					f({change: "insert", index: 1, text: "ä"});
					if(file.text != "åäab\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
				}, function() {
					
					EDITOR.mock("keydown", {char: "Z", ctrlKey: true}); // Undo insert b
					if(file.text != "åäa\n") throw new Error("Unexpected: file.text=" + UTIL.lbChars(file.text));
					
					collabMode = false;
					
					// Clean for next run
					for(var obj in fileChangeEventOrderCounters) delete fileChangeEventOrderCounters[obj];
					for(var obj in fileChangeEvents) delete fileChangeEvents[obj];
					
					if(callback) {
						EDITOR.closeFile(file);
						callback(true);
					}
					
			}]);
			
		});
	}
	
	EDITOR.addTest(5, false, testUndoRedoWhileInCollabMode);
	
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
	
	EDITOR.addTest(5, false, testEditAtTheSameTime);
	
	function timeSerial(func) {
		if(func.length >= 20) console.warn("Dialog might disable EDITOR.input!");
		
		var timers = [];
		// Wait between each step
		var timeMult = 100;
		
		var timer;
		for(var i=0; i<func.length; i++) {
			timer = setTimeout(function(f) {
				try {
					f();
				}
				catch(err) {
					for(var j=0; j<timers.length; j++) clearTimeout(timers[j]); // Stop future events
					throw err;
				}
				
			}, i*timeMult, func[i]);
			timers.push(timer);
		}
	}
	
	// TEST-CODE-END
	
	
	
})();
