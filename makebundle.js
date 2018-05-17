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
			
		bundle = bundle.replace(stylesheet.tag, function(){return '<style><!--\n' + content + '\n--></style>\n'});
			
		if(++counter == (scripts.length + stylesheets.length)) done();
			
		});
	}
	
	function inlineScript(script) {
		var UglifyJS = require("uglify-js");
		var fs = require("fs");
		fs.readFile(script.src, "utf8", function readScript(err, content) {
			if(err) throw err;
			
			content = content.replace(/<\/script>/g, "<\\/script>");
		content = content.replace(/<\/style>/g, "<\\/style>");
		
		content = content.replace(/(["'"])(.*)<style/g, "$1$2<st$1 + $1yle");
		content = content.replace(/(["'"])(.*)<\/style/g, "$1$2</st$1 + $1yle");
		
		
			var result = UglifyJS.minify(content, {keep_fnames: true});
			if (result.error) {
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
			
		if(++counter == (scripts.length + stylesheets.length)) done();
			
		});
	}
	
	function done() {
		var fs = require("fs");
		fs.writeFileSync("client/bundle.htm", bundle, "utf8");
		
		console.log(counter + " files concatenated into bundle.htm");
		
	}
	
	
	
	//console.log(JSON.stringify(scripts, null, 2));
