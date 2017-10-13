
function chmodrDirSync (p, mode) {
	//console.log("chmod dir mode=" + mode + " p=" + p);
	var fs = require('fs');
	var path = require('path');
	var chmodrSync = require("./chmodrSync.js"); // This will be an object (not a function) if required from global/module scope (above/outside this function) 
	
	fs.readdirSync(p).forEach(function (child) {
		chmodrSync(path.resolve(p, child), mode);
	});
	
	// If the folder got read permission, also make sure it has execute permission so we can list it's content
	if(mode.length == 3) {
		for (var i=0; i<3; i++) if(mode.charAt(i) == "4" || mode.charAt(i) == "6") mode = mode.substr(0, i) + (parseInt(mode.charAt(i)) +1) + mode.substr(i+1);
	}
	
	return fs.chmodSync(p, mode);
}

module.exports = chmodrDirSync
