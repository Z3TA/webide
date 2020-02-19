#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	
	Removes all JavaScript from index.htm and replaces the JS with !SCRIPTS_HERE!
	Then saves as client/bundle.htm, and saves all JS files in bundle.js
	
	Useful when testing all JS files using Google closure compiler, or other error checking tools. Example:
	npx google-closure-compiler --js=bundle.js --js_output_file=bundle.js.min --env BROWSER --language_in ECMASCRIPT5_STRICT --compilation_level ADVANCED
	
	Unfortunately we can not compress method names because some functions asumes certain object properties.
	And name of functions need to be unique when passed to event listeners.
	
	bundle.js can be inserted into client/bundle.js using replaceStringInFileWithContentOfFile.js Example:
	./replaceStringInFileWithContentOfFile.js '!SCRIPTS_HERE!' client/bundle.htm bundle.js.ugly
	
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
var reStylesheets = /<link.*stylesheet.*href="(.*)" *?\/?>/g;
var stylesheets = [];
var arr;
while ((arr = reStylesheets.exec(bundle)) !== null) {
	stylesheets.push({tag: arr[0], href: "client/" + arr[1]})
}

	var counter = 0;
var scriptCounter = 0;
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
	var fs = require("fs");
		fs.readFile(script.src, "utf8", function readScript(err, content) {
			if(err) throw err;
			
			content = content.replace(/<\/script>/g, "<\\/script>");
		content = content.replace(/<\/style>/g, "<\\/style>");
		
		content = content.replace(/(["'"])(.*)<style/g, "$1$2<st$1 + $1yle");
		content = content.replace(/(["'"])(.*)<\/style/g, "$1$2</st$1 + $1yle");
		
		content = remveAllBetween(content, "// TEST-CODE-START", "// TEST-CODE-END");
		
		script.content = content;
		
			console.log(script.tag);
			
			// Any $ dollar sign will do weird stuff in JavaScript's string replace, here's a workaround:
			
			//bundle = bundle.replace(script.tag, function(){return '<script><!--\n' + minifiedJs + '\n--></script>\n'});
			
		if(++scriptCounter == scripts.length) bundle = bundle.replace(script.tag, "!SCRIPTS_HERE!");
		else bundle = bundle.replace(script.tag, "");
		
			// not minified:
			//bundle = bundle.replace(script.tag, function(){return '<script><!--\n' + content + '\n--></script>\n'});
			
			//bundle = bundle.replace(script.tag, '\n<!-- ' + script.src + ' --><script>console.log("' + script.src + '");</script>\n');
			
		if(++counter == (scripts.length + stylesheets.length)) done();
			
		});
	}
	
	function done() {
	
	// Concatenate all JS files
	var scriptSource = "";
	for (var i=0; i<scripts.length; i++) {
		scriptSource += scripts[i].content + "\n\n";
	}
	
	var fs = require("fs");
	
	fs.writeFileSync("bundle.js", scriptSource, "utf8"); // Use Google closure compiler or other static checker to check this file
	
	if(1==1) {
		console.log("Minifying JavaScript ...");
		var UglifyJS = require("uglify-js");
		var result = UglifyJS.minify(scriptSource, {
			keep_fnames: true, // true prevent errors like: "Please give the event listener function a name!"
		compress:{
		pure_funcs: [ 'console.log', 'console.warn' ], // Removed if the function's return value aren't used
				passes: 2
		},
			toplevel: true, // if set to true it will also rename global variables
			mangle: {
				toplevel: true,
				properties: false,
				keep_fnames: true
			}
		});
		
		if (result.error) {
		throw result.error;
		}
		scriptSource = result.code;
	}
	
	// Append all the scripts to the bundle
	// Any $ dollar sign will do weird stuff in JavaScript's string replace, here's a workaround:
	bundle = bundle.replace("!SCRIPTS_HERE!", function(){return '<script type="application/javascript">\n\n' + scriptSource + '\n</script>\n'});
	
	
	if(1==1) {
		console.log("Minify the bundle ...");
		var minify = require('html-minifier').minify;
		var result = minify(bundle, {
			removeComments: true,
			collapseWhitespace: true,
			
			minifyCSS: true,
			minifyJS: {
				keep_fnames: true, // prevent errors like: "Please give the event listener function a name!"
				compress:{
					pure_funcs: [ 'console.log', 'console.warn' ] // Removed if the function's return value aren't used
				},
				toplevel: true
			},
			
			//processScripts: ["application/javascript"],
			removeEmptyAttributes: true,
			removeRedundantAttributes: true,
			removeScriptTypeAttributes: true,
			removeStyleLinkTypeAttributes: true
			
		});
		fs.writeFileSync("client/bundle.htm", result, "utf8");
	}
	else {
		fs.writeFileSync("client/bundle.htm", bundle, "utf8");
	}
	
	
	
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
