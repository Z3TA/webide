#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	
	Creates bundle.htm with all JavaScript's inlinded
	Don't bother inlining the CSS file, or we would have to change all resource paths (fonts etc)
	
*/




var fs = require("fs");
var bundle = fs.readFileSync("client/index.htm", "utf8");

// Remove tests
bundle = bundle.replace(/<!-- BEGIN TESTS -->[\s\S]+<!-- END TESTS -->/mg, "");

// Make it cache-able
bundle = bundle.replace(/<!-- BEGIN NOCACHE -->[\s\S]+<!-- END NOCACHE -->/mg, "");

// Find scripts
var reScripts = /<script.*src="(.*)"><\/script>/g;
var scripts = [];
var arr;
while ((arr = reScripts.exec(bundle)) !== null) {
	scripts.push({tag: arr[0], src: "client/" + arr[1]})
}

// Find stylesheets
// <link rel="stylesheet" type="text/css" href="gfx/style.css">
var reStylesheets = /<link.*stylesheet.*href="(.*)">/g;
var stylesheets = [];
var arr;
while ((arr = reStylesheets.exec(bundle)) !== null) {
	stylesheets.push({tag: arr[0], href: "client/" + arr[1]})
}

	var counter = 0;
	scripts.forEach(inlineScript);
	stylesheets.forEach(inlineStylesheet);
	
	function inlineStylesheet(stylesheet) {
		var fs = require("fs");
	fs.readFile(stylesheet.href, "utf8", function readStylesheet(err, content) {
			if(err) throw err;
			
		console.log(stylesheet.tag);
			
			// Any $ dollar sign will do weird stuff in JavaScript's string replace, here's a workaround:
			bundle = bundle.replace(stylesheet.tag, function(){return '<style>\n' + content + '\n</style>\n'});
			
		// Do we have to wrap style code in <!-- --> html comments !?
		
		if(++counter == (scripts.length + stylesheets.length)) done();
			
		});
	}
	
	function inlineScript(script) {
		var UglifyJS = require("uglify-js");
		var fs = require("fs");
		fs.readFile(script.src, "utf8", function readScript(err, content) {
			if(err) throw err;
			
		if(content.indexOf("!DO:NOT:BUNDLE!") == -1) {
			
			content = content.replace(/<\/script>/g, "<\\/script>");
		content = content.replace(/<\/style>/g, "<\\/style>");
		
		content = content.replace(/(["'"])(.*)<style/g, "$1$2<st$1 + $1yle");
		content = content.replace(/(["'"])(.*)<\/style/g, "$1$2</st$1 + $1yle");
		
		content = remveAllBetween(content, "// TEST-CODE-START", "// TEST-CODE-END");
		
			var result = UglifyJS.minify(content, {
			keep_fnames: true, // prevent errors like: "Please give the event listener function a name!"
			compress:{
				pure_funcs: [ 'console.log', 'console.warn' ] // Removed if the function's return value aren't used
			},
			toplevel: false // if set to true it will also rename global variables
		});
			if (result.error) {
			console.log(content);
			throw new Error("Problem minifying " + script.src + ": " + result.error);
			
				//throw result.error;
			}
			var minifiedJs = result.code;
			
			console.log(script.tag);
			
			// Any $ dollar sign will do weird stuff in JavaScript's string replace, here's a workaround:
			
			bundle = bundle.replace(script.tag, function(){return '<script><!--\n' + minifiedJs + '\n--></script>\n'});
			
			
			// not minified:
			//bundle = bundle.replace(script.tag, function(){return '<script><!--\n' + content + '\n--></script>\n'});
			
			//bundle = bundle.replace(script.tag, '\n<!-- ' + script.src + ' --><script>console.log("' + script.src + '");</script>\n');
		}
		else {
			// Remove the script
			bundle = bundle.replace(script.tag, "");
		}
		
		if(++counter == (scripts.length + stylesheets.length)) done();
		
	});
}

function done() {
	var fs = require("fs");
	fs.writeFileSync("client/bundle.htm", bundle, "utf8");
	
	console.log(counter + " files concatenated into bundle.htm");
	
}

function remveAllBetween(text, startStr, endStr) {
	
	var start = text.indexOf(startStr);
	var end = text.indexOf(endStr);
	
	while (start != -1 && end != -1) {
		
		text = text.slice(0, start) + text.slice(end+endStr.length);
		
		start = text.indexOf(startStr);
		end = text.indexOf(endStr);
	}
	
	return text;
}


//console.log(JSON.stringify(scripts, null, 2));
