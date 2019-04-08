#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

var UglifyJS = require("uglify-js");
var fs = require("fs");

fs.readFile("./bin/jzeditr", "utf8", function readScript(err, content) {
	if(err) throw err;

var result = UglifyJS.minify(content, {
		keep_fnames: false,
		compress:{
			pure_funcs: [ 'console.log', 'console.warn' ]
		}
	});
	if (result.error) {
		console.log(content);
		throw new Error("Problem minifying " + script.src + ": " + result.error);
		
		//throw result.error;
	}
	var minifiedJs = result.code;

console.log(minifiedJs);

 });
