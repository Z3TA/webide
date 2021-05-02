/*
	
	This file contains global variables.
	
	Global functions:
	- editor (EDITOR.js)
	- File (File.js)
	- Dialog, alertBox, confirmBox, promptBox (Dialog.js)
	- SockJS (sockjs-0.3.4.js)

*/

"use strict";

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

if('connection' in navigator && navigator.connection.saveData) {
	var SAVE_BANDWIDTH = true;
}
else {
var SAVE_BANDWIDTH = false;
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

var BROWSER = UTIL.checkBrowser();

// Browsers work differently depending on which platofrm they are running ...
var MSIE = (BROWSER.indexOf("MSIE") == 0); // If we are on Internet Explorer
var MSWIN = (process.platform == "win32"); // If we are on Windows (any version)
var LINUX = (process.platform == "linux"); // If we are on Linux
var MAC = (navigator.platform.indexOf("Mac") != -1); // If we are on a Mac(book)
var CHROMEBOOK = (navigator.userAgent.indexOf("CrOS") != -1);
var FIREFOX = (navigator.userAgent.toLowerCase().indexOf('firefox') > -1);

// Global constants, note that const is block scoped!! (can't if(foo) const bar =1)
// Don't use const just yet (not all browsers support it)'
var SHIFT = 1;
var CTRL = 2;
var ALT = 4;
var META = 8; // Windows key or Command key

// So we can be more explicit and avoid "type" errors
var SUCCESS = true;
var FAIL = false;
var PREVENT_DEFAULT = false;
var ALLOW_DEFAULT = true;
var HANDLED = true;
var PASS = false;

// Error level/types
var ERROR = 1;
var WARNING = 2;
var INFO = 3;

var LOCALE = QUERY_STRING["locale"] || ((navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language) || "en";

function S(key, values, locale) {
	
	if(locale == undefined) locale = LOCALE;
	
	if(!LANG.hasOwnProperty(locale)) {
		//alertBox("locale=" + locale + " not yet supported. English (en) will be used.");
		locale = LOCALE = "en";
	}
	
	if(!LANG.hasOwnProperty(locale)) return key + "!NO-LOCALES-LOADED!";
	
	if(!LANG[locale].hasOwnProperty(key) && LANG[locale].hasOwnProperty(key.toLowerCase())) key = key.toLowerCase();
	
	if(!LANG[locale].hasOwnProperty(key)) {
		
		var data = {
			meddelande: "locale=" + locale + "\nLOCALUE=" + LOCALE + "\nkey=" + key + "\nvalues=" + values + "\nStack=" + UTIL.getStack(key), 
			namn: 'WebIDE', 
			subject: "No tranlsation for " + key + " in " + LOCALE,
			robot: "42"
		}
		UTIL.httpPost("https://www.webtigerteam.com/mailform.nodejs", data, function (err, respStr) {});
		if(locale == "en") return key + "!MISSING-TRANSLATION!";
		else if(LANG.__altLocale && locale != LANG.__altLocale) {
			//console.warn("Trying " +  LANG.__altLocale + " for key=" + key);
			return S(key, values, LANG.__altLocale);
		}
		else {
			//console.warn("Trying en for key=" + key);
			return S(key, values, "en");
		}
	}
	
	var str = LANG[locale][key];
	
	if(values) {
		for(var i=0; i<values.length; i++) {
			str = str.replace("$" + (i+1), values[i]);
		}
	}
	
	return str;
}

var LANG = {};


Error.stackTraceLimit = Infinity;
