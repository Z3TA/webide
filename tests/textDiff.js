/*
	Test the textDiff function in global.js
	
*/

editor.addTest(function textDiff1(callback) {
	
	var diff = textDiff(
	"hello world\nthis is line two\nthis is line three\n", 
	"hello world\nthis is line two and it has changed\nthis is line three\n}");
	
	if(diff.removed[0][0] != "this is line two") throw new Error("Expected line two to be removed");
	if(diff.inserted[0][0] != "this is line two and it has changed") throw new Error("Expected line two to be inserted");
	
	callback(true);
	
}, 1);
