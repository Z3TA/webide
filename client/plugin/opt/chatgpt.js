/*

*/

var order = 1500;

EDITOR.plugin({
	desc: "Use ChatGPT for code completions",
	load: function loadChatGPT() {
		console.log("chatGpt: !loadChatGPT");
		CLIENT.on("chatGpt", chatGptMessage);
		EDITOR.on("autoComplete", chatGptComplete, order);

	},
	unload: function unloadChatGPT() {
		console.log("chatGpt: !unloadChatGPT");
		CLIENT.removeEvent("chatGpt", chatGptMessage);

		EDITOR.removeEvent("autoComplete", chatGptComplete);

	}
});

// 

function chatGptComplete(file, wordToComplete, wordLength, gotOptions, autocompleteCb) {
	console.log("chatGpt: chatGptComplete: wordToComplete=" + wordToComplete);

	if( !insideComment(file, file.caret) ) {
		console.log("chatGpt: chatGptComplete: Not inside a comment!");
		return;
	}

	// Give some context !?
	// max 2048 characters !?
	var maxLen = 2048;

	console.log("chatGpt: file.caret.index=" + file.caret.index  + " maxLen=" + maxLen);
	if(file.caret.index > maxLen) {
		var text = rowText(file.caret.row, false);
		var len = text.length;
		var indent = file.rowIndentationLevel(file.caret.row);
		for (var row=file.caret.row, rowText; row>0; i--) {
			rowText = rowText(row, false);
			len += rowText.length;
			len += file.lineBreak.length;
			console.log("chatGpt: len=" + len);

			if(len >= maxLen) break;

			rowIndent = file.rowIndentationLevel(row);

			if( rowIndent != indent ) break;

			indent = rowIndent;
			text = rowText + file.lineBreak + text;
			console.log("chatGpt: text.length=" + text.length);
		}
	}
	else {
		var text = file.text.slice(0, file.caret.index);
	}

	var json = {
		msg: text
	};

	console.log("chatGpt: text.length=" + text.length + " maxLen=" + maxLen + " text=" + text);

	CLIENT.cmd("chatgpt.complete", json, function (err, resp) {

		if(err) {
			console.log("chatGpt: error: " + err.message);
		}

		console.log("chatGpt: resp=" + JSON.stringify(resp, null, 2));

		//autocompleteCb([result]);
	});

	return {async: true};

}

function chatGptMessage(msg) {

	console.log("chatGpt: chatGptMessage: msg=" + msg);

}


function insideComment(file, caret) {
	var parsed = file.parsed;

	console.log("chatGpt: insideComment: parsed? + " + !!parsed);

	if(!parsed) return null;

	var comments = parsed.comments;

	var index = caret.index;

	console.log("chatGpt: insideComment: comments.length=" + comments.length);

	for (var i=0; i<comments.length; i++) {
		console.log("chatGpt: insideComment: comments[" + i + "].end=" + comments[i].end + " comments[" + i + "].start=" + comments[i].start + "  index=" + index + "");
		if(comments[i].end >= index && comments[i].start < caret.index) {
			console.log("chatGpt: insideComment: is inside !");
			return true;
		}
	}

	return false;
}

// 
