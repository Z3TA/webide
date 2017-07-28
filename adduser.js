#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	This is a useful script for those managing jzedit running as a cloud editor,
	it will add users both as system users and into the /etc/jzedit_users file.
	
	Create the group:
	sudo addgroup jzedit_users
	
	Make this script executable:
	sudo chmod +x adduser.js
	
	Run this script (example: add user foouser with password foopw):
	./adduser.js foouser foopw
	
	Remove a user:
	sudo userdel -r -f nameOfUser
	sudo nano server/users.pw
	
*/

var getArg = require("./server/getArg.js");

var username = process.argv[2];
var password = process.argv[3];
var groupName = process.argv[4] || "jzedit_users";

var NO_PW_HASH = getArg(["nopwhash"]);
var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || "/etc/jzedit_users";

if(!username) throw new Error("No username specified!");
	if(!password) throw new Error("No password specified!");
	
	var gid = getGroupId(groupName);
	
	//console.log("gid=" + gid);
	
	var childProcess = require('child_process');
childProcess.exec('adduser --system --ingroup jzedit_users ' + username, function execAddUser(err, stdout, stderr) {
		if (err) throw err;
		
		if(stderr) throw new Error(stderr);
		
		/*
			Format:
			Adding system user `pelle' (UID 111) ...
			Adding new user `pelle' (UID 111) with group `jzedit_users' ...
			Creating home directory `/home/pelle' ...
		*/
		
	//console.log("stdout=" + stdout);
	
		var matchUid = stdout.match(/\(UID (\d*)\)/);
	var matchHomeDir = stdout.match(/home directory `([^' ]*)'/);
	
		if(!matchUid) throw new Error("Unable to fund UID in stdout=" + stdout);
		if(!matchHomeDir) throw new Error("Unable to fund UID in stdout=" + stdout);
		
	// Sanity check
	var matchUserName = stdout.match(/new user `([^' ]*)'/);
	if(!matchUserName) throw new Error("Could not match user name in stdout=" + stdout);
	if(username != matchUserName[1]) throw new Error("The added user's username=" + matchUserName[1] + " is not the username=" + username + " we wanted! stdout=" + stdout);
	
		var uid = parseInt(matchUid[1]);
		var homeDir = matchHomeDir[1];
		
		var fs = require("fs");
		
	var encoding = "utf8";
		
	try {
	var usersPwString = fs.readFileSync(PW_FILE, encoding);
	}
	catch(err) {
		if(err.code != "ENOENT") throw err;
		var usersPwString = "";
	}
	if(NO_PW_HASH) {
			var hashedPassword = password;
		}
		else {
			var pwHash = require("./server/pwHash.js");
			var hashedPassword = pwHash(password);
		}
		
		usersPwString += username + "|" + hashedPassword + "|" + homeDir + "|" + uid + "|" + gid + "\n";
		
	fs.writeFileSync(PW_FILE, usersPwString, encoding);
		
	
	// Add skeleton files
	copyFolderRecursiveSync("etc/userdir_skeleton/static_site_demo/", homeDir);
	
	// add wwwpub
	fs.mkdirSync(homeDir + "/wwwpub");
	
	chownrSync(homeDir, uid, gid);
	
	chmodrSync(homeDir, "700");
	
	// Make wwwpub public
	chmodrSync(homeDir + "/wwwpub", "755");
	
	// Create nginx profile
	var nginxProfile = "server {\
	listen 80;\
	#listen [::]:80 ipv6only=on;\
	#listen 443 ssl;\
	server_name " + username + ".webtigerteam.com;\
	root " + homeDir + "/wwwpub/;\
	index index.html index.htm;\
	location / {\
	  charset	utf-8;\
	  try_files $uri $uri/ =404;\
	}\n}";
	fs.writeFileSync("/etc/nginx/sites-available/" + username + ".webtigerteam.com.nginx", nginxProfile);
	fs.symlinkSync("/etc/nginx/sites-available/" + username + ".webtigerteam.com.nginx", "/etc/nginx/sites-enabled/" + username + ".webtigerteam.com");
	
	var child_process = require('child_process');
	var reloadNginxError = child_process.execSync("service nginx reload");
	if(reloadNginxError) throw reloadNginxError;
	
	console.log("User with username=" + username + " and password=" + password + " successfully added to " + PW_FILE);
		
	});
	
	function getGroupId(groupName) {
		var fs = require("fs");
		
		var groupData = fs.readFileSync("/etc/group", "utf8");
		
		//console.log("groupData=" + groupData);
		
		var groups = groupData.split(/\r|\n/);
		
		// format: jzedit_users:x:115:
		
		for (var i=0, group, name, id; i<groups.length; i++) {
			group = groups[i].split(":");
			name = group[0];
			id = group[2];
			
			if(name == groupName) return parseInt(id);
		}
		
		throw new Error("Unable to find id for groupName=" + groupName);
	}
	
	



function copyFileSync( source, target ) {
	
	var fs = require('fs');
	var path = require('path');
	
	var targetFile = target;
	
	//if target is a directory a new file with the same name will be created
	if ( fs.existsSync( target ) ) {
		if ( fs.lstatSync( target ).isDirectory() ) {
			targetFile = path.join( target, path.basename( source ) );
		}
	}
	
	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync( source, target ) {
	
	var fs = require('fs');
	var path = require('path');
	
	var files = [];
	
	//check if folder needs to be created or integrated
	var targetFolder = path.join( target, path.basename( source ) );
	if ( !fs.existsSync( targetFolder ) ) {
		fs.mkdirSync( targetFolder );
	}
	
	//copy
	if ( fs.lstatSync( source ).isDirectory() ) {
		files = fs.readdirSync( source );
		files.forEach( function ( file ) {
			var curSource = path.join( source, file );
			if ( fs.lstatSync( curSource ).isDirectory() ) {
				copyFolderRecursiveSync( curSource, targetFolder );
			} else {
				copyFileSync( curSource, targetFolder );
			}
		} );
	}
}
	

function chmodrSync (p, mode) {
	// https://github.com/isaacs/chmodr/
	console.log("chmod mode=" + mode + " p=" + p);
	var fs = require('fs');
	
	var stats = fs.lstatSync(p)
	if (stats.isSymbolicLink()) return;
	if (stats.isDirectory()) return chmodrDirSync(p, mode);
	else return fs.chmodSync(p, mode)
}

function chmodrDirSync (p, mode) {
	console.log("chmod dir mode=" + mode + " p=" + p);
	var fs = require('fs');
	var path = require('path');
	
	fs.readdirSync(p).forEach(function (child) {
		chmodrSync(path.resolve(p, child), mode)
	})
	return fs.chmodSync(p, dirMode(mode))
}

function dirMode(mode) {
	// If a party has r, add x
	// so that dirs are listable
	
	if (mode & 0400)
	mode |= 0100
	if (mode & 040)
	mode |= 010
	if (mode & 04)
	mode |= 01
	return mode
}

function chownrSync(p, uid, gid) {
	console.log("chown uid=" + uid + " gid=" + gid + " p=" + p);
	var fs = require('fs');
	var stats = fs.lstatSync(p);
	if (stats.isSymbolicLink()) return;
	if (stats.isDirectory()) return chownrDirSync(p, uid, gid);
	else return fs.chownSync(p, uid, gid);
}

function chownrDirSync(p, uid, gid) {
	console.log("chown dir uid=" + uid + " gid=" + gid + " p=" + p);
	var fs = require('fs');
	var path = require('path');
	
	fs.readdirSync(p).forEach(function (child) {
		chownrSync(path.resolve(p, child), uid, gid);
	});
	return fs.chownSync(p, uid, gid);
}