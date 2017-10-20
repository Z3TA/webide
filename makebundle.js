#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	
	Creates bundle.htm with all JavaScript's inlinded
	Don't bother inlining the CSS file, or we would have to change all resource paths (fonts etc)
	
*/




var fs = require("fs");
var bundle = fs.readFileSync("client/index.htm", "utf8");

// Find scripts
var reScripts = /<script.*src="(.*)"><\/script>/g;
var scripts = [];
var arr;
while ((arr = reScripts.exec(bundle)) !== null) {
	scripts.push({tag: arr[0], src: "client/" + arr[1]})
}

var counter = 0;
scripts.forEach(inlineScript);



function inlineScript(script) {
	var UglifyJS = require("uglify-js");
	var fs = require("fs");
	fs.readFile(script.src, "utf8", function readScript(err, content) {
		if(err) throw err;
		
		var result = UglifyJS.minify(content, {keep_fnames: true});
		if (result.error) {
			throw new Error("Problem minifying " + script.src + ": " + result.error);
			//throw result.error;
		}
		var minifiedJs = result.code;
		
		console.log(script.tag);
		
		//if(minifiedJs.length < 1) throw minifiedJs;
		
		//if(bundle.indexOf(script.tag) == -1) throw new Error("Can't find " + script.tag + " in bundle!");
		
		//bundle = bundle.replace(script.tag, '\n<!-- ' + script.src + ' --><script>' + minifiedJs + '</script>\n');
		
		// Any $ dollar sign will do weird stuff in JavaScript's string replace, here's a workaround:
		//bundle = bundle.replace(script.tag, function(){return '\n<!-- ' + script.src + ' --><script>' + minifiedJs + '</script>\n'});
		bundle = bundle.replace(script.tag, function(){return '<script>' + minifiedJs + '</script>\n'});
		
		//bundle = bundle.replace(script.tag, '\n<!-- ' + script.src + ' --><script>console.log("' + script.src + '");</script>\n');
		
		if(++counter == scripts.length) done();
		
	});
}

function done() {
	var fs = require("fs");
	fs.writeFileSync("client/bundle.htm", bundle, "utf8");
	
}



//console.log(JSON.stringify(scripts, null, 2));
