#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	This is a useful script for those managing jzedit running as a cloud editor,
	it will add users both as system users and into the /etc/jzedit_users file.
	
	Make this script executable:
	sudo chmod +x adduser.js
	
	Run this script (example: add user foouser with password foopw):
	./adduser.js foouser foopw
	
	Remove a user:
	sudo userdel -r -f nameOfUser
	sudo nano server/users.pw
	
	Gotcha: apparmor can be slooow to update profiles
	
*/

var fs = require("fs");
var child_process = require('child_process');

var defaultPasswordFile = process.platform == "win32" ? "./users.pw" : "/etc/jzedit_users"
var defaultDomain = "webide.se";

// Get arguments ...
var getArg = require("./server/getArg.js");

var username = process.argv[2];
var password = process.argv[3];

if(process.argv[3] == "-c") {
	//console.log(linksTo("/lib/x86_64-linux-gnu/libz.so.1"));
	//process.exit();
	copyNodejs("/home/" + username);
	process.exit();
}

var NO_PW_HASH = getArg(["nopwhash"]);
var PW_FILE = getArg(["pwfile", "pwfile", "passwordFile"]) || defaultPasswordFile;
var DOMAIN = getArg(["d", "domain"]) || defaultDomain;


// Favor using JSON as argument to prevent hackers from passing arguments in their password
var maybeJson = process.argv.splice(2, process.argv.length).join(" ");
try { var scriptArguments = JSON.parse(maybeJson); }
catch (err) {
	if(username.charAt(0) == "{") console.log("Unable to parse script parameters as JSON: " + err.message + " maybeJson=" + maybeJson);
var scriptArguments = null; 
}

if(scriptArguments) {
	console.log("Using JSON parameters!");
	username = scriptArguments.username;
	password = scriptArguments.password;
	NO_PW_HASH = scriptArguments.noPwHash;
	PW_FILE = scriptArguments.pwFile || defaultPasswordFile;
	DOMAIN = scriptArguments.domain || defaultDomain;
	}


var ENCODING = "utf8";

if(!username) throw new Error("No username specified! scriptArguments=" + scriptArguments + " argv=" + maybeJson);
if(!password) throw new Error("No password specified! scriptArguments=" + scriptArguments + " argv=" + maybeJson);
	
	

try {
	var usersPwString = fs.readFileSync(PW_FILE, ENCODING);
	}
catch(err) {
	if(err.code != "ENOENT") throw err;
	var usersPwString = "";
	console.log("File not found! PW_FILE=" + PW_FILE + " (it will be created)");
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
	if(name == username) throw new Error("User " + username + " already exist in " + PW_FILE + "!");
}
//console.log("etcPasswdString=" + etcPasswdString);
var users = etcPasswdString.split(/\n|\r\n/);
//console.log("users.length=" + users.length);
for (var i=0, name; i<users.length; i++) {
	name = users[i].substring(0, users[i].indexOf(":"));
	//console.log("name=" + name); // Why does it not find name !?
	if(name == username) throw new Error("User " + username + " already exist in /etc/passwd! username=");
}



// old: 'adduser --system --ingroup jzedit_users ' + username

child_process.exec('adduser ' + username + ' --system --group', function execAddUser(err, stdout, stderr) {
	if (err) throw err;
	
	if(stderr) throw new Error(stderr);
	
	/*
		Format:
			Adding system user `pelle' (UID 111) ...
			Adding new user `pelle' (UID 111) with group `jzedit_users' ...
			Creating home directory `/home/pelle' ...
		
		Adding new group `test123' (GID 140) ...
		Adding new user `test123' (UID 126) with group `test123' ...
		Creating home directory `/home/test123' ...
		
		*/
		
	//console.log("stdout=" + stdout);
	
		var matchUid = stdout.match(/\(UID (\d*)\)/);
	var matchGid = stdout.match(/\(GID (\d*)\)/);
	var matchHomeDir = stdout.match(/home directory `([^' ]*)'/);
	
		if(!matchUid) throw new Error("Unable to fund UID in stdout=" + stdout);
	if(!matchGid) throw new Error("Unable to fund GID in stdout=" + stdout);
		if(!matchHomeDir) throw new Error("Unable to fund UID in stdout=" + stdout);
		
	// Sanity check
	var matchUserName = stdout.match(/new user `([^' ]*)'/);
	if(!matchUserName) throw new Error("Could not match user name in stdout=" + stdout);
	if(username != matchUserName[1]) throw new Error("The added user's username=" + matchUserName[1] + " is not the username=" + username + " we wanted! stdout=" + stdout);
	
		var uid = parseInt(matchUid[1]);
	var gid = parseInt(matchGid[1]);
		var homeDir = matchHomeDir[1];
	
	//var gid = getGroupId(groupName);
	
	if(NO_PW_HASH) {
			var hashedPassword = password;
		}
		else {
			var pwHash = require("./server/pwHash.js");
			var hashedPassword = pwHash(password);
		}
		
		usersPwString += username + "|" + hashedPassword + "|" + homeDir + "|" + uid + "|" + gid + "\n";
		
	fs.writeFileSync(PW_FILE, usersPwString, ENCODING);
		
	
	
		
		// Add skeleton files (the folder will be copied)
	copyFolderRecursiveSync("etc/userdir_skeleton/etc", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/lib", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/lib64", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/nodejs", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/run", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/static_site_demo", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/usr", homeDir);
	
		// Give the SSG-demo folder a better name
		fs.renameSync(homeDir + "/static_site_demo/", homeDir + "/my_web_site");
		
	// Fix permissions !?
	
	
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
		
		// Make it so that no one else beside the user can read the user files
		chmodrSync(homeDir, "751");
		// home dir needs to have execute permissions for everyone for the unix socket to work !!!?
		
		// Make wwwpub public
		chmodrSync(homeDir + "/wwwpub", "755");
		
		
		// Create a directory for unix sockets
		fs.mkdirSync(homeDir + "/sock");
		chmodrSync(homeDir + "/sock", "2770"); // Set the group-id bit so that all new files created will belong to the group
		// Make sure www-data can read and write to unix socket
		// https://stackoverflow.com/questions/21342828/node-express-unix-domain-socket-permissions
		var wwwgid = getGroupId("www-data");
		chownrSync(homeDir + "/sock", uid, wwwgid);
		// note: Each process needs to set umask to give write permission to the group!
		
		
		// Create nginx profile
		var nginxProfile = fs.readFileSync("./etc/nginx/user.webide.se.nginx", ENCODING);
		nginxProfile = nginxProfile.replace(/%USERNAME%/g, username);
		nginxProfile = nginxProfile.replace(/%HOMEDIR%/g, homeDir);
		nginxProfile = nginxProfile.replace(/%DOMAIN%/g, DOMAIN);
		
		fs.writeFileSync("/etc/nginx/sites-available/" + username + "." + DOMAIN + ".nginx", nginxProfile);
		fs.symlinkSync("/etc/nginx/sites-available/" + username + "." + DOMAIN + ".nginx", "/etc/nginx/sites-enabled/" + username + "." + DOMAIN + "");
		
		var reloadNginxStdout = child_process.execSync("service nginx reload");
		reloadNginxStdout = reloadNginxStdout.toString(ENCODING);
		if(reloadNginxStdout.trim()) throw new Error(reloadNginxStdout);
		
	
	
	// Create a hard link to nodejs for use with user_worker.js so that we can have a apparmor profile on it
	fs.linkSync('/usr/bin/nodejs', '/usr/bin/nodejs_' + username);
	
	var apparmorProfile = fs.readFileSync("./etc/apparmor/usr.bin.nodejs_someuser", ENCODING);
	apparmorProfile = apparmorProfile.replace(/%USERNAME%/g, username);
	apparmorProfile = apparmorProfile.replace(/%JZEDIT%/g, __dirname);
	fs.writeFileSync("/etc/apparmor.d/usr.bin.nodejs_" + username, apparmorProfile);
	var enforceApparmorProfileStdout = child_process.execSync("aa-enforce /usr/bin/nodejs_" + username).toString(ENCODING).trim();
	if(!enforceApparmorProfileStdout.match(/Setting (.*) to enforce mode./)) throw new Error(enforceApparmorProfileStdout);
	
	// See how to debug apparmor in README.txt
	
	//var reloadApparmor = child_process.execSync("service apparmor reload").toString(ENCODING).trim();
	//if(reloadApparmor != "") throw reloadApparmor;
	
	//var nodeJsVersion = child_process.execSync("nodejs -v").toString(ENCODING).trim();
	//console.log(nodeJsVersion);
	//copyProgram("nodejs", homeDir)
	
	//var pythonVersion = child_process.execSync("nodejs -v").toString(ENCODING).trim();
	//console.log(pythonVersion);
	//copyProgram("python", homeDir)
	
	// Copy the python libs
	//copyFolderRecursiveSync("/usr/lib/python2.7/", "/home/" + username + "/usr/lib/python2.7/");
	
	// Copy mercurial
	//copyFileSync("/usr/bin/hg", "/home/" + username + "/usr/bin/hg");
	
	
	// Nodejs needs /dev/urandom and /dev/null to start
	fs.mkdirSync(homeDir + "/dev");
	
	var makdeUrandom = child_process.execSync("mknod -m 444 /home/" + username + "/dev/urandom c 1 9").toString(ENCODING);
	if(makdeUrandom.trim() != "") throw makdeUrandom;
	
	var makeNull = child_process.execSync("mknod -m 444 /home/" + username + "/dev/null c 1 3").toString(ENCODING);
	if(makeNull.trim() != "") throw makeNull;
	
	// On some system we need to mount --bind urandom !??
	var mountUrandom = child_process.execSync("mount --bind /dev/urandom /home/" + username + "/dev/urandom").toString(ENCODING).trim();
	if(mountUrandom != "") throw mountUrandom;
	
	// Create and activate apparmor profile for the user's nodejs binary
	var apparmorProfile = fs.readFileSync("./etc/apparmor/home.someuser.usr.bin.nodejs", ENCODING);
	apparmorProfile = apparmorProfile.replace(/%USERNAME%/g, username);
	fs.writeFileSync("/etc/apparmor.d/home." + username + ".usr.bin.nodejs", apparmorProfile);
	var enforceApparmorProfileStdout = child_process.execSync("aa-enforce /usr/bin/nodejs_" + username).toString(ENCODING).trim();
	if(!enforceApparmorProfileStdout.match(/Setting (.*) to enforce mode./)) throw new Error(enforceApparmorProfileStdout);
	
	// Create and activate apparmor profile for the user's python binary
	var apparmorProfile = fs.readFileSync("./etc/apparmor/home.someuser.usr.bin.python", ENCODING);
	apparmorProfile = apparmorProfile.replace(/%USERNAME%/g, username);
	fs.writeFileSync("/etc/apparmor.d/home." + username + ".usr.bin.nodejs", apparmorProfile);
	var enforceApparmorProfileStdout = child_process.execSync("aa-enforce /usr/bin/nodejs_" + username).toString(ENCODING).trim();
	if(!enforceApparmorProfileStdout.match(/Setting (.*) to enforce mode./)) throw new Error(enforceApparmorProfileStdout);
	
		console.log("User with username=" + username + " and password=" + password + " successfully added to " + PW_FILE);
		
	//console.log("Wait a few seconds, then sudo service apparmor reload to prevent EACCESS errors");
	
	});

function copyProgram(program, homeDir) {
	/*
		Copy a program so it can be spawned from chroot
		Asume the program is located in /usr/bin/
	*/
	
	try {
	fs.mkdirSync(homeDir + "/usr");
	fs.mkdirSync(homeDir + "/usr/bin");
		copyFileSync("/usr/bin/" + program, homeDir + "/usr/bin/" + program);
	}
	catch(err) {
		if(err.code != "EEXIST") throw err;
	}
	
	fs.chmodSync(homeDir + "/usr/bin/" + program, "555");
	
	// Copy dependencies that the program needs
	var deps = child_process.execSync("ldd " + homeDir + "/usr/bin/" + program).toString(ENCODING);
	deps = deps.split(/\n|\r\n/);
	var foldersCreated = [];
	for (var i=0, folders, dir, link; i<deps.length; i++) {
		//console.log(i + ") " + deps[i] + "");
		deps[i] = deps[i].substring(deps[i].indexOf("=>") + 2, deps[i].indexOf("(")-1).trim();
		//console.log(i + ") *" + deps[i] + "*");
		if(deps[i] == "") continue;
		folders = deps[i].split("/");
		dir = homeDir;
		for (var j=1; j<folders.length-1; j++) {
			dir = dir + "/" + folders[j];
			if(foldersCreated.indexOf(dir) != -1) continue;
			try {
				//console.log("Creating folder: " + dir);
				fs.mkdirSync(dir);
				foldersCreated.push(dir);
			}
			catch(err) {
				if(err.code != "EEXIST") throw err;
			}
		}
		// The link to the dep can also be a link itself, so check (recursively) until we find the file
		link = linksTo(deps[i]);
		if(link != null) {
			//console.log("Adding link=" + link);
			deps.push(deps[i] + " => " + link + " ()");
		}
		console.log("Copying " + deps[i]);
		copyFileSync(deps[i], homeDir + deps[i]);
		}
	for (var i=0; i<foldersCreated.length; i++) {
		chmodrSync(foldersCreated[i], "555"); // lib files needs read and execute permission!
	}
}

function linksTo(filePath) {
	try {
		var linkPath = fs.readlinkSync(filePath);
	}
	catch(err) {
		if(err.code == "EINVAL") return null;
		else throw err;
	}
	
	if(linkPath.charAt(0) != "/") {
		// Links to another file in *the same folder*
		var paths = filePath.split("/");
		for (var i=paths.length-2; i>-1; i--) {
			linkPath = paths[i] + "/" + linkPath;
		}
	}
	
	return linkPath;
}

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
