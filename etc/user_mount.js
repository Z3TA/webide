#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	Mount everything to each user home dir for chroot to work
*/

var getArg = require("./../server/getArg.js");
var defaultPasswordFile = process.platform == "win32" ? "./users.pw" : "/etc/jzedit_users";
var defaultHome = "/home/";

var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || defaultPasswordFile;
var HOME = getArg(["home", "home"]) || defaultHome;
var ENCODING = "utf8";

var fs = require("fs");
	var usersPwString = fs.readFileSync(PW_FILE, ENCODING);

var users = usersPwString.split(/\n|\r\n/);
for (var i=0, username, mountResult; i<users.length; i++) {
	username = users[i].substring(0, users[i].indexOf("|"));
	
	if(username) {
	mount("/dev/urandom", HOME + username + "/dev/urandom");
	mount("/lib/", HOME + username + "/lib");
	mount("/lib64/", HOME + username + "/lib64");
	mount("/usr/lib/", HOME + username + "/usr/lib");
	mount("/usr/share/", HOME + username + "/usr/share"); // npm dependencies
	mount("/usr/bin/hg", HOME + username + "/usr/bin/hg");
	mount("/usr/bin/python", HOME + username + "/usr/bin/python");
	mount("/usr/bin/nodejs", HOME + username + "/usr/bin/nodejs");
	}
}

function mount(source, target) {
	// Folders and files should already exist!
	var child_process = require('child_process');
	try {
	var mountResult = child_process.execSync("mount --bind " + source + " " + target ).toString(ENCODING).trim();
	}
	catch(err) {
		//throw err;
		console.warn(err.message);
	}
	}

