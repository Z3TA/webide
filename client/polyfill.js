/*
	
	Make sure the client (browser) supports these ...
	
*/

	if (!Array.isArray) {
	Array.isArray = function(arg) {
	return Object.prototype.toString.call(arg) === '[object Array]';
	};
	}
	