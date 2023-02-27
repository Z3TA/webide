#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	To update the IDE:
	1. Download new updates
	2. cd to this folder, eg: cd /srv/webide
	3. nodejs update.js (Run this script)
	
	*/

var getArg = require("./shared/getArg.js");
var copyFileSync = require("./shared/copyFileSync.js");
var chmodrSync = require("./shared/chmodrSync.js");
var chmodrDirSync = require("./shared/chmodrDirSync.js");
var chownrDirSync = require("./shared/chownrDirSync.js");
var eachUser = require("./shared/eachUser.js");

var DEFAULT = require("./server/default_settings.js");

var defaultDomain = DEFAULT.domain;
var defaultHome = DEFAULT.home_dir;

var HOME = getArg(["home", "home"]) || defaultHome;
var HEADLESS = !!getArg(["headless", "headless"]);
var DOMAIN = getArg(["d", "domain"]) || defaultDomain;

var ENCODING = "utf8";

var fs = require("fs");
var child_process = require('child_process');

var UTIL = require("./client/UTIL.js");

if(HEADLESS) startUpdate();
else {
	console.log("This script is for when running as a cloud IDE. It will update the WebIDE configuration!");
	console.log("Press Enter to continue ... Or Ctrl+C to abort");
	process.stdin.once('data', function () {
		startUpdate();
	});
}

function startUpdate() {
	
// Update services
	//copyFileSync("./etc/systemd/webide.service", "/etc/systemd/system/webide.service");
	//copyFileSync("./etc/systemd/webide_signup.service", "/etc/systemd/system/webide_signup.service");
	//copyFileSync("./etc/systemd/webide_nodejs_init.service", "/etc/systemd/system/webide_nodejs_init.service");
	//copyFileSync("./etc/systemd/custom_iptables.service", "/etc/systemd/system/custom_iptables.service");
	
copyFileSync("./bin/webider", "/usr/local/bin/webide");
	run("chmod +x /usr/local/bin/webide");

run("systemctl daemon-reload");
	//run("systemctl restart webide");
	//run("systemctl restart webide_signup");


eachUser(HOME, function(user) {
	
	console.log(user);
	
	// ## Things to do with each existing user
		
		// Update apparmor profiles (for each user)
/*
createApparmorProfile("./etc/apparmor/usr.bin.nodejs_someuser", user.name);
createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.node", user.name);
createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.python", user.name);
createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.hg", user.name);
createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.git", user.name);
createApparmorProfile("./etc/apparmor/home.someuser.usr.lib.node_modules.npm.bin.npm-cli.js", user.name);
createApparmorProfile("./etc/apparmor/home.someuser.usr.lib.node_modules.npm.bin.npx-cli.js", user.name);
createApparmorProfile("./etc/apparmor/home.someuser.bin.bash", user.name);
*/
	
		
		// Update user nginx profile
		// Also need to update server.js if more variables are added!
		var nginxProfile = fs.readFileSync("./etc/nginx/user.webide.se.nginx", "utf8");
		var url_user = UTIL.urlFriendly(user.name);
		nginxProfile = nginxProfile.replace(/%USERNAME%/g, url_user);
		nginxProfile = nginxProfile.replace(/%HOMEDIR%/g, user.homeDir);
		nginxProfile = nginxProfile.replace(/%NETNSIP%/g, UTIL.int2ip(167772162 + user.uid));
		nginxProfile = nginxProfile.replace(/%DOCKERIP%/g, UTIL.int2ip(167903234 + user.uid));
		// dots need to be escaped!? Not in cert paths or nginx will not reload! Only in regular expressions!
		nginxProfile = nginxProfile.replace(/%DOM_ESC_DOTS%/g, DOMAIN.replace(/\./g, "\\.") );
		nginxProfile = nginxProfile.replace(/%DOMAIN%/g, DOMAIN);
		
		var userDomain = url_user + "." + DOMAIN;
		var nginxProfilePath = "/etc/nginx/sites-available/" + userDomain + ".nginx";
		fs.writeFileSync(nginxProfilePath, nginxProfile);
		
	
	// Make sure files exist and file permissions are rights ...
		
		
		// Create a directory where nginx can save logs
	try { fs.mkdirSync(UTIL.joinPaths([user.homeDir, "log/"])); } catch(err) { console.log(err.message); }
	chmodrSync(UTIL.joinPaths([user.homeDir, "log/"]), "2770"); // Set the group-id bit so that all new files created will belong to the group
	chownrDirSync(UTIL.joinPaths([user.homeDir, "log/"]), user.uid, user.gid);
		
		// Create a directory for putting "in production" files
		try { fs.mkdirSync(UTIL.joinPaths([user.homeDir, ".webide/", "prod/"])); } catch(err) { console.log(err.message); }
		chmodrSync(UTIL.joinPaths([user.homeDir, ".webide/", "prod/"]), "770");
		chownrDirSync(UTIL.joinPaths([user.homeDir, ".webide/", "prod/"]), user.uid, user.gid);
		
		// wwwpub folder should be public
		try { fs.mkdirSync(UTIL.joinPaths([user.homeDir, "wwwpub/"])); } catch(err) { console.log(err.message); }
		run("chown -R " + user.name + ":www-data " + UTIL.joinPaths([user.homeDir, "wwwpub/"]));
		run("chmod 2755 " + UTIL.joinPaths([user.homeDir, "wwwpub/"])); // New created files will get the same group as parent directory group
		run("find " + UTIL.joinPaths([user.homeDir, "wwwpub/"]) + " -type f -exec chmod 744 {} +" ); // Files does not need execute permission
		run("find " + UTIL.joinPaths([user.homeDir, "wwwpub/"]) + " -type d -exec chmod 2755 {} +" ); // Folders need execute permission for Nginx to list files. New created files will get the same group as parent directory group
		
		// Should be able to edit stuff in .webide folder
		run("chown -R " + user.name + ":" + user.name + " " + UTIL.joinPaths([user.homeDir, ".webide/"]));
		run("find " + UTIL.joinPaths([user.homeDir, ".webide/"]) + " -type f -exec chmod 640 {} +" ); // Files does not need execute permission
		run("find " + UTIL.joinPaths([user.homeDir, ".webide/"]) + " -type d -exec chmod 750 {} +" ); // Folders need execute permission 

	
	}, function allUsersFound() {

run("systemctl reload apparmor");
	run("systemctl reload nginx");
		run("systemctl restart webide");
		run("systemctl restart webide_signup");
		run("systemctl restart webide_nodejs_init");
	
});
}


function createApparmorProfile(template, username) {
	/*
		ex: "./etc/apparmor/usr.bin.nodejs_someuser"
	*/
	
	var apparmorProfile = fs.readFileSync(template, ENCODING);
	apparmorProfile = apparmorProfile.replace(/%HOME%/g, HOME);
	apparmorProfile = apparmorProfile.replace(/%USERNAME%/g, username);
	apparmorProfile = apparmorProfile.replace(/%WEBIDE%/g, __dirname);
	
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

