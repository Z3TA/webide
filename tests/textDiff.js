/*
	Test the textDiff function in global.js
	
*/

editor.addTest(function testTextDiff(callback) {
	
	// One line changed
	var diff = textDiff(
	"hello world\nthis is line two\nthis is line three\n", 
	"hello world\nthis is line two and it has changed\nthis is line three\n}");
	
	if(diff.removed[0].text != "this is line two") throw new Error("Expected line two to be removed");
	if(diff.inserted[0].text != "this is line two and it has changed") throw new Error("Expected line two to be inserted");
	
	diff = textDiff("a\nb\nc\nd", "1\n2\n3\na\nb\nc\nd\n4\n5\n6");
	
	if(diff.inserted.length != 6) throw new Error("Expected 6 insertions, diff.inserted.length=" + diff.inserted.length);
	
	// Stuff added before and after the original text
	if(! ((diff.inserted[0].text == "1" && diff.inserted[0].row == 0) &&
	(diff.inserted[1].text == "2" && diff.inserted[1].row == 1) &&
	(diff.inserted[2].text == "3" && diff.inserted[2].row == 2) &&
	(diff.inserted[3].text == "4" && diff.inserted[3].row == 7) &&
	(diff.inserted[4].text == "5" && diff.inserted[4].row == 8) &&
	(diff.inserted[5].text == "6" && diff.inserted[5].row == 9)) ) throw new Error("Unexpected diff.inserted=" + JSON.stringify(diff.inserted, null, 2));
	
	
	// Some lines have been removed in the middle
	
	diff = textDiff("A\nB\nC\nD", "A\nD");
	
	if(diff.inserted.length > 0) throw new Error("Did not expect any inserted lines. diff=" + JSON.stringify(diff, null, 2));
	
	if(diff.removed.length != 2) throw new Error("Expected 2 lines to be removed, not " + diff.removed.length + ". diff=" + JSON.stringify(diff, null, 2));
	
	if(! ((diff.removed[0].text == "B" && diff.removed[0].row == 1) &&
	(diff.removed[1].text == "C" && diff.removed[1].row == 2)) ) throw new Error("Unexpected diff.removed=" + JSON.stringify(diff.removed, null, 2));
	
	
	// Lines have been removed and some lines changed (ex: select + delete)
	
	diff = textDiff("ABCD\nEFGH\nIJKL\nMNOP\nQRST", "ABCD\nEF\nOP\nQRST");
	
	if(diff.inserted.length != 2) throw new Error("Expected 2 lines to be inserted, not " + diff.inserted.length + ". diff=" + JSON.stringify(diff, null, 2));
	
	// Still working on this test! ...
	
	if(! ((diff.inserted[0].text == "EF" && diff.removed[0].row == 1) &&
	(diff.removed[1].text == "C" && diff.removed[1].row == 2)) ) throw new Error("Unexpected diff.removed=" + JSON.stringify(diff.removed, null, 2));
	
	if(diff.removed.length != 3) throw new Error("Expected 3 lines to be removed, not " + diff.removed.length + ". diff=" + JSON.stringify(diff, null, 2));
	
	if(! ((diff.removed[0].text == "B" && diff.removed[0].row == 1) &&
	(diff.removed[1].text == "C" && diff.removed[1].row == 2)) ) throw new Error("Unexpected diff.removed=" + JSON.stringify(diff.removed, null, 2));
	
	
	callback(true);
	
}, 1);
