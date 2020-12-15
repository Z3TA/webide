(function() {
	/*
		
		Proof of concept: Voice aid, for when you can not see the screen.
		
		Chromium will have issues. You could try:
		
		sudo apt-get install espeak
		chromium-browser http://127.0.0.1:8080 --enable-speech-dispatcher
		
		or use Firefox.
		
		Problem: Sometimes when many SpeechSynthesisUtterance is created in short time, it stops working!
		Solution: ?
		
		
	*/
	"use strict";
	
	var lastRow = 0;
	var lastCol = 0;
	var lastTime = new Date();
	var lastFile = EDITOR.currentFile;
	var aboutToSayTimer;
	var sayingTimer;
	var winMenuSpeech;
	var wasActivated = false;
	
	EDITOR.plugin({
		desc: "Speech Synthesis assistant",
		load: function loadVoicePlugin() {
			
			console.log("Loading " + this.desc + " ...");
			
			var key_M = 77;
			var key_S = 83;
			
			EDITOR.bindKey({desc: "Say something", charCode: key_M, combo: ALT, fun: test}); // Alt + M
			EDITOR.bindKey({desc: "Torn on or off sound assist", charCode: key_S, combo: ALT, fun: toggleSpeechAssistant}); // Alt + S
			
			EDITOR.bindKey({desc: "Increase voice assist speed", key: "+", combo: SHIFT+CTRL, fun: increaseVoiceSpeed});
			EDITOR.bindKey({desc: "Decrease voice assist speed", key: "-", combo: SHIFT+CTRL, fun: decreaseVoiceSpeed});
			
			EDITOR.on("soundAssist", checkSoundAssistStatus);
			
			winMenuSpeech = EDITOR.windowMenu.add(S("sound_assist"), [S("Tools"), 150], toggleSpeechAssistant);
			
			if(QUERY_STRING["voice"]) activateSpeechAssistant();
			
		},
		unload: function unloadVoicePlugin() {
			
			EDITOR.unbindKey(test);
			
			EDITOR.removeEvent("soundAssist", checkSoundAssistStatus);
			
			EDITOR.windowMenu.remove(winMenuSpeech);
			
			disableSpeechAssistant();
		}
	});
	
	function increaseVoiceSpeed() {
		// Stupid floating point nr will of course make it 0.00000000023 so prevent that
		EDITOR.speechRate = ((EDITOR.speechRate*10 +1) | 0) / 10;
		console.log("EDITOR.speechRate=" + EDITOR.speechRate);
		EDITOR.say("Speech rate " + EDITOR.speechRate);
		return false;
	}
	
	function decreaseVoiceSpeed() {
		EDITOR.speechRate = ((EDITOR.speechRate*10 - 1) | 0) / 10;
console.log("EDITOR.speechRate=" + EDITOR.speechRate);
		EDITOR.say("Speech rate " + EDITOR.speechRate);
		return false;
	}
	
	function checkSoundAssistStatus(activated) {
		if(activated) activateSpeechAssistant();
		else disableSpeechAssistant();
		return ALLOW_DEFAULT;
	}
	
	function toggleSpeechAssistant() {
		EDITOR.soundAssist = !EDITOR.soundAssist; // This will call checkSoundAssistStatus()
		
		winMenuSpeech.hide();
		
		EDITOR.canvas.focus();
		EDITOR.input = true;
		
		return false;
	}
	
	function activateSpeechAssistant() {
		
		if (!('speechSynthesis' in window)) {
			alertBox("Speech Synthesis not possible in your browser! (" + BROWSER + ")");
			return;
		}
		
		EDITOR.on("moveCaret", speakMoveCaret);
		
		EDITOR.say("Speech assist activated!");
		
		winMenuSpeech.activate();
		
		wasActivated = true;
		
		EDITOR.stat("speech_assistant");
	}
	
	function disableSpeechAssistant() {
		if(wasActivated) EDITOR.say("Now deactivating speech assitant!");
		
		wasActivated = false;
		
		EDITOR.removeEvent("moveCaret", speakMoveCaret);
		
		winMenuSpeech.deactivate();
	}
	
	function changeFile() {
		var file = UTIL.getFilenameFromPath();
		
	}
	
	function speakMoveCaret(file, caret) {
		
		var msg = "";
		var time = new Date();
		
		clearTimeout(aboutToSayTimer); // Preventing speaking last message
		
		aboutToSayTimer = setTimeout(function() {
			
		if(caret.row != lastRow) add("line " + (parseInt(caret.row) +1) + ", ");
		
			//if(file.grid[caret.row].length == 0) add("empty line");
		
			// Say char or word
			var char = file.text.charAt(caret.index).toString("utf-8");
			var charToTheLeft = file.text.charAt(caret.index-1);
			
			console.log("char=" + char + " is a non-letter-character ? " + (char.match(/\W/)) );
			
			if(char == " ") add("space");
			else if(char.match(/\W/)) {
				console.log("Non word character: " + char);
				//add("spec.");
				if(char == "_") add("underscore");
				else if(char == "(") add("left parenthesis");
				else if(char == ")") add("right parenthesis");
				else if(char == "{") add("left bird-wing");
				else if(char == "}") add("right bird-wing");
				else if(char == "[") add("left clammer");
				else if(char == "]") add("right clammer");
				else if(char == "/") add("slash");
				else if(char == "\\") add("back-slash");
				else if(char == "!") add("bang");
				else if(char == "?") add("questionmark");
				else if(char == ".") add("dot");
				else if(char == "=") add("equal");
				else if(char == "+") add("plus");
				else if(char == "-") add("minus");
				else if(char == "&") add("and");
				else if(char == "|") add("or");
				else if(char == ">") add("right arrow");
				else if(char == "<") add("left arrow");
				else if(char == "'") add("single quote");
				else if(char == '"') add("double quote");
				else if(char == "@") add("at");
				else if(char == "#") add("hashtag");
				else if(char == "\n") ; // Don't say anything'
				else if(char == ";") add("semi-colon");
				else if(char == ":") add("colon");
				else if(char == ",") add("comma");
				else {
					// Todo: Add all emojis !?
					add("charcode" + char.charCodeAt(0));
					console.warn("Unknown character: char=" + UTIL.lbChars(char) + " (" + char.charCodeAt(0) + ")");
					//throw new Error("Unknown character: char=" + UTIL.lbChars(char) + " (" + char.charCodeAt(0) + ")");
				}
			}
			else if(charToTheLeft.match(/\W/) || caret.col == 0) {
				console.log("get word caret.index=" + caret.index + " char=" + char + " ...");
			var word = "";
			for (var i=caret.index, char; i<file.text.length; i++) {
				char = file.text.charAt(i)
				if(char.match(/\s/)) {
					console.log("Space at index=" + i);
					break;
				}
				console.log("char=" + char + " at index=" + i);
				word += char;
			}
			add(word);
		}
			else add(char);
			
			if(caret.eol && file.grid[caret.row].length > 0) add("End of line " + (caret.row + 1));
			if(caret.eof) add("End of file!");
		
			lastRow = caret.row;
			lastCol = caret.col;
			
			EDITOR.say(msg);
		
		}, 3); // To Preventing speak when moving fast
		
		
		return true;
		
		function add(str) {
			if(msg.length != 0) msg += " ";
			msg += str;
			console.log("say:add:" + str);
		}
		
	}
	
	function test() {
		
		console.log("Testing Speech Synthesis ...");
		//var msg = new SpeechSynthesisUtterance('Hello World');
		//window.speechSynthesis.speak(msg);
		
		
		var msg = new SpeechSynthesisUtterance("Test!");
		var voices = window.speechSynthesis.getVoices();
		msg.voice = voices[10]; // Note: some voices don't support altering params
		msg.voiceURI = 'native';
		msg.volume = 1; // 0 to 1
		msg.rate = 1; // 0.1 to 10
		msg.pitch = 2; //0 to 2
		msg.text = 'Hello World';
		msg.lang = 'en-US';
		
		msg.onend = function(e) {
			console.log('Finished in ' + e.elapsedTime + ' seconds.');
		};
		
		window.speechSynthesis.speak(msg);
		
		
		
		return false;
	}
	
})();
