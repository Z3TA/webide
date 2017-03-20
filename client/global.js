/*
	
	This file contains global variables.
	
	Global functions:
	- editor (EDITOR.js)
	- File (File.js)
	- Dialog, alertBox, confirmBox, promptBox (Dialog.js)
	- SockJS (sockjs-0.3.4.js)

*/

"use strict";

var runtime = (function is_nwjs() {
	try{
		return (typeof require('nw.gui') !== "undefined");
	} catch (e){
		return false;
	}
})() ? "nw.js" : "browser";


var __dirname;
if(runtime == "browser") {
	//alert("runtime=" + runtime);
	var process = {
		platform: (function findPlatForm() {
			var platform = "win32";
			if(navigator.platform == "Win32") platform = "win32";
			if(navigator.platform.indexOf("Linux") != -1) platform = "linux";
			return platform;
		})(),
		cwd: function getWorkingDirectory() {
			return UTIL.getDirectoryFromPath(document.location.href);
		},
		nextTick: function(cb) {
			setTimout(cb, 0);
		},
		argv: (function getArguments() {
			var query = window.location.search.substring(1);
			var arr = query.split('&');
			
			arr.unshift(document.location.href);
			
			return arr;
			
		})()
		
	};
	__dirname = UTIL.getDirectoryFromPath(document.location.href).replace(/(\/|\\)$/, ""); 
	// __dirname in nodejs doesn't have a trailing slash, 
	// but in the editor we want all directories to have a trailing slash, except __dirname
}
else {
	__dirname = require("dirname");
}



Error.stackTraceLimit = Infinity;


// Global constants, note that const is block scoped!! (can't if(foo) const bar =1)
const SHIFT = 1;
const CTRL = 2;
const ALT = 4;



