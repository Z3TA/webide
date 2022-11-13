#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	
	Creates opt.bundle.js with all optional plugins bundled and minified
	
*/

var fs = require("fs");

var files = [];
var optPath = "client/plugin/opt/";
var fileList = fs.readdirSync(optPath);

fileList.forEach(function (fileName) {
	var filePath = optPath + fileName;
	var stat = fs.statSync(filePath);

	if(stat.isDirectory()) {
		filePath = optPath + fileName + "/" + fileName + ".js";
		files.push(filePath);
	}

	files.push(filePath);
	
});

var bundle = '"use strict";\n';
var UglifyJS = require("uglify-js");

files.forEach(function bundleFile(filePath) {

	var content = fs.readFileSync(filePath, "utf8");

	if(content.indexOf("!DO:NOT:BUNDLE!") != -1) return;

	content = content.replace(/"use strict";/, ""); // We use a global "use strict"

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
		throw new Error("Problem minifying " + filePath + ": " + result.error);

		//throw result.error;
	}
	var minifiedJs = result.code;

	bundle = bundle + minifiedJs + "\n";

	// Any $ dollar sign will do weird stuff in JavaScript's string replace, here's a workaround:
	//bundle = bundle.replace(script.tag, function(){return '<script><!--\n' + minifiedJs + '\n--></script>\n'});

	// not minified:
	//bundle = bundle.replace(script.tag, function(){return '<script><!--\n' + content + '\n--></script>\n'});

	//bundle = bundle.replace(script.tag, '\n<!-- ' + script.src + ' --><script>console.log("' + script.src + '");</script>\n');

});

fs.writeFileSync("client/plugin/opt.bundle.js", bundle, "utf8");


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


