#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

// Usage: sudo ./deleteInactiveUsers.js 123
// Deletes all users that have not logged in for 123 days

var minDays = parseInt(process.argv[2]);

if(isNaN(minDays)) throw new Error("Specify days of inactivity as first argument!");

var DEFAULT = require("../server/default_settings.js");

// Get arguments ...
var getArg = require("../shared/getArg.js");

var HOME = getArg(["home", "home"]) || DEFAULT.home_dir;
var POOL = getArg(["pool", "pool"]) || DEFAULT.pool || "rpool";
var DOMAIN = getArg(["d", "domain"]) || DEFAULT.domain;

var module_child_process = require('child_process');

var list = module_child_process.execSync("../user_activity.js");

//guest322 1.3 days
//guest1210 NaN days
var re = /([^\s]+) ([\d.]+) days/g;

var deleteUsers = [];

while(match = re.exec(list)) {
	var user = match[1];
	var days = parseFloat(match[2]);

	if(user == "userskeleton") continue;
	if(user == "root") continue;

	if(days > minDays) {
		deleteUsers.push({name: user, days: days});
	}
}

console.log("The following users will be deleted:");
var usersToDelete = deleteUsers.map(function(user) {
	return user.name + " (" + user.days + ")";
});
console.log(usersToDelete.join(", "));
console.log("Press Enter to continue ... Or Ctrl+C to abort");

process.stdin.once('data', function () {
	main();
});

function main() {
	console.log("HOME=" + HOME);
	console.log("POOL=" + POOL);

	var count = 0;

	deleteUsers.forEach(function(userToBeDeleted) {

		var user = userToBeDeleted.name;
		var buffer = module_child_process.execSync("../removeuser.js " + user+ " -unattended --domain=" + DOMAIN);
		var deleteOutput = buffer.toString();

		if(  deleteOutput.match( new RegExp("User " + user + " deleted!") )  ) {
			console.log("Deleted " + user + "");
			count++;
		}
		else {
			console.log(deleteOutput);
			process.exit();
		}

	});

	console.log(count + " users deleted");

	process.exit();

}
