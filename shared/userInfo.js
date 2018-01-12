/*
	
	Gets user info homeDir, uid, gid
	
*/

var UTIL = require("../client/UTIL.js");

var etcPasswdPath = "/etc/passwd";

module.exports = function userInfo(username, callback) {

	if(typeof username != "string") throw new Error("First argument username=" + username + " should be the username!");
	if(typeof callback != "function") throw new Error("Second argument callback=" + callback + " should a callback function!");
	
	var fs = require("fs");
	fs.readFile(etcPasswdPath, "utf8", function readPwFile(err, etcPasswd) {
		
		if(err) {
			callback(err);
		}
		else {
			// format: testuser2:x:1001:1001:Test user 2,,,:/home/testuser2:/bin/bash
			var rows = etcPasswd.trim().split("\n");
			var userFound = false;
			for(var i=0, row, pName, pUid, pGid, pDir, pShell; i<rows.length; i++) {
				row = rows[i].trim().split(":");
				pName = row[0];
				pUid = parseInt(row[2]);
				pGid = parseInt(row[3]);
				pDir = UTIL.trailingSlash(row[5]);
				pShell = row[6];
				
				if(pName == username) {
					userFound = true;
					callback(null, {name: pName, uid: pUid, gid: pGid, homeDir: pDir, shell: pShell});
					break;
				}
				}
			
			if(!userFound) callback(new Error("username=" + username + " not found in " + etcPasswdPath));
			
		}
		
	});
	
}
