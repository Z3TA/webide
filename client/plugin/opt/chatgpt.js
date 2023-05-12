/*

*/

var order = 1500;

EDITOR.plugin({
	desc: "Use ChatGPT for code completions",
	load: function loadChatGPT() {

		CLIENT.on("chatGpt", chatGptMessage);
		EDITOR.on("autoComplete", chatGptComplete, order);

	},
	unload: function unloadChatGPT() {
		CLIENT.removeEvent("chatGpt", chatGptMessage);

		EDITOR.removeEvent("autoComplete", chatGptComplete);

	}
});

function chatGptComplete(file, wordToComplete, wordLength, gotOptions, autocompleteCb) {
	console.log("chatGpt: chatGptComplete: wordToComplete=" + wordToComplete);

	if( insideComment(file, caret) ) {
		console.log("chatGpt: chatGptComplete: Not inside a comment!");
		return;
	}

	// Give some context !?
	// max 2048 characters !?
	var maxLen = 2048;

	if(file.caret.index > maxLen) {
		var text = rowText(file.caret.row, false);
		var len = text.length;
		var indent = file.rowIndentationLevel(file.caret.row);
		for (var row=file.caret.row, rowText; row>0; i--) {
			rowText = rowText(row, false);
			len += rowText.length;
			if(len > maxLen) break;
			rowIndent = file.rowIndentationLevel(row);
			if( rowIndent != indent ) break;
			indent = rowIndent;
			text = rowText + file.lineBreak + text;
		}
	}
	else {
		var text = file.text.slice(file.caret.index);
	}

	var json = {
		msg: text;
	};

	CLIENT.cmd("chatgpt", json, function (err, resp) {

		autocompleteCb([result]);
	});

	return {async: true};

}

function chatGptMessage(msg) {

	console.log("chatGpt: chatGptMessage: msg=" + msg);

}


function insideComment(file, caret) {
	var parsed = file.parsed;
	if(!parsed) return null;

	var comments = parsed.comments;

	var index = caret.index;

	for (var i=0; i<comments.length; i++) {
		if(comments[i].end > index && comments[i].start < caretIndex) {
			return true;
		}
	}

	return false;
}
