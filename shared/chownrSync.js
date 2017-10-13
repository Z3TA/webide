
function chownrSync(p, uid, gid) {
	//console.log("chown uid=" + uid + " gid=" + gid + " p=" + p);
	var fs = require('fs');
	var stats = fs.lstatSync(p);
	var chownrDirSync = require("./chownrDirSync.js");
	
	if (stats.isSymbolicLink()) return;
	if (stats.isDirectory()) return chownrDirSync(p, uid, gid);
	else return fs.chownSync(p, uid, gid);
}

module.exports = chownrSync;
