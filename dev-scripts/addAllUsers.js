#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

// Will create system users for all zfs filesystems found under /home/
// Usage: sudo ./addAllUsers.js


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

console.log("Besides adding all zpool/home/users as system users, ")
console.log("this script will also update NGINX PROFILES!");
console.log("Press Enter to continue ... Or Ctrl+C to abort");

process.stdin.once('data', function () {
	main();
});

function main() {
	console.log("HOME=" + HOME);
	console.log("POOL=" + POOL);

	var count = 0;

	while(match = re.exec(list)) {
		var pool = match[1];
		var user = match[2];

		if(pool != POOL) continue;
		if(user == "userskeleton") continue;
		if(user == "root") continue;

		var error = false;
		try {
			var buffer = module_child_process.execSync("useradd " + user + " -s /bin/false");
		}
		catch(err) {
			error = true;
			if(err.message.match("user '" + user + "' already exists") ) {
				//console.log(err.message)
			}
			else throw err;
		}
		console.log(buffer && buffer.toString());

		var buffer = module_child_process.execSync("chown -R " + user + ":" + user + " " + HOME + user);
		console.log(buffer && buffer.toString());

		if(!error) {
			count++;
			console.log("Added " + user);
		}
	}

	// Fix permissions, etc
	var buffer = module_child_process.execSync("../update.js");

	console.log(count + " users added to system");

	process.exit();
}
