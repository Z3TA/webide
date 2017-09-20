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
var child_process = require('child_process');

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

// Remove apparmor profiles
unlink("/etc/apparmor.d/usr.bin.nodejs_" + username);
unlink("/etc/apparmor.d/home." + username + ".usr.bin.nodejs");
unlink("/etc/apparmor.d/home." + username + ".usr.bin.python");
unlink("/etc/apparmor.d/home." + username + ".usr.bin.hg");
unlink("/etc/apparmor.d/home." + username + ".usr.share.npm.bin.npm-cli.js");

//var reloadApparmor = child_process.execSync("service apparmor reload").toString(ENCODING).trim();
//if(reloadApparmor != "") throw reloadApparmor;


unlink("/usr/bin/nodejs_" + username);

// We don't want to accidently mess with any of these, so just in case we are doing some debugging
/*
	umount("/home/" + username + "/dev/", true);
	umount("/home/" + username + "/lib/", true);
	umount("/home/" + username + "/lib64/", true);
	umount("/home/" + username + "/usr/", true);
	umount("/home/" + username + "/etc/", true);
	umount("/home/" + username + "/run/", true);
*/

	umount("/home/" + username + "/dev/urandom");
	umount("/home/" + username + "/lib");
	umount("/home/" + username + "/lib64");
	umount("/home/" + username + "/usr/lib");
umount("/home/" + username + "/usr/share");
	umount("/home/" + username + "/usr/bin/hg");
	umount("/home/" + username + "/usr/bin/python");
	umount("/home/" + username + "/usr/bin/nodejs");

	
	child_process.exec('userdel -r -f ' + username, function execAddUser(err, stdout, stderr) {
	if (err) throw err;
	
	var mailspool = "userdel: " + username + " mail spool (/var/mail/" + username + ") not found";
	
	if(stderr) {
	if(stderr.trim() != mailspool) throw new Error(stderr);
	}
	
	console.log("User " + username + " deleted!");
	
	});
	
	function unlink(path) {
	var fs = require("fs");
	try {
	fs.unlinkSync(path);
	}
	catch(err) {
	if(err.code == "ENOENT") console.warn("Did not find path=" + path);
	else throw err;
	}
	}
	
	function umount(path, ignoreErrors) {
	var child_process = require("child_process");
	try {
	child_process.execSync("umount " + path).toString(ENCODING);
	}
	catch(err) {
	if(!ignoreErrors) {
	if(err.message.indexOf("umount: " + path + ": not mounted") == -1
	&& err.message.indexOf("umount: " + path + ": mountpoint not found") == -1 ) throw err;
	// stderr message are already shown in the shell, no need to repeat them
	}
	}
	
	// Remove entry from /etc/fstab
	var text = fs.readFileSync("/etc/fstab", ENCODING);
	var reMount = new RegExp("(.*) " + regExpEsc(path) + " none bind 0 0\n");
	var entry = text.match(reMount);
	if(!entry) {
		console.log("Not found in /etc/fstab: " + path);
	}
	else {
	text = text.replace(entry[0], "");
	
	if(text.match(reMount)) throw new Error("Failed to remove /etc/fstab entry: " + entry[0]);
	
	fs.writeFileSync("/etc/fstab", text, ENCODING);
	}
}

function regExpEsc(str) {
	return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function replaceInFileSync(filePath, arrSearchReplace) {
	var fs = require("fs");
	
	// arrSearchReplace = [searchString, replaceString]
	var text = fs.readFileSync(filePath, ENCODING);
	
	for (var i=0, searchString="", replaceString=""; i<arrSearchReplace.length; i++) {
		searchString = arrSearchReplace[i][0];
		replaceString = arrSearchReplace[i][1];
		text = text.replace(searchString, replaceString);
	}
	
	fs.writeFileSync(filePath, text, ENCODING);
	
}
	
	