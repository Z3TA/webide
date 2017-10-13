
function chmodrSync (p, mode) {
	// https://github.com/isaacs/chmodr/
	//console.log("chmod mode=" + mode + " p=" + p);
	var fs = require('fs');
	var chmodrDirSync = require("./chmodrDirSync.js");
	var stats = fs.lstatSync(p)
	if (stats.isSymbolicLink()) return;
	if (stats.isDirectory()) return chmodrDirSync(p, mode);
	else return fs.chmodSync(p, mode);
}

module.exports = chmodrSync;
