#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

// Usage: sudo ./deleteAllGuests.js

var DEFAULT = require("../server/default_settings.js");

// Get arguments ...
var getArg = require("../shared/getArg.js");

var HOME = getArg(["home", "home"]) || DEFAULT.home_dir;
var POOL = getArg(["pool", "pool"]) || DEFAULT.pool || "rpool";
var DOMAIN = getArg(["d", "domain"]) || DEFAULT.domain;

var module_child_process = require('child_process');

var list = module_child_process.execSync("zfs list");

// rpool/home/user        32.6M  1.55T     6.16G  /home/user
var re = new RegExp("([^/]*)" + HOME + "([^ ]*).*[\\n\\r]", "g");

console.log("HOME=" + HOME);
console.log("POOL=" + POOL);

var count = 0;

while(match = re.exec(list)) {
	var pool = match[1];
	var user = match[2];

	if(pool == POOL && user.match(/guest\d+/)) {
		var buffer = module_child_process.execSync("../removeuser.js " + user + " -unattended --domain=" + DOMAIN);
		// gotcha posix programs outputs strings, while NodeJS programs output a buffer
		var deleteOutput = buffer.toString();

		if(  deleteOutput.match( new RegExp("User " + user + " deleted!") )  ) {
			console.log("Deleted " + user + "");
			count++;
		}
		else {
			console.log(deleteOutput);
			process.exit();
		}
	}
}

var module_fs = require("fs");
module_fs.writeFileSync("../server/GUEST_COUNTER", "0");

console.log(count + " (guest) users deleted");
