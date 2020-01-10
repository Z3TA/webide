/*
	This file need to run first in order to recrod JS errors.
	It can't capture syntax errors in this file, but it can capture syntax errors in fies that load after it!
	
*/
var JAVASCRIPT_ERRORS = [];

(function captureErrors() {
	"use strict";
	
	window.onerror = function captureError(message, source, lineno, colno, error) {
		
		//alert("Error: " + message);
		
		JAVASCRIPT_ERRORS.push({
			message: message,
			source: source,
			lineno: lineno,
			colno: colno,
			error: error
		});
		
		if(typeof console == "object") {
			if(typeof console.warn == "function") console.warn("Error detected! message=" + message + " source=" + source + " lineno=" + lineno + " colno=" + colno + "");
			if(typeof console.error == "function") console.error(error);
			else alert("Error: " + message);
		}
		
	}
	
})();

