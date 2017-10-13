

function chownrDirSync(p, uid, gid) {
	//console.log("chown dir uid=" + uid + " gid=" + gid + " p=" + p);
	var fs = require('fs');
	var path = require('path');
	var chownrSync = require("./chownrSync.js");
	
	fs.readdirSync(p).forEach(function (child) {
		chownrSync(path.resolve(p, child), uid, gid);
	});
	return fs.chownSync(p, uid, gid);
}

module.exports = chownrDirSync;
