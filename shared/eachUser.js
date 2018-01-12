/*
	
	Finds all jzedit users
	
*/

var UTIL = require("../client/UTIL.js");
var ENCODING = "utf8";

module.exports = function eachUser(HOME, userFoundCb, allFoundCb) {

	if(typeof HOME == "function") throw new Error("The first arg HOME should be the directory holding the users home dirs!");
	
	if(userFoundCb && typeof userFoundCb != "function") throw new Error("Second armgument userFoundCb, if specified, should be a callback function!");
	if(allFoundCb && typeof allFoundCb != "function") throw new Error("Third armgument allFoundCb, if specified, should be a callback function!");
	
	var users = {};
	var usersToCheck = 0;
		var fs = require("fs");
		
	var etcPasswPath = "/etc/passwd";
	
	fs.readFile(etcPasswPath, "utf8", function readPwFile(err, etcPasswd) {
			
			if(err) {
			throw err;
			}
			else {
				// format: testuser2:x:1001:1001:Test user 2,,,:/home/testuser2:/bin/bash
				var rows = etcPasswd.trim().split("\n");
				
				for(var i=0, row; i<rows.length; i++) {
					row = rows[i].trim().split(":");
					mapUser(row);
				}
			
			fs.readdir(HOME, function (err, homeDirs) {
				if(err) throw err;
				// Check each home-dir for .jzeditpw file
				for (var i=0; i<homeDirs.length; i++) {
					usersToCheck++;
					checkPw(homeDirs[i]);
				}
				
				if(usersToCheck==0 && allFoundCb) allFoundCb();
			});
				}
		
			
			function mapUser(row) {
				var pName = row[0];
				var pUid = parseInt(row[2]);
			var pGid = parseInt(row[3]);
			var pDir = UTIL.trailingSlash(row[5]);
				var pShell = row[6];
				
			users[pName] = {
				name: pName,
				uid: pUid,
				gid: pGid,
				homeDir: pDir,
				shell: pShell
			};
			}
			
		});
		
		function checkPw(username) {
			fs.readFile(UTIL.joinPaths([HOME, username, ".jzeditpw"]), ENCODING, function readpw(err, hashedPw) {
				if(err) {
					// No .jzeditpw file means it's not a jzedit user
					
					if(err.code != "ENOENT") throw err; // Only throw if we get something else then "file not found"
					console.log("Not a jzedit user: " + username);
				}
				else {
					
				if(users.hasOwnProperty(username)) {
					users[username].pw = hashedPw;
					userFoundCb(users[username]);
				}
				else {
					console.warn(".jzeditpw found but user does not exist in " + etcPasswPath);
				}
				
				}
			
			if(--usersToCheck==0 && allFoundCb) allFoundCb();
			});
		}
		
	}
