(function() {
	"use strict";

	return; // vbScript/Classic ASP files are currently opened as plain text until issues with indentation is fixed!

	EDITOR.addTest(function remInVbVar(callback) {
		EDITOR.openFile("remInVbVar.asp", '<%\nstrRemoteIP = Request.ServerVariables("HTTP_X_REAL_IP")\n%>\n', function(err, file) {

			// console.log("file.parsed.comments=" + JSON.stringify(file.parsed.comments, null, 2));

			var comment = file.parsed.comments[0];

			if(comment) throw new Error("Did not expect a comment at " + JSON.stringify(comment));

			EDITOR.closeFile(file.path);
			callback(true);

		});
	});

	EDITOR.addTest(function vbHtmlTagParser(callback) {
		EDITOR.openFile("vbHtmlTagParser.asp", '<%\n"<"\nfoo\n"<div id=""foo"">"\n%>', function(err, file) {

			console.log("file.parsed.xmlTags=" + JSON.stringify(file.parsed.xmlTags, null, 2));

			if(file.parsed.xmlTags.length != 1) throw new Error("Expecte only one xml tag. file.parsed.xmlTags=" + JSON.stringify(file.parsed.xmlTags, null, 2))

			EDITOR.closeFile(file.path);

			callback(true);

		});
	});

	EDITOR.addTest(function vbSingleIfThen(callback) {
		EDITOR.openFile("vbSingleIfThen.asp", '<%\nIF foo THEN bar = 1\n%>\n', function(err, file) {
			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);

			EDITOR.closeFile(file.path);

			callback(true);
		});
	});

	EDITOR.addTest(function vbScripTagsIndention(callback) {
		EDITOR.openFile("vbScripTagsIndention.asp", '<%\nIF b THEN\nIF a THEN\n%>\nhi\n<%\nEND IF\nEND IF\nIF b THEN\nIF a THEN %>\nhi\n<% END IF\nEND IF%>\n<div>\n<%\nIF a THEN\n%>\nfoo\n<%\nEND IF\n%>\n</div>\n', function(err, file) {

			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 2) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 2) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 2) throw new Error("grid[5].indentation=" + grid[5].indentation);
			if(grid[6].indentation != 1) throw new Error("grid[6].indentation=" + grid[6].indentation);
			if(grid[7].indentation != 0) throw new Error("grid[7].indentation=" + grid[7].indentation);

			if(grid[8].indentation != 0) throw new Error("grid[8].indentation=" + grid[8].indentation);
			if(grid[9].indentation != 1) throw new Error("grid[9].indentation=" + grid[9].indentation);
			if(grid[10].indentation != 2) throw new Error("grid[10].indentation=" + grid[10].indentation);
			if(grid[11].indentation != 1) throw new Error("grid[11].indentation=" + grid[11].indentation);
			if(grid[12].indentation != 0) throw new Error("grid[12].indentation=" + grid[12].indentation);

			if(grid[13].indentation != 0) throw new Error("grid[13].indentation=" + grid[13].indentation);
			if(grid[14].indentation != 1) throw new Error("grid[14].indentation=" + grid[14].indentation);
			if(grid[15].indentation != 1) throw new Error("grid[15].indentation=" + grid[15].indentation);
			if(grid[16].indentation != 2) throw new Error("grid[16].indentation=" + grid[16].indentation);
			if(grid[17].indentation != 2) throw new Error("grid[17].indentation=" + grid[17].indentation);
			if(grid[18].indentation != 2) throw new Error("grid[18].indentation=" + grid[18].indentation);
			if(grid[19].indentation != 1) throw new Error("grid[19].indentation=" + grid[19].indentation);
			if(grid[20].indentation != 1) throw new Error("grid[20].indentation=" + grid[20].indentation);
			if(grid[21].indentation != 0) throw new Error("grid[21].indentation=" + grid[21].indentation);

			EDITOR.closeFile(file.path);

			callback(true);

		});
	});

	EDITOR.addTest(function vbScripRemInQuote(callback) {
		EDITOR.openFile("vbScripRemInQuote.asp", '<%\n"vbScrip REM in quote"\nnext line\n%>', function(err, file) {

			//console.log("file.parsed.quotes=" + file.parsed.quotes);

			if(file.parsed.comments.length != 0) throw new Error("Did not expect any comment!");

			EDITOR.closeFile(file.path);

			callback(true);

		});
	});

	EDITOR.addTest(function vbScriptTableInStringIndent(callback) {
		EDITOR.openFile("vbScriptTableInStringIndent.asp", '<%\nstr = "<table>"\n%>\n', function(err, file) {

			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 0) throw new Error("grid[2].indentation=" + grid[2].indentation);

			EDITOR.closeFile(file.path);

			callback(true);

		});
	});

	EDITOR.addTest(function vbScriptNestedIfs(callback) {
		EDITOR.openFile("vbScriptNestedIfs.asp", "<%\nIF 1=1 THEN\nIF 2=2 THEN\n\nEND IF\nEND IF\n%>\n ", function(err, file) {

			var grid = file.grid;
			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 2) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);

			EDITOR.closeFile(file.path);

			callback(true);

		});
	});

	EDITOR.addTest(function remVbComment(callback) {
		EDITOR.openFile("remVbComment.asp", "<%\nREM foo\n%>\n ", function(err, file) {

			if(!file.parsed) throw new Error("File was not parsed!");

			if(file.parsed.comments.length == 0) throw new Error("Expected a comment!");

			EDITOR.closeFile(file.path);

			callback(true);

		});
	});

	EDITOR.addTest(function aspVarInScript(callback) {
		// Parser can't find start of baz
		EDITOR.openFile("aspVarInScript.asp", '<%\nIF foo THEN\n%>\n<script>\nalert("Hi <% =name %>");\n</script>\n<%\nEND IF\n%>\n', function(err, file) {

			// Last row should have zero indentation
			if(file.grid[file.grid.length-1].indentation !== 0) throw new Error("Wrong indentation on last row!");

			EDITOR.closeFile(file.path);
			callback(true);

		});
	});

	EDITOR.addTest(function aspVarInHtml(callback) {
		EDITOR.openFile("aspVarInHtml.asp", '<img src="<% =foo %>">', function(err, file) {

			// Temp fix! Best case scenario would be if the xml tag worked

			if(file.parsed.xmlTags.length > 0) throw new Error("Did not expect an xml tag");

			EDITOR.closeFile(file.path);
			callback(true);

		});
	});

	EDITOR.addTest(function vbExitForIndent(callback) {
		// The parser optimizer is unable to find foo() when only parsing foo
		EDITOR.openFile("vbExitForIndent.asp", '<%\nFOR i = 1 TO 3\nIF x = 2 THEN EXIT FOR\nNEXT\n%>\n', function(err, file) {

			var indentationLine4 = file.grid[3].indentation;

			if(indentationLine4 != 0) throw new Error("Expected indentation on line 3 to be zero");

			EDITOR.closeFile(file.path);
			callback(true);

		});
	});


	/*
		From auto_quote.js

		When do we want to do " &  & " ? and when not ?

		not: "<span class="
		not: "<span class=""foo"">"

		do: "<span class=""foo" & bar & "
		do: " hello <b>" & name & "</b>."

	*/
	EDITOR.addTest(function classic_asp_concat(callback) {
		EDITOR.openFile("classic_asp_concat.asp", '<% Response.Write "<span class= </span>" %>', function(err, file) {

			var index = 31;
			file.moveCaret(index);

			var quote = 34; // "
			EDITOR.mock("keypress", {charCode: quote}); // Simulate "

			if(file.text != '<% Response.Write "<span class="" </span>" %>') throw new Error("Did not expect a concatenation");

			EDITOR.closeFile(file.path);
			callback(true);

		});
	});

	EDITOR.addTest(function vbScriptSelectCase(callback) {
		EDITOR.openFile("vbscriptselectcaseindentation.vb", "select case foo\ncase 1\nbar(1)\ncase 2\nbar(2)\nend select\n", function(err, file) {
			// Also indentate each case in a select case
			var grid = file.grid;

			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 0) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);
			if(grid[4].indentation != 1) throw new Error("grid[4].indentation=" + grid[4].indentation);
			if(grid[5].indentation != 0) throw new Error("grid[5].indentation=" + grid[5].indentation);

			EDITOR.closeFile(file.path);

			callback(true);

		});
	});

	EDITOR.addTest(function vbScriptComments(callback) {
		EDITOR.openFile("vbscriptcomments.vb", "if foo then\n' comment\ncall bar\nend if\n", function(err, file) {
			// There was a bug where a comment in VB scrwed up the indentation ...
			var grid = file.grid;

			if(grid[0].indentation != 0) throw new Error("grid[0].indentation=" + grid[0].indentation);
			if(grid[1].indentation != 1) throw new Error("grid[1].indentation=" + grid[1].indentation);
			if(grid[2].indentation != 1) throw new Error("grid[2].indentation=" + grid[2].indentation);
			if(grid[3].indentation != 0) throw new Error("grid[3].indentation=" + grid[3].indentation);

			EDITOR.closeFile(file.path);

			callback(true);

		});
	});

})();




