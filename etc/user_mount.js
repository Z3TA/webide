#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	Mount everything to each user home dir for chroot to work
*/

var getArg = require("../shared/getArg.js");
var eachUser = require("../shared/eachUser.js");
var defaultHome = "/home/";

var HOME = getArg(["home", "home"]) || defaultHome;
var ENCODING = "utf8";

var UTIL = require("../client/UTIL.js");

eachUser(HOME, function(username) {

console.log("Mounting folders for jzedit user: " + username + "");

mount("/usr/bin/nodejs", "/usr/bin/nodejs_" + username); // So user_worker.js can have separate Apparmor profile for each user

mount("/dev/urandom", HOME + username + "/dev/urandom");
mount("/lib/", HOME + username + "/lib");
mount("/lib64/", HOME + username + "/lib64");
mount("/usr/lib/", HOME + username + "/usr/lib");
mount("/usr/local/lib", HOME + username + "/usr/local/lib"); // Needed for Python packages (hggit)
mount("/usr/share/", HOME + username + "/usr/share"); // npm dependencies
mount("/usr/bin/hg", HOME + username + "/usr/bin/hg");
mount("/usr/bin/python", HOME + username + "/usr/bin/python");
mount("/usr/bin/nodejs", HOME + username + "/usr/bin/nodejs");
mount("/etc/ssl/certs", HOME + username + "/etc/ssl/certs");
});



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

