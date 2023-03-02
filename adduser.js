#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	This is a useful script for those managing webide running as a cloud editor,
	
	Make this script executable:
	sudo chmod +x adduser.js
	
	Run this script (example: add user foouser with password foopw):
	sudo ./adduser.js foouser foopw
	
	Remove a user:
	sudo ./removeuser.js nameOfUser
	
	We want to have as little as possible in this file, and have server.js handle the rest!
	So for example prod, logs, sock, etc folders will be created by server.js
	That way we can move users between servers and users created by old versions will be updated.

	todo: Move as much as possible to server.js to make it easier to move user's between servers!
	For moving users between servers, username, uid, and gid need to be globally unique!
	
*/

if(process.cwd() != __dirname) throw new Error("adduser.js needs to be run in the same dir as the script eg " + __dirname + " while current directory is " + process.cwd());

console.time("Adding user");

var DEFAULT = require("./server/default_settings.js");

var UTIL = require("./client/UTIL.js");

var fs = require("fs");
var child_process = require('child_process');
var copyFileSync = require("./shared/copyFileSync.js");
var copyFolderRecursiveSync = require("./shared/copyFolderRecursiveSync.js");
var chmodrSync = require("./shared/chmodrSync.js");
var chmodrDirSync = require("./shared/chmodrDirSync.js");
var chownrSync = require("./shared/chownrSync.js");
var chownrDirSync = require("./shared/chownrDirSync.js");
var skeleton = require("./shared/skeleton.js");

var defaultDomain = DEFAULT.domain;
var defaultHome = DEFAULT.home_dir;

// Get arguments ...
var getArg = require("./shared/getArg.js");

var username = process.argv[2];
var password = process.argv[3];

if(process.argv[3] == "-c") {
	//console.log(linksTo("/lib/x86_64-linux-gnu/libz.so.1"));
	//process.exit();
	copyNodejs(HOME + username);
	process.exit();
}

var NO_PW_HASH = getArg(["nopwhash"]);
var DOMAIN = getArg(["d", "domain"]) || defaultDomain;
var NOZFS = !!getArg(["nozfs", "nozfs"]);
var HOME = getArg(["home", "home"]) || defaultHome;

if(HOME.charAt(0) != "/") throw new Error("HOME needs to be an absolute path! (start with a slash) HOME=" + HOME);
// Only linux or other unix-like systems are supported (sorry Windows)

if(HOME.charAt(HOME.length-1) != "/") throw new Error("Home dir needs to end with a slash: HOME=" + HOME);

// Favor using JSON as argument to prevent hackers from passing arguments in their password
var maybeJson = process.argv.splice(2, process.argv.length).join(" ");
try { var scriptArguments = JSON.parse(maybeJson); }
catch (err) {
	if(username.charAt(0) == "{") console.log("Unable to parse script parameters as JSON: " + err.message + " maybeJson=" + maybeJson);
var scriptArguments = null; 
}

var UID, GID;

if(scriptArguments) {
	console.log("Using JSON parameters! " + JSON.stringify(scriptArguments, null, 2));
	username = scriptArguments.username;
	password = scriptArguments.password;
	NO_PW_HASH = scriptArguments.noPwHash;
	DOMAIN = scriptArguments.domain || defaultDomain;
	HOME = scriptArguments.home || defaultHome;
	UID = scriptArguments.uid || undefined;
	GID = scriptArguments.gid || undefined;
	}


var ENCODING = "utf8";

if(!username) throw new Error("No username specified! scriptArguments=" + scriptArguments + " argv=" + maybeJson);
if(!password) throw new Error("No password specified! scriptArguments=" + scriptArguments + " argv=" + maybeJson);
	
	if(username.match(/[^A-Za-z0-9]/)) throw new Error("Username contains characters that is not a-z or 0-9");

if(username.length < 3) throw new Error("username needs to be at least 3 letters!");
if(username.length > 20) throw new Error("username can not be more then 20 letters!");

console.time("check exist");
// Make sure user not already exist
var userDirs = fs.readdirSync(HOME);
for (var i=0; i<userDirs.length; i++) {
	if(userDirs[i] == username) throw new Error("Directory " + HOME + userDirs[i]+ " already exist!");
}

var etcPasswdString = fs.readFileSync("/etc/passwd", ENCODING);
//console.log("etcPasswdString=" + etcPasswdString);
var users = etcPasswdString.split(/\n|\r\n/);
//console.log("users.length=" + users.length);
var user, name, uid, gid;
var takenUid = [];
var takenGid = [];
for (var i=0; i<users.length; i++) {
	user = users[i].split(":");
	name = user[0];
	uid = parseInt(user[2]);
	gid = parseInt(user[3]);
	if(name == username) throw new Error("User " + username + " already exist in /etc/passwd!");
	takenUid.push(uid);
	takenGid.push(gid);
}

var etcGroupString = fs.readFileSync("/etc/group", ENCODING);
var groups = etcGroupString.split(/\n|\r\n/);
for (var i=0; i<groups.length; i++) {
	group = groups[i].split(":");
	name = group[0];
	gid = parseInt(group[2]);
	if(name == username) throw new Error("Group name " + username + " already exist in /etc/group!");
	takenGid.push(gid);
}

var userHomeDir = HOME + username;
if(fs.existsSync(userHomeDir)) throw new Error("Directory already exist: " + userHomeDir);

console.timeEnd("check exist");



var zfsPool = "";
var zfsSnapVersion = 0;

if(!NOZFS) {
	console.time("ZFS");
child_process.exec("zfs list -t snapshot", function execAddUser(err, stdout, stderr) {
	// If zfs doesn't exist we get both an err and stderr.
	// If not super user we get both an err and stderr.
	//console.log("zfs: err=" + (err ? err.message : "") + " stdout=" + stdout + " stderr=" + stderr);
	
	if(stderr.indexOf("zfs: not found") != -1) NOZFS = true;
	else if(err) throw err;
	else {
		
			// rpool/home/userskeleton@base1                                                                         0B      -  6.15G  -
			var homeWithoutEndingSlashAndEscapedSlashes = HOME.substr(0, HOME.length-1).replace(/\//, "\\/");
			var reSnap = new RegExp("(.*)" + homeWithoutEndingSlashAndEscapedSlashes + "\\/userskeleton@base(\\d+)", "g"); // Must have the g flag or exec will run in an endless loop!
			var matchSnap = stdout.match(reSnap);
			
			if(matchSnap) {
				
				var snapshots = [];
				
				while ((matchSnap = reSnap.exec(stdout)) !== null) {
					
					snapshots.push({pool: matchSnap[1], ver: parseInt(matchSnap[2])});
				}
				
				snapshots.sort(function(a, b) {
					// Highest number first
					if(a.ver > b.ver) return -1;
					else if(b.ver > a.ver) return 1;
					else return 0;
				});
				
				zfsPool = snapshots[0].pool;
				zfsSnapVersion = snapshots[0].ver;
				
				//console.log("snapshots=" + JSON.stringify(snapshots) + " zfsPool=" + zfsPool + " zfsSnapVersion=" + zfsSnapVersion + " ");
				//process.exit();
				
				console.log("zfsPool=" + zfsPool + " zfsSnapVersion=" + zfsSnapVersion);
				
				var zfsclone = child_process.execSync("zfs clone " + zfsPool + homeWithoutEndingSlashAndEscapedSlashes + "/userskeleton@base" +zfsSnapVersion + " " + zfsPool + userHomeDir);
				zfscloneStdout = zfsclone.toString(ENCODING);
				
				if(zfscloneStdout) console.log(zfscloneStdout);
				else console.log("Created zfs file system on " + userHomeDir);
				
			}
			else {
				console.log("reSnap=" + reSnap);
				console.log("stdout=" + stdout);
				console.log("userskeleton zfs with a base# snapshot was not found! Create a snapshot for userskeleton or run with -nozfs flag!");
				process.exit();
				NOZFS = true;
			}
		}
		
		console.timeEnd("ZFS");
		adduser();
		
	});
}
else adduser();

function findFreeUid() {
	var minUid = 1000;
	var maxUid = 60000;
	for (var uid=minUid; uid<maxUid; uid++) {
		if(takenGid.indexOf(uid) != -1) continue; // Try to get the same uid as gid
		if(takenUid.indexOf(uid) == -1) return uid;
	}
	throw new Error("All uid's are taken! Try deleting some users.");
}

function findFreeGid() {
	var minGid = 1000;
	var maxGid = 60000;
	for (var gid=minGid; gid<maxGid; gid++) {
		if(takenGid.indexOf(gid) == -1) return gid;
	}
	throw new Error("All gid's are taken! Try deleting some users/groups.");
}

function createSystemUser(name, uid, gid, homeDir, callback) {
	if(typeof uid == "function" && gid == undefined) {
		callback = uid;
		uid = undefined;
	}
	
	if(callback == undefined) throw new Error("No callback defined!");
	
	if(uid == undefined) uid = findFreeUid();
	if(gid == undefined) gid = findFreeGid();
	
	if(homeDir == undefined) {
		// Create the home dir
		homeDir = HOME + name;
		fs.mkdir(homeDir, function(err) {
			if(err) return callback(err);
			
			addGroupAndUser();
			// No need to chmod or chown as that will be done later in this script
			/*
				fs.chown(homeDir, uid, gid, function(err) {
				if(err) throw err;
				
				fs.chmod(homeDir, mode, function() {
				if(err) throw err;
				addGroupAndUser();
				});
				});
			*/
		});
	}
	else addGroupAndUser();
	
	function addGroupAndUser() {
		
		var groupName = name;
		var groupaddCmd = "groupadd -g " + gid + " " + groupName;
		// sudo groupadd -g 144 testgroup
		var shell = "/bin/false";
		var useraddCmd = "useradd -d " + homeDir + " -g " + groupName + " -s " + shell + " -u " + uid + " " + name;
		// sudo useradd -d /home/testuser -g testgroup -s /bin/false -u 133 testuser
		
		child_process.exec(groupaddCmd, function execGroupadd(err, stdout, stderr) {
			if(err || stderr) console.log("groupaddCmd=" + groupaddCmd + " err.message=" + (err && err.message) + " stderr=" + stderr);
			
			if (err) return callback(err);
			if(stderr) return callback(new Error(stderr));
			
			console.log("groupadd stdout=" + stdout);
			
			/*
				groupadd: GID '144' already exists
				(Might already have been added to /etc/group)
				
				If groupadd is success it will not return anything
			*/
			
			child_process.exec(useraddCmd, function execUseradd(err, stdout, stderr) {
				if(err || stderr) console.log("useraddCmd=" + useraddCmd + " err.message=" + (err && err.message) + " stderr=" + stderr);
				
				if(stderr) {
					if(stderr.match(/useradd: UID (\d*) is not unique/)) console.warn("Race condition detected!");
					return callback(new Error(stderr));
				}
				
				if (err) return callback(err);
				
				console.log("useradd stdout=" + stdout);
				
				/*
					If useradd is success it will not return anything
				*/
				
				return callback(null, name, uid, gid, homeDir);
				
			});
			
		});
	}
	
	
}


function adduser() {
	
	/*
		We get errors like "useradd: UID 132 is not unique" when using adduser. 
		So we'll use the low level useradd and groupadd instead.
	*/
	
	console.time("create system user");
	createSystemUser(username, UID, GID, NOZFS ? undefined : userHomeDir, function systemUserCreated(err, username, uid, gid, homeDir) {
		if(err) throw err;
		
		console.timeEnd("create system user");
		
		if(typeof uid != "number") throw new Error("uid=" + uid + " needs to be a number. Not a " + (typeof uid));
		if(typeof gid != "number") throw new Error("gid=" + gid + " needs to be a number. Not a " + (typeof gid));
		
		console.log("uid=" + uid);
		console.log("gid=" + gid);
		
		if(homeDir == undefined) throw new Error("createSystemUser called back with homeDir=" + homeDir);
		
		homeDir = UTIL.trailingSlash(homeDir);
		
		var netnsIP = UTIL.int2ip(167772162 + uid); // Starts on 10.0.0.2 then adds the uid to get a unique local IP address
		var dockerVMIP = UTIL.int2ip(167903234 + uid) // Starts on 10.2.0.2 ...
		
		/*
			todo: Clone fs from _base_user_
			* Update all instances of _base_user_ to the username
			* Update the password file
			* Replace netnsIP and dockerVMIP
		*/
		
		//var gid = getGroupId(groupName);
		
		// if(NOZFS) ... If we could remember to always update the userskeleton user when we make changes to the userdir_skeleton files...
		console.time("Update skeleton files");
			skeleton.update({username: username, homeDir: homeDir, domain: DOMAIN, netnsIP: netnsIP, dockerVMIP: dockerVMIP, uid: uid, gid: gid});
			console.timeEnd("Update skeleton files");
		

		// Try Copy over the test file (only exist in dev)
		try {
			copyFileSync("./testfile.txt", HOME + username + "/testfile.txt");
		}
		catch(err) {
			if(err.code != "ENOENT") throw err;
		}

		// Enable hggit
		fs.writeFileSync(homeDir + ".hgrc", '\n[extensions]\nhgext.bookmarks =\nhggit =\n\n[ui]\nusername = ' + username + "\n\n", ENCODING);



		// Activate the user by creating the password file
		if(NO_PW_HASH) {
			var hashedPassword = password;
		}
		else {
			console.time("hashing password");
			var pwHash = require("./server/pwHash.js");
			var hashedPassword = pwHash(password);
			console.timeEnd("hashing password");
		}

		fs.writeFileSync(UTIL.joinPaths([HOME, username, ".webide/", "password"]), hashedPassword, ENCODING);

		
console.time("chownrSync " + homeDir);
		// The user owns his files
		//chownrSync(homeDir, uid, gid); // 8138.152ms
		child_process.execSync("chown -R " + uid + ":" + gid + " " + homeDir); // 3787.743ms
		console.timeEnd("chownrSync " + homeDir);

		// Make it so that no one else beside the user can read the user files
		console.time("chmodrSync " + homeDir);
		//chmodrSync(homeDir, "750"); // 6868.963ms
		child_process.execSync("chmod 750 -R " + homeDir); // 2021.330ms
		console.timeEnd("chmodrSync " + homeDir);
		
		// Nginx (www-data) need -x permission on all folders in order to stat! sudo -u www-data stat /home/ltest1/wwwpub/
		fs.chmodSync(homeDir, "751");
		// Give back read permission to all files ín wwwpub
		run("chown -R " + username + ":www-data " + UTIL.joinPaths([homeDir, "wwwpub/"]));
		run("chmod 2755 " + UTIL.joinPaths([homeDir, "wwwpub/"])); // New created files will get the same group as parent directory group
		run("find " + UTIL.joinPaths([homeDir, "wwwpub/"]) + " -type f -exec chmod 744 {} +" ); // Files does not need execute permission
		run("find " + UTIL.joinPaths([homeDir, "wwwpub/"]) + " -type d -exec chmod 2755 {} +" ); // Folders need execute permission for Nginx to list files. New created files will get the same group as parent directory group

		// There might be an old lingering nginx profile...
		var url_user = UTIL.urlFriendly(username);
		var nginxProfile = "/etc/nginx/sites-available/" + url_user + "." + DOMAIN + ".nginx";
		var nginxProfileSymlink = "/etc/nginx/sites-enabled/" + url_user + "." + DOMAIN + "";
		console.log("Deleting " + nginxProfileSymlink);
		try {
			fs.unlinkSync(nginxProfileSymlink);
			fs.unlinkSync(nginxProfile);
		}
		catch(err) {
			if(err.code == "ENOENT") {
				// There where no lingering nginx profile
			}
			else throw err;
		}


		// For DNS lookups to work !?
		//chmodrSync(homeDir + "etc/", "444");
		//chmodrSync(homeDir + "run/", "444");
		
		// .ssh folder is secret!
		child_process.execSync("chmod 700 -R " + homeDir + ".ssh/");
		


		if(!NOZFS) {
			
			//var userSkeletonNetnsIP = UTIL.int2ip(167772162 + 1005);
			//var userSkeletonDockerVMIP = UTIL.int2ip(167903234 + 1005);
			
			//recursiveReplaceInFiles(homeDir, "userskeleton", username); // too slow!
			
			// The recursive replace takes too long, so replace single files...
			
			// grep -rnw '/home/userskeleton/' -e 'userskeleton'
			
			console.time("replaceUsername");
			replaceUsername(homeDir + ".webide/storage/cmsjz_sites");
			replaceUsername(homeDir + "ssg_blog_example/source/rss_en.xml");
			replaceUsername(homeDir + "wwwpub/welcome.htm");
			replaceUsername(homeDir + "nodejs_examples/http_server/http_server_example.js");
			replaceUsername(homeDir + ".android/avd/Pixel_2_API_25.avd/hardware-qemu.ini");
			replaceUsername(homeDir + ".android/avd/Pixel_2_API_25.avd/snapshots/default_boot/hardware.ini");
			replaceUsername(homeDir + ".android/avd/Pixel_2_API_25.avd/emu-launch-params.txt");
			replaceUsername(homeDir + ".android/avd/Pixel_2_API_25.ini");
			replaceUsername(homeDir + ".android/adb.5037");
			replaceUsername(homeDir + ".config/Android Open Source Project/Emulator.conf");
			replaceUsername(homeDir + ".java/fonts/1.8.0_202-release/fcinfo-1-localhost-Ubuntu-18.04-en.properties");
			replaceUsername(homeDir + ".AndroidStudio3.5/config/options/path.macros.xml");
			replaceUsername(homeDir + ".AndroidStudio3.5/system/.home");
replaceUsername(homeDir + ".npmrc");
			//replaceUsername(homeDir + "");
			
			console.timeEnd("replaceUsername");
			
		}
		
		function replaceUsername(path) {
			replaceInFile(path, "userskeleton", username);
		}
		
		console.log("User with username=" + username + ", password=" + password + ", uid=" + uid + ", gid=" + gid + ", homeDir=" + homeDir + " successfully added! ");
		
		console.timeEnd("Adding user");
		
		
		
		function replaceInFile(path, find, replace) {
			var str = fs.readFileSync(path, ENCODING);
			var re = new RegExp(find, "g");
			str = str.replace(re, replace);
			fs.writeFileSync(path, str);
		}
		
		
		
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

function mount(source, target) {
	var fs = require("fs");
	
	if ( fs.lstatSync( source ).isDirectory() ) {
		// The source is a directory. Create a directory!
		makeDirPsync(target);
		
	} else {
		// The source is not a directory (it's a file!?). Check if the file exist, then create it
		if ( fs.existsSync( target ) ) throw new Error("File aready exist: " + target); // Prevent overwriting
		fs.closeSync(fs.openSync(target, 'w')); // Create emty file
	}
	
	var mountResult = child_process.execSync("mount --bind " + source + " " + target ).toString(ENCODING).trim();
	if(mountResult != "") throw mountResult;
	
	// Append to /etc/fstab so it is re-mounted after reboot
	//fs.appendFileSync('/etc/fstab', source + '   ' +  target + ' none bind 0 0\n')
	// Server was unable to boot after adding stuff to fstab!!
	
}

function makeDirPsync(target) {
	// Make all the directories in the path ...
	// Should we check if they exist first, or just try creating them all !?
	target = UTIL.trailingSlash(target);
	var paths = UTIL.getFolders(target);
	for (var i=0; i<paths.length; i++) {
		try {
			fs.mkdirSync(paths[i]);
		}
		catch(err) {
			if(err.code != "EEXIST") throw err;
		}
	}
}

function copyProgram(program, homeDir) {
	/*
		Copy a program so it can be spawned from chroot
		Asume the program is located in /usr/bin/
	*/
	
	homeDir = UTIL.trailingSlash(homeDir);
	
	try {
		fs.mkdirSync(homeDir + "usr");
		fs.mkdirSync(homeDir + "usr/bin");
		copyFileSync("/usr/bin/" + program, homeDir + "usr/bin/" + program);
	}
	catch(err) {
		if(err.code != "EEXIST") throw err;
	}
	
	fs.chmodSync(homeDir + "usr/bin/" + program, "555");
	
	// Copy dependencies that the program needs
	var deps = child_process.execSync("ldd " + homeDir + "usr/bin/" + program).toString(ENCODING);
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
	
	// format: groupname:x:115:
	
	for (var i=0, group, name, id; i<groups.length; i++) {
		group = groups[i].split(":");
		name = group[0];
		id = group[2];
		
		if(name == groupName) return parseInt(id);
	}
	
	throw new Error("Unable to find id for groupName=" + groupName);
}

function replaceInFileSync(filePath, arrSearchReplace) {
	var fs = require("fs");
	
	// arrSearchReplace = [searchString, replaceString]
	var text = fs.readFileSync(filePath, ENCODING);
	var maxCount = 500; // Prevent endless loop
	for (var i=0, searchString="", replaceString="", counter=0; i<arrSearchReplace.length; i++) {
		counter = 0;
		while(text.indexOf(searchString) != -1 && counter++ < maxCount) {
		searchString = arrSearchReplace[i][0];
		replaceString = arrSearchReplace[i][1];
		text = text.replace(searchString, replaceString);
			}
	}
	
	fs.writeFileSync(filePath, text, ENCODING);
	
}

function recursiveReplaceInFiles(dir, find, replace) {
	var cmd = "find " + dir + " \\( -type d -name .git -prune \\) -o -type f -print0 | xargs -0 sed -i 's/" + find + "/" + replace + "/g'";
	console.log("recursiveReplace " + find + " in " + dir + " cmd=" + cmd);
	console.time("recursiveReplace " + find + " in " + dir);
	//child_process.execSync(cmd, {shell: "/bin/bash"});
	console.timeEnd("recursiveReplace " + find + " in " + dir);
}

function run(cmd) {
	var stdout = child_process.execSync(cmd).toString(ENCODING);
	if(stdout.trim()) throw new Error(stdout);
}


