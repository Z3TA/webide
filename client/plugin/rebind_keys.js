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
			EDITOR.removeEvent("storageReady", loadKeySettings);
			EDITOR.removeEvent("keyPressed", showKeyInfo);
		}
	});

	function loadKeySettings() {
		
	}

	function toggleDebugKeys() {
		menuDebugKeys.toggle();

		if(menuDebugKeys.activated) {
			EDITOR.on("keyPressed", showKeyInfo);
		}
		else {
			EDITOR.removeEvent("keyPressed", showKeyInfo);
		}
	}

	function showKeyInfo(file, character, combo, e) {
		console.log("Key pressed: character=" + character + ": ", e);

		if(EDITOR.currentFile && EDITOR.currentFile.path == fileName) return ALLOW_DEFAULT; // Don't record keys in the log file

		// 22:4:40_128 character=A isTrusted=true key="A" code="KeyA" location=0 ctrlKey=false shiftKey=true altKey=false metaKey=false repeat=false isComposing=false charCode=0 keyCode=65 DOM_KEY_LOCATION_STANDARD=0 DOM_KEY_LOCATION_LEFT=1 DOM_KEY_LOCATION_RIGHT=2 DOM_KEY_LOCATION_NUMPAD=3 getModifierState=undefined initKeyboardEvent=undefined [object KeyboardEvent]=[object Window] detail=0 sourceCapabilities={} which=65 initUIEvent=undefined type="keydown" target={} [object KeyboardEvent]=[object Window] eventPhase=3 bubbles=true cancelable=true defaultPrevented=false composed=true timeStamp=37998.80000001192 srcElement={} returnValue=true cancelBubble=false NONE=0 CAPTURING_PHASE=1 AT_TARGET=2 BUBBLING_PHASE=3 composedPath=undefined initEvent=undefined preventDefault=undefined stopImmediatePropagation=undefined stopPropagation=undefined [object KeyboardEvent]=[object HTMLCanvasElement],[object HTMLDivElement],[object HTMLDivElement],[object HTMLDivElement],[object HTMLBodyElement],[object HTMLHtmlElement],[object HTMLDocument],[object Window]
		var p = {};
		p.key = e.key;
		p.code = e.code;
		p.ctrlKey = e.ctrlKey;
		p.shiftKey = e.shiftKey;
		p.altKey = e.altKey;
		p.metaKey = e.metaKey;
		p.charCode = p.charCode;
		p.keyCode = p.keyCode;

		writeToFile(time() + " character=" + escape(character) + " " + JSON.stringify(p));

		return ALLOW_DEFAULT;

	}

	function writeToFile(str) {

		var stateProps = {
			isSaved: false,
			savedAs: false,
			disableParsing: true,
			fullAutoIndentation: false
		};

		var file = EDITOR.files[fileName];

		if(file) return fileOpened(null, file, "");
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
