#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	This is a useful script for those managing jzedit running as a cloud editor,
	it will add users both as system users and into the /etc/jzedit_users file.
	
	Create the group:
	sudo addgroup jzedit_users
	
	Make this script executable:
	sudo chmod +x adduser.js
	
	Run this script (example: add user foouser with password foopw):
	./adduser.js foouser foopw
	
	Remove a user:
	sudo userdel -r -f nameOfUser
	sudo nano server/users.pw
	
*/

var defaultGroupName = "jzedit_users";
var defaultPasswordFile = "/etc/jzedit_users"
var defaultDomain = "webide.se";

// Get arguments ...
var getArg = require("./server/getArg.js");

var username = process.argv[2];
var password = process.argv[3];
var groupName = process.argv[4] || defaultGroupName;

if(groupName.substring(0,1) == "-") groupName = defaultGroupName;

var NO_PW_HASH = getArg(["nopwhash"]);
var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || defaultPasswordFile;
var DOMAIN = getArg(["d", "domain"]) || defaultDomain;


// Favor using JSON as argument to prevent hackers from passing arguments in their password
try { var scriptArguments = JSON.parse(process.argv.join(" ")); }
catch (err) { var scriptArguments = null; }

if(scriptArguments) {
	username = scriptArguments.username;
	password = scriptArguments.password;
	groupName = scriptArguments.groupName || defaultGroupName;
	NO_PW_HASH = scriptArguments.noPwHash;
	PW_FILE = scriptArguments.pwFile || defaultPasswordFile;
	DOMAIN = scriptArguments.domain || defaultDomain;
	}


var ENCODING = "utf8";

if(!username) throw new Error("No username specified!");
	if(!password) throw new Error("No password specified!");
	
	var gid = getGroupId(groupName);
	
	//console.log("gid=" + gid);
	
var fs = require("fs");

try {
	var usersPwString = fs.readFileSync(PW_FILE, ENCODING);
	}
catch(err) {
	if(err.code != "ENOENT") throw err;
	console.warn("File do not exist: PW_FILE=" + PW_FILE + " (it will be created)")
	var usersPwString = "";
}


	var etcPasswdString = fs.readFileSync("/etc/passwd", ENCODING);


if(username.match(/[^A-Za-z0-9]/)) throw new Error("Username contains characters that is not a-z or 0-9");

if(username.length < 3) throw new Error("username needs to be at least 3 letters!");
if(username.length > 20) throw new Error("username can not be more then 20 letters!");

// Make sure user not already exist
//console.log("usersPwString=" + usersPwString);
var users = usersPwString.split(/\n|\r\n/);
//console.log("users.length=" + users.length);
for (var i=0, name; i<users.length; i++) {
	name = users[i].substring(0, users[i].indexOf("|"));
	if(name == username) throw new Error("User " + username + " already exist in " + PW_FILE + "! username=");
}
//console.log("etcPasswdString=" + etcPasswdString);
var users = etcPasswdString.split(/\n|\r\n/);
//console.log("users.length=" + users.length);
for (var i=0, name; i<users.length; i++) {
	name = users[i].substring(0, users[i].indexOf(":"));
	//console.log("name=" + name); // Why does it not find name !?
	if(name == username) throw new Error("User " + username + " already exist in /etc/passwd! username=");
}



var childProcess = require('child_process');
childProcess.exec('adduser --system --ingroup jzedit_users ' + username, function execAddUser(err, stdout, stderr) {
	if (err) throw err;
		
		if(stderr) throw new Error(stderr);
		
		/*
			Format:
			Adding system user `pelle' (UID 111) ...
			Adding new user `pelle' (UID 111) with group `jzedit_users' ...
			Creating home directory `/home/pelle' ...
		*/
		
	//console.log("stdout=" + stdout);
	
		var matchUid = stdout.match(/\(UID (\d*)\)/);
	var matchHomeDir = stdout.match(/home directory `([^' ]*)'/);
	
		if(!matchUid) throw new Error("Unable to fund UID in stdout=" + stdout);
		if(!matchHomeDir) throw new Error("Unable to fund UID in stdout=" + stdout);
		
	// Sanity check
	var matchUserName = stdout.match(/new user `([^' ]*)'/);
	if(!matchUserName) throw new Error("Could not match user name in stdout=" + stdout);
	if(username != matchUserName[1]) throw new Error("The added user's username=" + matchUserName[1] + " is not the username=" + username + " we wanted! stdout=" + stdout);
	
		var uid = parseInt(matchUid[1]);
		var homeDir = matchHomeDir[1];
		
	var fs = require("fs");
		
	if(NO_PW_HASH) {
			var hashedPassword = password;
		}
		else {
			var pwHash = require("./server/pwHash.js");
			var hashedPassword = pwHash(password);
		}
		
		usersPwString += username + "|" + hashedPassword + "|" + homeDir + "|" + uid + "|" + gid + "\n";
		
	fs.writeFileSync(PW_FILE, usersPwString, ENCODING);
		
	
	// Add skeleton files
	copyFolderRecursiveSync("etc/userdir_skeleton/static_site_demo/", homeDir);
	fs.renameSync(homeDir + "/static_site_demo/", homeDir + "/my_web_site");
	
	// Update tamplates
	var date = new Date();
	var monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	replaceInFileSync(homeDir + "/my_web_site/template.htm", [
		['<meta name="created" content="2042-03-22">', '<meta name="created" content="' + date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '">'],
		['<meta name="author" content="Jon Doe">', '<meta name="author" content="' + username + '">'],
		['<p>Written by <a href="../index.htm" rel="author">Jon Doe</a> Mars 22, 2042.</p>', '<p>Written by <a href="../index.htm" rel="author">' + username + '</a> ' + monthName[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear() + '.</p>']
		]);
	
	// add wwwpub
	fs.mkdirSync(homeDir + "/wwwpub");
	fs.writeFileSync(homeDir + "/wwwpub/index.htm", '<doctype html><meta charset="utf-8">Site not yet published', ENCODING);
	
	chownrSync(homeDir, uid, gid);
	
	chmodrSync(homeDir, "700");
	
	// Make wwwpub public
	chmodrSync(homeDir + "/wwwpub", "755");
	
	
	// create named pipes / unix socket
	fs.mkdirSync(homeDir + "/sock");
	fs.mkdirSync(homeDir + "/sock/http1");
	fs.mkdirSync(homeDir + "/sock/ws1");
	
	// Make sure www-data can read and write to the socket
	var wwwgid = getGroupId("www-data");
	chownrSync(homeDir + "/sock", uid, wwwgid);
	chmodrSync(homeDir + "/sock", "770");
	
	
	
	// Create nginx profile
	var nginxProfile = fs.readFileSync("./etc/nginx/user.webide.se.nginx", ENCODING);
	nginxProfile = nginxProfile.replace(/%USERNAME%/g, username);
	nginxProfile = nginxProfile.replace(/%HOMEDIR%/g, homeDir);
	nginxProfile = nginxProfile.replace(/%DOMAIN%/g, DOMAIN);
	
	
	fs.writeFileSync("/etc/nginx/sites-available/" + username + "." + DOMAIN + ".nginx", nginxProfile);
	fs.symlinkSync("/etc/nginx/sites-available/" + username + "." + DOMAIN + ".nginx", "/etc/nginx/sites-enabled/" + username + "." + DOMAIN + "");
	
	var child_process = require('child_process');
	var reloadNginxStdout = child_process.execSync("service nginx reload");
	reloadNginxStdout = reloadNginxStdout.toString(ENCODING);
	if(reloadNginxStdout.trim()) throw new Error(reloadNginxStdout);
	
	console.log("User with username=" + username + " and password=" + password + " successfully added to " + PW_FILE);
	
});

function getGroupId(groupName) {
	var fs = require("fs");
	
	var groupData = fs.readFileSync("/etc/group", ENCODING);
	
	//console.log("groupData=" + groupData);
	
	var groups = groupData.split(/\r|\n/);
	
	// format: jzedit_users:x:115:
	
	for (var i=0, group, name, id; i<groups.length; i++) {
		group = groups[i].split(":");
			name = group[0];
			id = group[2];
			
			if(name == groupName) return parseInt(id);
		}
		
		throw new Error("Unable to find id for groupName=" + groupName);
	}
	
	



function copyFileSync( source, target ) {
	
	var fs = require('fs');
	var path = require('path');
	
	var targetFile = target;
	
	//if target is a directory a new file with the same name will be created
	if ( fs.existsSync( target ) ) {
		if ( fs.lstatSync( target ).isDirectory() ) {
			targetFile = path.join( target, path.basename( source ) );
		}
	}
	
	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync( source, target ) {
	
	var fs = require('fs');
	var path = require('path');
	
	var files = [];
	
	//check if folder needs to be created or integrated
	var targetFolder = path.join( target, path.basename( source ) );
	if ( !fs.existsSync( targetFolder ) ) {
		fs.mkdirSync( targetFolder );
	}
	
	//copy
	if ( fs.lstatSync( source ).isDirectory() ) {
		files = fs.readdirSync( source );
		files.forEach( function ( file ) {
			var curSource = path.join( source, file );
			if ( fs.lstatSync( curSource ).isDirectory() ) {
				copyFolderRecursiveSync( curSource, targetFolder );
			} else {
				copyFileSync( curSource, targetFolder );
			}
		} );
	}
}
	

function chmodrSync (p, mode) {
	// https://github.com/isaacs/chmodr/
	//console.log("chmod mode=" + mode + " p=" + p);
	var fs = require('fs');
	
	var stats = fs.lstatSync(p)
	if (stats.isSymbolicLink()) return;
	if (stats.isDirectory()) return chmodrDirSync(p, mode);
	else return fs.chmodSync(p, mode)
}

function chmodrDirSync (p, mode) {
	//console.log("chmod dir mode=" + mode + " p=" + p);
	var fs = require('fs');
	var path = require('path');
	
	fs.readdirSync(p).forEach(function (child) {
		chmodrSync(path.resolve(p, child), mode);
	})
	return fs.chmodSync(p, mode);
}

function chownrSync(p, uid, gid) {
	//console.log("chown uid=" + uid + " gid=" + gid + " p=" + p);
	var fs = require('fs');
	var stats = fs.lstatSync(p);
	if (stats.isSymbolicLink()) return;
	if (stats.isDirectory()) return chownrDirSync(p, uid, gid);
	else return fs.chownSync(p, uid, gid);
}

function chownrDirSync(p, uid, gid) {
	//console.log("chown dir uid=" + uid + " gid=" + gid + " p=" + p);
	var fs = require('fs');
	var path = require('path');
	
	fs.readdirSync(p).forEach(function (child) {
		chownrSync(path.resolve(p, child), uid, gid);
	});
	return fs.chownSync(p, uid, gid);
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
