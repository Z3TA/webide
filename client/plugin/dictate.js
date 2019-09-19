(function() {
"use strict";

	/*
		
		!DO:NOT:BUNDLE!
		
		It seems both Chrome and Firefox has discontinued the Speech Recognition API, POOP!
		
		Probably needs httpS/SSL to test even on localhost!
		When testing locally, start the server with -ssl flag
		then go to https://localhost.webide.se/ which goes to 127.0.0.1
		
		Problem: You don't really have time to write a blog post, 
		but maybe you can write one during lunch, just talk to the phone and it will write down what you say.
		
	*/
	
var widget;
	var startStopButton;
	var winMenuDictate;
	var isListening = false;
	var recognition;
	var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
	var kbShortCut, startText, stopText;
	
EDITOR.plugin({
		desc: "Turn speach into text",
load: function loadDictate() {

			if(typeof SpeechRecognition == "undefined") {
				console.warn("Speech recognition (dictate) not supported in " + BROWSER);
				return;
			}
			
			widget = EDITOR.createWidget(buildDictateBar);

			winMenuDictate = EDITOR.windowMenu.add("Dicate (speech to text)", ["Tools", 50], initDictate);
			
},
unload: function unloadDictate() {
widget.unload();
		}
	});
	
	function buildDictateBar() {
		
		var wrap = document.createElement("div");
		
		var cancel = document.createElement("button");
		cancel.innerText = "Cancel";
		cancel.classList.add("button");
		cancel.onclick = function() {
			stopListening();
			widget.hide();
		};
		wrap.appendChild(cancel);
		
		var insertP = document.createElement("button");
		insertP.innerText = "New paragraph";
		insertP.classList.add("button");
		insertP.onclick = function() {
			var file = EDITOR.currentFile;
			
			if(file.grid[file.caret.row][0] == "<" && file.grid[file.caret.row][1] == "p" && file.grid[file.caret.row][2] == ">") {
				file.insertText("</p>");
			}
			
			file.insertLineBreak();
			file.insertLineBreak();
			if(isHTML(EDITOR.currentFile)) {
				file.insertText("<p>");
			}
		}
		wrap.appendChild(insertP);
		
		var br = document.createElement("button");
		br.innerText = "Insert line-break";
		br.classList.add("button");
		br.onclick = function() {
			var file = EDITOR.currentFile;
			if(isHTML(file)) file.insertText("<br>");
			file.insertLineBreak();
		}
		wrap.appendChild(br);
		
		startStopButton = document.createElement("button");
		startStopButton.classList.add("button");
		startStopButton.onclick = startOrStopDictating;
		wrap.appendChild(startStopButton);
		
		return wrap;
	}
	
	function initDictate() {
		
		/*
			var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
			var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
			var speechRecognitionList = new SpeechGrammarList();
		*/
		
		widget.show();
		
		if(!recognition) {
			
			recognition = new SpeechRecognition();
			//recognition.continuous = false;
			recognition.lang = 'en-US';
			recognition.interimResults = false;
			recognition.maxAlternatives = 1;
			recognition.onresult = speechRecognitionResult;
			recognition.onspeechend = function speechRecognitionEnd() {
				recognition.stop();
			}
			recognition.onerror = function speechRecognitionError(ev) {
				//console.warn("Speech recognition (dictate) error: " + ev.error);
				alertBox("Speech recognition (dictate) error: " + ev.error);
				
				isListening = false;
				
				updateButton();
				
			}
			recognition.onnomatch = function speechRecognitionNomatch(ev) {
				console.log(ev);
				alertBox("Speech recognition (dictate) found no matching commands!");
			}
			
			kbShortCut = document.createElement("span");
			kbShortCut.classList.add("keyboardShortcut");
			kbShortCut.innerText = "T";
			
			startText = document.createTextNode("Start");
			stopText = document.createTextNode("Stop");
			
			startStopButton.appendChild(startText);
			startStopButton.appendChild(kbShortCut);
			
		}
		
		
	}
	
	function stopListening() {
		recognition.stop();
		isListening = false;
		updateButton();
		
		alertBox("stopListening: isListening=" + isListening);
	}
	
	function startListening() {
		if(recognition) {
			try {
				recognition.start();
				isListening = true;
			}
			catch(err) {
				alertBox("Failed to start speech recognition: " + err.message);
				isListening = false;
			}
		}
		updateButton();
		alertBox("startListening: isListening=" + isListening);
	}
	
	function updateButton() {
		
		while(startStopButton.firstChild) startStopButton.removeChild(startStopButton.firstChild);
		
		if(isListening) {
			startStopButton.appendChild(stopText);
			startStopButton.appendChild(kbShortCut);
			startStopButton.classList.add("recording");
		}
		else {
			startStopButton.appendChild(startText);
			startStopButton.appendChild(kbShortCut);
			startStopButton.classList.remove("recording");
		}
	}
	
	function startOrStopDictating() {
		
		if(isListening) stopListening();
		else startListening();
		
	}
	
	function speechRecognitionResult(speechRecognitionEvent) {
		/*
			You need to be on localhost or httpS or you will get access error
			
			JSpeech Grammar Format:https://www.w3.org/TR/jsgf/
			
		*/
		
		// The SpeechRecognitionEvent results property returns a SpeechRecognitionResultList object
		// The SpeechRecognitionResultList object contains SpeechRecognitionResult objects.
		// It has a getter so it can be accessed like an array
		// The [last] returns the SpeechRecognitionResult at the last position.
		// Each SpeechRecognitionResult object contains SpeechRecognitionAlternative objects that contain individual results.
		// These also have getters so they can be accessed like arrays.
		// The [0] returns the SpeechRecognitionAlternative at position 0.
		// We then return the transcript property of the SpeechRecognitionAlternative object
		
		isListening = false;
		
		updateButton();
		
		if(speechRecognitionEvent == undefined) speechRecognitionEvent = event;
		
		var last = speechRecognitionEvent.results.length - 1;
		var speechResult = speechRecognitionEvent.results[last][0].transcript;
		//var speechResult = speechRecognitionEvent.results[0][0].transcript;
		
		alertBox("Speech recognition (dictate) speechResult=" + speechResult);
		
		console.log ("Speech recognition (dictate) speechResult=" + speechResult);
		
		var file = EDITOR.currentFile;
		var caret = file.caret;
		var emptyLine = (file.grid[file.caret.row].length == 0);
		
		if(isHTML(file) && emptyLine) file.insertText("<p>");
		
		file.insertText(speechResult);
		
		console.log(speechRecognitionEvent);
	}
	
	function isHTML(file) {
		var ext = UTIL.getFileExtension(file.path);
		return (ext == "htm" || ext == "html" || file.text.slice(0, 100).match(/<!DOCTYPE HTML>/i));
	}
	
})();