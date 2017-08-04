#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

var defaultGroupName = "jzedit_users";
var defaultPasswordFile = "/etc/jzedit_users"
var defaultDomain = "webide.se";

// Get arguments ...
var getArg = require("./server/getArg.js");

var username = process.argv[2];

var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || defaultPasswordFile;

var DOMAIN = getArg(["d", "domain"]) || defaultDomain;

var ENCODING = "utf8";

if(!username) throw new Error("No username specified!");

var fs = require("fs");

var usersPwString = fs.readFileSync(PW_FILE, ENCODING);

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

var childProcess = require('child_process');
childProcess.exec('userdel -r -f ' + username, function execAddUser(err, stdout, stderr) {
	if (err) throw err;
	
	var mailspool = "userdel: " + username + " mail spool (/var/mail/" + username + ") not found";
	
	if(stderr) {
		if(stderr.trim() != mailspool) throw new Error(stderr);
		}
	
	console.log("User " + username + " deleted!");
	
});

