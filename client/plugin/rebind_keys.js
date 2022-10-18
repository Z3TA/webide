(function() {
	"use strict";

	//if(! QUERY_STRING["keylog"] ) return;

	var fileName ="keyLog.tmp";
	var menuDebugKeys;

	EDITOR.plugin({
		desc: "Show which key was pressed",
		order: 10000, // Show far down in the menu
		load:function loadRebindKeys() {
			EDITOR.on("storageReady", loadKeySettings);
		
			menuDebugKeys = EDITOR.windowMenu.add("Show keypress events", [S("Editor"), "Debug", 10], toggleDebugKeys);

		},
		unload: function unloadRebindKeys() {
			EDITOR.windowMenu.remove(menuDebugKeys);

			EDITOR.removeEvent("storageReady", loadKeySettings);
			EDITOR.removeEvent("keyPressed", showKeyInfoFromKeyPressed);
			EDITOR.removeEvent("keyPressed", showKeyInfoFromKeydown);
		}
	});

	function loadKeySettings() {
		
	}

	function toggleDebugKeys() {
		menuDebugKeys.toggle();

		if(menuDebugKeys.activated) {
			EDITOR.on("keyPressed", showKeyInfoFromKeyPressed);
			EDITOR.on("keyDown", showKeyInfoFromKeydown);
		}
		else {
			EDITOR.removeEvent("keyPressed", showKeyInfoFromKeyPressed);
			EDITOR.removeEvent("keyDown", showKeyInfoFromKeydown);
		}
	}

	function showKeyInfoFromKeyPressed(file, character, combo, e) {
		return showKeyInfo(file, character, combo, e, "keyPressed")
	}

	function showKeyInfoFromKeydown(file, character, combo, e) {
		return showKeyInfo(file, character, combo, e, "keyDown")
	}

	function showKeyInfo(file, character, combo, e, evName) {
		console.log("Key pressed: character=" + character + ": ", e);

		if(EDITOR.currentFile && EDITOR.currentFile.path == fileName) return ALLOW_DEFAULT; // Don't record keys in the log file

		// 22:4:40_128 character=A isTrusted=true key="A" code="KeyA" location=0 ctrlKey=false shiftKey=true altKey=false metaKey=false repeat=false isComposing=false charCode=0 keyCode=65 DOM_KEY_LOCATION_STANDARD=0 DOM_KEY_LOCATION_LEFT=1 DOM_KEY_LOCATION_RIGHT=2 DOM_KEY_LOCATION_NUMPAD=3 getModifierState=undefined initKeyboardEvent=undefined [object KeyboardEvent]=[object Window] detail=0 sourceCapabilities={} which=65 initUIEvent=undefined type="keydown" target={} [object KeyboardEvent]=[object Window] eventPhase=3 bubbles=true cancelable=true defaultPrevented=false composed=true timeStamp=37998.80000001192 srcElement={} returnValue=true cancelBubble=false NONE=0 CAPTURING_PHASE=1 AT_TARGET=2 BUBBLING_PHASE=3 composedPath=undefined initEvent=undefined preventDefault=undefined stopImmediatePropagation=undefined stopPropagation=undefined [object KeyboardEvent]=[object HTMLCanvasElement],[object HTMLDivElement],[object HTMLDivElement],[object HTMLDivElement],[object HTMLBodyElement],[object HTMLHtmlElement],[object HTMLDocument],[object Window]
		var p = {};

		var props = ["key", "code", "ctrlKey", "shiftKey", "altKey", "metaKey", "charCode", "keyCode", "isComposing", "data", "which"];

		props.forEach(showMaybe);

		writeToFile(time() + " " + evName + ": char=" + escape(character) + " " + JSON.stringify(p));

		return ALLOW_DEFAULT;

		function showMaybe(prop) {
			if(typeof e[prop] != "undefined") p[prop] = e[prop];
			//if(e.hasOwnProperty(prop)) p[prop] = e[prop];
		}

	}

	function writeToFile(str, recursion) {

		if(typeof recursion == "undefined") recursion = 0;
		if(recursion > 10) throw new Error("Opening " + fileName + " is taking too long time!");

		var stateProps = {
			isSaved: false,
			savedAs: false,
			disableParsing: true,
			fullAutoIndentation: false
		};

		var file = EDITOR.files[fileName];

		if(file) return fileOpened(null, file, "");
		else if( EDITOR.openFileQueue.indexOf(fileName) != -1 ) {
			setTimeout(function() {
				writeToFile(str, ++recursion)
			}, 200);
		}
		else return EDITOR.openFile(fileName, "key presses:\n",{props: stateProps}, fileOpened)

		function fileOpened(err, file) {
			if(err) throw err;

			file.writeLine(str);

			if(EDITOR.currentFile == file) EDITOR.renderNeeded();
		
		}

	}

	function time() {
		var date = new Date();

		var seconds = date.getSeconds();
		var minutes = date.getMinutes();
		var hour = date.getHours();
		var milliSeconds = date.getMilliseconds();

		return hour + ":" + minutes + ":" + seconds + "_" + milliSeconds;

	}


})();
