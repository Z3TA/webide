/*
	
	Make sure the client (browser) supports these ...
	
*/

if(typeof console == "undefined") console = {};
if(typeof console.log == "undefined") console.log = function() {};
if(typeof console.error == "undefined") console.error = function() {};

	if (!Array.isArray) {
	Array.isArray = function(arg) {
	return Object.prototype.toString.call(arg) === '[object Array]';
	};
	}
