#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

var defaultGroupName = "jzedit_users";
var defaultPasswordFile1 = "/etc/jzedit_users"
var defaultPasswordFile2 = "server/users.pw"
var defaultDomain = "webide.se";

// Get arguments ...
var getArg = require("./server/getArg.js");

var username = process.argv[2];

var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || defaultPasswordFile1;

var DOMAIN = getArg(["d", "domain"]) || defaultDomain;

var ENCODING = "utf8";

if(!username) throw new Error("No username specified!");

var fs = require("fs");


try {
	var usersPwString = fs.readFileSync(PW_FILE, ENCODING);
}
catch(err) {
	if(err.code != "ENOENT") throw err;
	console.log("File not found! PW_FILE=" + PW_FILE);
	if(PW_FILE == defaultPasswordFile1) {
		//console.log("No users found in " + PW_FILE + ". Trying " + defaultPasswordFile2);
		
		try {
			var usersPwString = fs.readFileSync(defaultPasswordFile2, ENCODING);
		}
		catch(err) {
			if(err.code != "ENOENT") throw err;
			else {
				console.log("Could not find neaither of the following files:");
				console.log(defaultPasswordFile1);
				console.log(defaultPasswordFile2);
				console.log("Specify pwfile in arguments!");
				process.exit();
			}
		}
		if(usersPwString) {
			PW_FILE = defaultPasswordFile2;
			console.warn("Using PW_FILE=" + PW_FILE);
		}
	}
}


var userRemovedFromPwFile = false;
var arrUsers = usersPwString.split(/\rn|\n/);
for (var i=0; i<arrUsers.length; i++) {
	if(arrUsers[i].substring(0, username.length) == username) {
		arrUsers.splice(i, 1);
		userRemovedFromPwFile = true;
		break;
	}
	}
if(!userRemovedFromPwFile) console.warn("User " + username + " was not found in PW_FILE=" + PW_FILE);
else {
	fs.writeFileSync(PW_FILE, arrUsers.join("\n"), ENCODING);
}

// Remove nginx profile
var nginxProfile = "/etc/nginx/sites-available/" + username + "." + DOMAIN + ".nginx";
var nginxProfileSymlink = "/etc/nginx/sites-enabled/" + username + "." + DOMAIN + "";
try {
	fs.unlinkSync(nginxProfileSymlink);
	fs.unlinkSync(nginxProfile);
	}
catch(err) {
	if(err.code == "ENOENT") console.warn("Did not find nginxProfile=" + nginxProfile);
	else throw err;
}

// Remove apparmor profile
var apparmorProfile = "/etc/apparmor.d/usr.bin.nodejs_" + username;
try {
	fs.unlinkSync(apparmorProfile);
	}
catch(err) {
	if(err.code == "ENOENT") console.warn("Did not find apparmorProfile=" + apparmorProfile);
	else throw err;
}


// Unlink nodejs hard link
var userNodejs = "/usr/bin/nodejs_" + username;
try {
	fs.unlinkSync(userNodejs);
}
catch(err) {
	if(err.code == "ENOENT") console.warn("Did not find userNodejs=" + userNodejs);
	else throw err;
}



var childProcess = require('child_process');
childProcess.exec('userdel -r -f ' + username, function execAddUser(err, stdout, stderr) {
	if (err) throw err;
	
	var mailspool = "userdel: " + username + " mail spool (/var/mail/" + username + ") not found";
	
	if(stderr) {
		if(stderr.trim() != mailspool) throw new Error(stderr);
		}
	
	console.log("User " + username + " deleted!");
	
});

