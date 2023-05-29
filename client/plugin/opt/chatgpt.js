/*

*/

(function() {
	"use strict";

	var order = 1500;
	var currentFile;
	var firstMessage = true;
	var ENABLED = true;
	var winMenuChatGpt;

	EDITOR.plugin({
		desc: "Use ChatGPT for code completions",
		load: function loadChatGPT() {
		//console.log("chatGpt: !loadChatGPT");
			CLIENT.on("chatgpt", chatGptMessage);
			EDITOR.on("autoComplete", chatGptComplete, order);

			EDITOR.loadSettings("chatgpt", null, gotChatgptSettings);

			winMenuChatGpt = EDITOR.windowMenu.add("ChatGPT", [S("Editor"), S("Settings"), 150], chatGptWinMenuClick);

			EDITOR.on("afterSave", chatGptSettingsSavedMaybe);

		},
		unload: function unloadChatGPT() {
			//console.log("chatGpt: !unloadChatGPT");
			CLIENT.removeEvent("chatgpt", chatGptMessage);

			EDITOR.removeEvent("autoComplete", chatGptComplete);
			EDITOR.removeEvent("afterSave", chatGptSettingsSavedMaybe);

			EDITOR.windowMenu.remove(winMenuChatGpt);
		}
	});

	function chatGptSettingsSavedMaybe(file) {
		//console.log("chatGpt:chatGptSettingsSavedMaybe: file.path=" +  file.path);

		if(file.path != "settings://chatgpt") return ALLOW_DEFAULT;

		try {
			var json = JSON.parse(file.text);
		}
		catch(err) {
			alertBox("ChatGPT settings json failed to parse: " + err.message);
			return ALLOW_DEFAULT;
		}

		gotChatgptSettings(json);

		return ALLOW_DEFAULT;
	}

	function chatGptWinMenuClick() {
		EDITOR.openFile("settings://chatgpt", function editSettings(err, file) {
			if(err) {
				//console.log("chatGpt:chatGptWinMenuClick:editSettings err.code=" + err.code);

				if(err.code == "ENOENT") {
					var json = {
						OPENAI_API_KEY: "put your openAI API key here",
						PROMPT: {
							sh: "You are a program code autocompleter.\nYou generate bash shell script code.\nPut all code explanations in comments.\nDo NOT use code snippets\nGive the user only the code"
						}
					}

					EDITOR.openFile("settings://chatgpt", JSON.stringify(json, null, 2), function editSettings(err, file) {
						//console.log("chatGpt:chatGptWinMenuClick:editSettings err.code=" + (err && err.code));

					});

				}
			}
		});
	}

	function gotChatgptSettings(settings) {
		if(settings == undefined) return;

		//console.log("chatGpt:gotChatgptSettings: settings=" + JSON.stringify(settings, null, 2));

		CLIENT.cmd("chatgpt.init", settings, function (err, resp) {
			if(err) {
				alertBox(err.message);
			}
		});
	}

	function chatGptComplete(file, wordToComplete, wordLength, gotOptions, autocompleteCb) {
		//console.log("chatGpt: chatGptComplete: ENABLED=" + ENABLED + " wordToComplete=" + wordToComplete);

		if(!ENABLED) return;

		if( !insideComment(file, file.caret) ) {
			//console.log("chatGpt: chatGptComplete: Not inside a comment!");
			return;
		}

		// Give some context !?
		// max 2048 characters !?
		var maxLen = 2048;

		//console.log("chatGpt: file.caret.index=" + file.caret.index  + " maxLen=" + maxLen);
		if(file.caret.index > maxLen) {
			var text = file.rowText(file.caret.row, false);
			var len = text.length;
			var indent = file.rowIndentationLevel(file.caret.row);
			var rowIndent = 0;
			for (var row=file.caret.row, rowText; row>0; row--) {
				rowText = file.rowText(row, false);
				len += rowText.length;
				len += file.lineBreak.length;
				//console.log("chatGpt: len=" + len);

				if(len >= maxLen) break;

				rowIndent = file.rowIndentationLevel(row);

				if( rowIndent != indent ) break;

				indent = rowIndent;
				text = rowText + file.lineBreak + text;
				//console.log("chatGpt: text.length=" + text.length);
			}
		}
		else {
			var text = file.text.slice(0, file.caret.index);
		}

		var json = {
			msg: text
		};

		if(file.savedAs) json.ext = UTIL.getFileExtension(file.path);

		//console.log("chatGpt: text.length=" + text.length + " maxLen=" + maxLen + " text=" + text);

		currentFile = EDITOR.currentFile;
		firstMessage = true;
		afterNewLine = false;
		inStringLiteral = false;

		CLIENT.cmd("chatgpt.complete", json, function (err, resp) {

			if(err) {
				//console.log("chatGpt: error: " + err.message);
				alertBox(err.message, "chatGpt", "error");
			}
			else {
				// Add a line break in order to make the editor parse the code
				file.insertLineBreak();
			}

			//console.log("chatGpt: resp=" + JSON.stringify(resp, null, 2));

		});

		return {exclusive: true, add: []}; // exclusive means no other auto-completer will run after this

	}

	function chatGptMessage(msg) {

		//console.log("chatGpt: chatGptMessage: firstMessage=" + firstMessage + " msg=" + UTIL.lbChars(msg));

		var file = currentFile;

		if(firstMessage) {
			// Step out from the comment
			//console.log("chatGpt:chatGptMessage: firstMessage=" + firstMessage + " Stepping out from the comment!");

			while( insideComment(file, file.caret) ) {
				file.moveCaretDown();

				//console.log("chatGpt: chatGptMessage: moved caret down to file.caret.index=" + file.caret.index + " eof=" + file.caret.eof + " empty?" + file.rowIsEmpty() );

				if(file.caret.eof) {
					file.insertLineBreak();
					break;
				}
				else if(!file.rowIsEmpty()) {
					file.insertLineBreak();
					break;
				}
			}
			firstMessage = false;
		}

		msg = stripIndentation(msg);

		if(file.caret.eof) {
			//console.log("chatGpt:chatGptMessage: Using file.write to write msg=" + UTIL.lbChars(msg));
			file.write(msg, false);
		}
		else {
			file.insertText(msg);
			//console.log("chatGpt:chatGptMessage: Using file.insertText to write msg=" + UTIL.lbChars(msg));
		}

		EDITOR.renderNeeded();
	}

	var afterNewLine = false;
	var inStringLiteral = false;
	function stripIndentation(str) {
		var stripped = "";
		for (var i=0; i<str.length; i++) {
			if(str[i] == "\n") {
				afterNewLine = true;
				stripped += str[i];
				continue;
			}

			if(str[i] == "`" && str[i-1] != "\\") {
				if(inStringLiteral) inStringLiteral = false;
				else inStringLiteral = true;
			}

			if(afterNewLine && !inStringLiteral && (str[i] == " " || str[i] == "\t")) continue;

			stripped += str[i];
			afterNewLine = false;
		}

		//console.log("chatGpt:stripIndentation: str=" + UTIL.lbChars(str) + "\n stripped=" + UTIL.lbChars(stripped));

		return stripped;
	}


	function insideComment(file, caret) {
		var parsed = file.parsed;

		//console.log("chatGpt: insideComment: parsed? + " + !!parsed);

		if(!parsed) return null;

		var comments = parsed.comments;

		var index = caret.index;

		//console.log("chatGpt: insideComment: comments.length=" + comments.length);

		for (var i=0; i<comments.length; i++) {
			//console.log("chatGpt: insideComment: comments[" + i + "].end=" + comments[i].end + " comments[" + i + "].start=" + comments[i].start + "  index=" + index + "");
			if(comments[i].end >= index && comments[i].start < caret.index) {
				//console.log("chatGpt: insideComment: is inside !");
				return true;
			}
		}

		return false;
	}

})();
