/*
	
	This file contains global variables.
	
	Global functions:
	- editor (EDITOR.js)
	- File (File.js)
	- Dialog, alertBox, confirmBox, promptBox (Dialog.js)
	- SockJS (sockjs-0.3.4.js)

*/

"use strict";

var RUNTIME = (function getRuntime() {
	if(typeof require != "undefined" && typeof require('nw.gui') !== "undefined") return "nw.js";
	else return "browser";
})();

console.log("RUNTIME=" + RUNTIME);

// With a web-app-manifest, users can add the app to home screen!
// https://developers.google.com/web/fundamentals/web-app-manifest/
var DISPLAY_MODE = "browser";
// detect if the display-mode is standalone from JavaScript:
if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
	console.log('display-mode is standalone');
	DISPLAY_MODE = "standalone";
}

// To determine if the app was launched in standalone mode in Safari,
if (window.navigator.standalone === true) {
	console.log('display-mode is standalone');
	DISPLAY_MODE = "standalone";
}


var __dirname;
if(RUNTIME != "nw.js") {
	//alert("RUNTIME=" + RUNTIME);
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
else if(RUNTIME == "nw.js") {
	// Hack to make nw.js return the correct __dirname
	__dirname = require("dirname");
}


var QUERY_STRING = function () {
	// Self calling function to not clutter global scope
	var query_string = {};
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i=0;i<vars.length;i++) {
	var pair = vars[i].split("=");
		// If first entry with this name
	if (typeof query_string[pair[0]] === "undefined") {
	  query_string[pair[0]] = decodeURIComponent(pair[1]);
		// If second entry with this name
	} else if (typeof query_string[pair[0]] === "string") {
	  var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
	  query_string[pair[0]] = arr;
		// If third or later entry with this name
	} else {
	  query_string[pair[0]].push(decodeURIComponent(pair[1]));
	}
  } 
  return query_string;
}();



Error.stackTraceLimit = Infinity;


// Global constants, note that const is block scoped!! (can't if(foo) const bar =1)
// Don't use const just yet (not all browsers support it)'
var SHIFT = 1;
var CTRL = 2;
var ALT = 4;

// So we can be more explicit and avoid "type" errors
var SUCCESS = true;
var FAIL = false;
var PREVENT_DEFAULT = false;
var ALLOW_DEFAULT = true;

