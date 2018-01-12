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

eachUser(HOME, function(user) {

	console.log("Mounting folders for jzedit user: " + user.name + "");

	mount("/usr/bin/nodejs", "/usr/bin/nodejs_" + user.name); // So user_worker.js can have separate Apparmor profile for each user

	mount("/dev/urandom", HOME + user.name + "/dev/urandom");
	mount("/lib/", HOME + user.name + "/lib");
	mount("/lib64/", HOME + user.name + "/lib64");
	mount("/usr/lib/", HOME + user.name + "/usr/lib");
	mount("/usr/local/lib", HOME + user.name + "/usr/local/lib"); // Needed for Python packages (hggit)
	mount("/usr/share/", HOME + user.name + "/usr/share"); // npm dependencies
	mount("/usr/bin/hg", HOME + user.name + "/usr/bin/hg");
	mount("/usr/bin/python", HOME + user.name + "/usr/bin/python");
	mount("/usr/bin/nodejs", HOME + user.name + "/usr/bin/nodejs");
	mount("/etc/ssl/certs", HOME + user.name + "/etc/ssl/certs");
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

