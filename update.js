#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	To update the IDE:
	1. Download new updates
	2. cd to this folder, eg: cd /srv/jzedit
	3. nodejs update.js (Run this script)
	
	*/

var getArg = require("./shared/getArg.js");
var copyFileSync = require("./shared/copyFileSync.js");
var copyFolderRecursiveSync = require("./shared/copyFolderRecursiveSync.js");
var chmodrSync = require("./shared/chmodrSync.js");
var chmodrDirSync = require("./shared/chmodrDirSync.js");
var chownrDirSync = require("./shared/chownrDirSync.js");

var defaultPasswordFile = process.platform == "win32" ? "./users.pw" : "/etc/jzedit_users";
var defaultHome = "/home/";

var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || defaultPasswordFile;
var HOME = getArg(["home", "home"]) || defaultHome;

var ENCODING = "utf8";

var fs = require("fs");
var child_process = require('child_process');


// Update services
copyFileSync("./etc/systemd/jzedit.service", "/etc/systemd/system/jzedit.service");
copyFileSync("./etc/systemd/jzedit_signup.service", "/etc/systemd/system/jzedit_signup.service");
copyFileSync("./etc/systemd/jzedit_user_mounts.service", "/etc/systemd/system/jzedit_user_mounts.service");
copyFileSync("./etc/systemd/jzedit_nodejs_init.service", "/etc/systemd/system/jzedit_nodejs_init.service");

run("systemctl daemon-reload");
run("systemctl restart jzedit");
run("systemctl restart jzedit_signup");
run("systemctl reload nginx");




var usersPwString = fs.readFileSync(PW_FILE, ENCODING);
var users = usersPwString.split(/\n|\r\n/);
//console.log("users.length=" + users.length);
for (var i=0, username, homeDir; i<users.length; i++) {
	username = users[i].substring(0, users[i].indexOf("|"));
	
	if(username) {
		// Update apparmor profiles (for each user)
	createApparmorProfile("./etc/apparmor/usr.bin.nodejs_someuser", username);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.nodejs", username);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.python", username);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.hg", username);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.share.npm.bin.npm-cli.js", username);
		
		// Make sure files exist and file permissions is rights ...
		homeDir = HOME + username;
		
		// Create a directory where nginx can save logs
		try { fs.mkdirSync(homeDir + "/log"); } catch(err) { console.log(err.message); }
			chmodrSync(homeDir + "/log", "2770"); // Set the group-id bit so that all new files created will belong to the group
			chownrDirSync(homeDir + "/log", uid, gid);
		
		
		// Create a directory for putting "in production" files
		try { fs.mkdirSync(homeDir + "/.prod"); } catch(err) { console.log(err.message); }
		chmodrSync(homeDir + "/.prod", "770");
		chownrDirSync(homeDir + "/.prod", uid, gid);
	}
}
run("systemctl reload apparmor");


function createApparmorProfile(template, username) {
	/*
		ex: "./etc/apparmor/usr.bin.nodejs_someuser"
	*/
	
	var apparmorProfile = fs.readFileSync(template, ENCODING);
	apparmorProfile = apparmorProfile.replace(/%HOME%/g, HOME);
	apparmorProfile = apparmorProfile.replace(/%USERNAME%/g, username);
	apparmorProfile = apparmorProfile.replace(/%JZEDIT%/g, __dirname);
	
	var dest = template.replace("someuser", username);
	var homeDot = HOME.substr(1).replace(/\//g, "."); // Remove first slash and replace remaining slashes with dots
	dest = dest.replace("home.", homeDot);
	dest = dest.replace("./etc/apparmor/", "/etc/apparmor.d/");
	fs.writeFileSync(dest, apparmorProfile);
	
	var bin = dest.replace("/etc/apparmor.d", "");
	bin = dest.replace(".", "/");
	
	//var enforceApparmorProfileStdout = child_process.execSync("aa-enforce " + bin).toString(ENCODING).trim();
	//if(!enforceApparmorProfileStdout.match(/Setting (.*) to enforce mode./)) throw new Error(enforceApparmorProfileStdout);
}



function run(cmd) {
	var stdout = child_process.execSync(cmd).toString(ENCODING);
	if(stdout.trim()) throw new Error(stdout);
}

