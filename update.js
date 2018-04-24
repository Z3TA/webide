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
var eachUser = require("./shared/eachUser.js");

var defaultHome = "/home/";
var HOME = getArg(["home", "home"]) || defaultHome;

var ENCODING = "utf8";

var fs = require("fs");
var child_process = require('child_process');

var UTIL = require("./client/UTIL.js");

// Update services
copyFileSync("./etc/systemd/jzedit.service", "/etc/systemd/system/jzedit.service");
//copyFileSync("./etc/systemd/jzedit_signup.service", "/etc/systemd/system/jzedit_signup.service");
//copyFileSync("./etc/systemd/jzedit_nodejs_init.service", "/etc/systemd/system/jzedit_nodejs_init.service");

run("systemctl daemon-reload");
//run("systemctl restart jzedit");
//run("systemctl restart jzedit_signup");


eachUser(HOME, function(user) {
	
	console.log(user);
	
	// ## Things to do with each existing user
		
		// Update apparmor profiles (for each user)
	createApparmorProfile("./etc/apparmor/usr.bin.nodejs_someuser", user.name);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.node", user.name);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.python", user.name);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.hg", user.name);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.lib.node_modules.npm.bin.npm-cli.js", user.name);
	createApparmorProfile("./etc/apparmor/home.someuser.bin.bash", user.name);
	
	// Make sure files exist and file permissions are rights ...
		
		
		// Create a directory where nginx can save logs
	try { fs.mkdirSync(UTIL.joinPaths([user.homeDir, "log/"])); } catch(err) { console.log(err.message); }
	chmodrSync(UTIL.joinPaths([user.homeDir, "log/"]), "2770"); // Set the group-id bit so that all new files created will belong to the group
	chownrDirSync(UTIL.joinPaths([user.homeDir, "log/"]), user.uid, user.gid);
		
		// Create a directory for putting "in production" files
	try { fs.mkdirSync(UTIL.joinPaths([user.homeDir, ".prod/"])); } catch(err) { console.log(err.message); }
	chmodrSync(UTIL.joinPaths([user.homeDir, ".prod/"]), "770");
	chownrDirSync(UTIL.joinPaths([user.homeDir, ".prod/"]), user.uid, user.gid);
		
		// Make sure www-data has access to wwwpub folder
	run("chmod 2755 " + UTIL.joinPaths([user.homeDir, "wwwpub/"]));
	run("chown -R " + user.name + ":www-data " + UTIL.joinPaths([user.homeDir, "wwwpub/"]));
		
	
	
	
	}, function allUsersFound() {

run("systemctl reload apparmor");
	run("systemctl restart jzedit");
});


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

