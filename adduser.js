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

var defaultDomain = DEFAULT.domain;;
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
var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin_email", "admin_mail"]) || DEFAULT.admin_email;
var NO_CERT = !!getArg(["nocert", "no_cert"]);

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

if(scriptArguments) {
	console.log("Using JSON parameters!");
	username = scriptArguments.username;
	password = scriptArguments.password;
	NO_PW_HASH = scriptArguments.noPwHash;
	NO_CERT = scriptArguments.noCert;
	DOMAIN = scriptArguments.domain || defaultDomain;
	HOME = scriptArguments.home || defaultHome;
	}


var ENCODING = "utf8";

if(!username) throw new Error("No username specified! scriptArguments=" + scriptArguments + " argv=" + maybeJson);
if(!password) throw new Error("No password specified! scriptArguments=" + scriptArguments + " argv=" + maybeJson);
	
	
var etcPasswdString = fs.readFileSync("/etc/passwd", ENCODING);


if(username.match(/[^A-Za-z0-9]/)) throw new Error("Username contains characters that is not a-z or 0-9");

if(username.length < 3) throw new Error("username needs to be at least 3 letters!");
if(username.length > 20) throw new Error("username can not be more then 20 letters!");

console.time("check exist");
// Make sure user not already exist
var userDirs = fs.readdirSync(HOME);
for (var i=0; i<userDirs.length; i++) {
	if(userDirs[i] == username) throw new Error(HOME + "/" + userDirs[i]+ " already exist!");
}

//console.log("etcPasswdString=" + etcPasswdString);
var users = etcPasswdString.split(/\n|\r\n/);
//console.log("users.length=" + users.length);
for (var i=0, name; i<users.length; i++) {
	name = users[i].substring(0, users[i].indexOf(":"));
	//console.log("name=" + name); // Why does it not find name !?
	if(name == username) throw new Error("User " + username + " already exist in /etc/passwd! username=");
}
console.timeEnd("check exist");

var userHomeDir = HOME + username;

if(fs.existsSync(userHomeDir)) throw new Error("Directory already exist: " + userHomeDir);

var zfsPool;

if(!NOZFS) {
	console.time("ZFS");
child_process.exec("zfs list", function execAddUser(err, stdout, stderr) {
	// If zfs doesn't exist we get both an err and stderr.
	// If not super user we get both an err and stderr.
	//console.log("zfs: err=" + (err ? err.message : "") + " stdout=" + stdout + " stderr=" + stderr);
	
	if(stderr.indexOf("zfs: not found") != -1) NOZFS = true;
	else if(err) throw err;
	else {
		
			// zpc/home         3.84G  1.37T  5.02M  /home
			var homeWithoutEndingSlashAndEscapedSlashes = HOME.substr(0, HOME.length-1).replace(/\//, "\\/");
			var rePool = new RegExp("(.*)\\/.*" + homeWithoutEndingSlashAndEscapedSlashes + "\\n");
			var matchPool = stdout.match(rePool);
			
	if(matchPool) {
				zfsPool = matchPool[1];
				
				var zfsCreateStdout = child_process.execSync("zfs create " + zfsPool + userHomeDir);
				zfsCreateStdout = zfsCreateStdout.toString(ENCODING);
				
				if(zfsCreateStdout) console.log(zfsCreateStdout);
				else console.log("Created zfs file system on " + userHomeDir);
				
			}
			else {
				console.warn("No zfs file systems exist for " + HOME + " !");
				NOZFS = true;
			}
			}
		
		console.timeEnd("ZFS");
		adduser();
		
});
}
else adduser();

function adduser() {
	
	// old: 'adduser --system --ingroup jzedit_users ' + username
	//var adduserCmd = 'adduser ' + username + ' --system --group'
	
	// There are often very few uid's available for system users. So create a "regular" user.
	var adduserCmd = 'adduser ' + username + ' --group --disabled-login --shell /bin/false'
	if(!NOZFS) adduserCmd += " --no-create-home";
	
	// adduser: `/usr/sbin/useradd -d /home/guest6 -g guest6 -s /bin/false -u 126 guest6'
	
	console.time("create system user");
child_process.exec(adduserCmd, function execAddUser(err, stdout, stderr) {
	if (err) {
			console.log("adduserCmd=" + adduserCmd);
			throw err;
		}
		
	if(stderr) throw new Error(stderr);
	
		console.timeEnd("create system user");
		
	/*
		Format:
			Adding system user `pelle' (UID 111) ...
			Adding new user `pelle' (UID 111) with group `jzedit_users' ...
			Creating home directory `/home/pelle' ...
			----
		Adding new group `test123' (GID 140) ...
		Adding new user `test123' (UID 126) with group `test123' ...
		Creating home directory `/home/test123' ...
			---
			Adding group `test2' (GID 1005) ...
			Done.
		*/
		
	//console.log("stdout=" + stdout);
	
		var matchUid = stdout.match(/\(UID (\d*)\)/);
	var matchGid = stdout.match(/\(GID (\d*)\)/);
	var matchHomeDir = stdout.match(/home directory `([^' ]*)'/);
	
		if(!matchUid && !matchGid) throw new Error("Unable to fund UID or GUID in stdout=" + stdout);
	//if(!matchGid) throw new Error("Unable to fund GID in stdout=" + stdout);
		if(NOZFS && !matchHomeDir) throw new Error("Unable to fund home directory in stdout=" + stdout);
		
	// Sanity check
	//var matchUserName = stdout.match(/new user `([^' ]*)'/);
		var matchUserName = stdout.match(/Adding (group|new user) `([^' ]*)'/);
	if(!matchUserName) throw new Error("Could not match user name in stdout=" + stdout);
		if(username != matchUserName[2]) throw new Error("The added user's username=" + matchUserName[2] + 
		" is not the username=" + username + " we wanted! stdout=" + stdout + " matchUserName=" + JSON.stringify(matchUserName));
	
		var uid = -1;
		var gid = -1;
		if(matchUid) {
uid = parseInt(matchUid[1]);
		}
		else if(matchGid) {
gid = parseInt(matchGid[1]);
			uid = gid;
		}
		else throw new Error("Unable to find uid or gid from stdout=" + stdout);
		
		var homeDir = UTIL.trailingSlash(userHomeDir);
		if(NOZFS) homeDir = UTIL.trailingSlash(matchHomeDir[1]);
	
		if(homeDir == undefined) throw new Error("Unable to find homeDir from stdout=" + stdout);
		
	//var gid = getGroupId(groupName);
	
	if(NO_PW_HASH) {
			var hashedPassword = password;
		}
		else {
			var pwHash = require("./server/pwHash.js");
			var hashedPassword = pwHash(password);
		}
		
		fs.writeFileSync(UTIL.joinPaths([HOME, username, "/.jzeditpw"]), hashedPassword, ENCODING);
		
	
	
		
		// Add skeleton files ...
	copyFolderRecursiveSync("etc/userdir_skeleton/etc", homeDir);
	//copyFolderRecursiveSync("etc/userdir_skeleton/lib", homeDir);
	//copyFolderRecursiveSync("etc/userdir_skeleton/lib64", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/nodejs", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/run", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/my_web_site", homeDir);
	//copyFolderRecursiveSync("etc/userdir_skeleton/usr", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/.jzeditStorage", homeDir);
	copyFolderRecursiveSync("etc/userdir_skeleton/wwwpub", homeDir);
		copyFolderRecursiveSync("etc/userdir_skeleton/.ssh/", homeDir);
		
		copyFileSync("etc/userdir_skeleton/.bashrc", homeDir + ".bashrc"); // bash settings, how the prompt look etc
		copyFileSync("etc/userdir_skeleton/.npmrc", homeDir + ".npmrc"); // settings for npm
		
		//copyFileSync("etc/userdir_skeleton/testfile.txt", homeDir + "testfile.txt");
		
	// Use the systems dns settings !?
	//copyFileSync("/run/resolvconf/resolv.conf", homeDir + "run/resolvconf/resolv.conf")
	//copyFileSync("/etc/resolv.conf", homeDir + "etc/resolv.conf")
	
	// Use the systems ca's
	//copyFileSync("/etc/ssl/certs/ca-certifacates.crt", homeDir + "etc/ssl/certs/ca-certifacates.crt")
	
	// The user owns his files
	chownrSync(homeDir, uid, gid);
	
	// Make it so that no one else beside the user can read the user files
	chmodrSync(homeDir, "750");
	
	// home dir needs to have execute permissions for everyone for the unix sockets to work !!!?
	fs.chmodSync(homeDir, "751");
	
	// For DNS lookups to work !?
	chmodrSync(homeDir + "etc/", "444");
	chmodrSync(homeDir + "run/", "444");
	
		// .ssh folder is secret!
		chmodrSync(homeDir + ".ssh/", "700");
		
		
	// Try Copy over the test file (only exist in dev)
	try {
			copyFileSync("./testfile.txt", HOME + username + "/testfile.txt");
	}
	catch(err) {
		if(err.code != "ENOENT") throw err;
	}
	
		
	// Update demo site 
	var cmsjz_sites = fs.readFileSync(homeDir + ".jzeditStorage/cmsjz_sites", ENCODING);
	cmsjz_sites = cmsjz_sites.replace(/%USERNAME%/g, username);
	cmsjz_sites = cmsjz_sites.replace(/%HOMEDIR%/g, homeDir);
	cmsjz_sites = cmsjz_sites.replace(/%DOMAIN%/g, DOMAIN);
	fs.writeFileSync(homeDir + ".jzeditStorage/cmsjz_sites", cmsjz_sites);
	
		// Update RSS file in demo site
		var rss_file = fs.readFileSync(homeDir + "my_web_site/source/rss_en.xml", ENCODING);
		rss_file = rss_file.replace(/%USERNAME%/g, username);
		rss_file = rss_file.replace(/%DOMAIN%/g, DOMAIN);
		fs.writeFileSync(homeDir + "my_web_site/source/rss_en.xml", rss_file);
		
	// Update welcome file
	var welcome_file = fs.readFileSync(homeDir + "wwwpub/welcome.html", ENCODING);
	welcome_file = welcome_file.replace(/%USERNAME%/g, username);
	welcome_file = welcome_file.replace(/%DOMAIN%/g, DOMAIN);
	fs.writeFileSync(homeDir + "wwwpub/welcome.html", welcome_file);
		
	
	// add wwwpub
		var wwwgid = getGroupId("www-data");
	//fs.mkdirSync(homeDir + "wwwpub");
	fs.writeFileSync(homeDir + "wwwpub/index.htm", '<doctype html><meta charset="utf-8">Site not yet published', ENCODING);
		chownrDirSync(homeDir + "wwwpub", uid, wwwgid);
	// Make wwwpub public, and set the group-id bit so that all new files get the www-data group
		chmodrSync(homeDir + "wwwpub", "2755");
		
		
		// Enable hggit
		fs.writeFileSync(homeDir + ".hgrc", '\n[extensions]\nhgext.bookmarks =\nhggit =\n\n[ui]\nusername = ' + username + "\n\n", ENCODING);
		
		
		// Create a directory for unix sockets
		fs.mkdirSync(homeDir + "sock");
		// Make sure www-data can read and write to unix sockets
		// https://stackoverflow.com/questions/21342828/node-express-unix-domain-socket-permissions
		chmodrSync(homeDir + "sock", "2770"); // Set the group-id bit so that all new files created will belong to the group
		chownrDirSync(homeDir + "sock", uid, wwwgid);
		// note: Each process needs to set umask to give write permission to the group!
		
	// Create a directory where nginx can save logs
	fs.mkdirSync(homeDir + "log");
		chmodrSync(homeDir + "log", "2770"); // Set the group-id bit so that all new files created will belong to the group
		chownrDirSync(homeDir + "log", uid, gid);
		
		// Create a directory for putting "in production" files
		fs.mkdirSync(homeDir + ".prod");
		chmodrSync(homeDir + ".prod", "770");
		chownrDirSync(homeDir + ".prod", uid, gid);
		
		// Create a directory where npm can install packages globally
		fs.mkdirSync(homeDir + ".npm-packages");
		chmodrSync(homeDir + ".npm-packages", "770");
		chownrDirSync(homeDir + ".npm-packages", uid, gid);
	
		
		// Create nginx profile
		var url_user = UTIL.urlFriendly(username);
		
		var nginxProfile = fs.readFileSync("./etc/nginx/user.webide.se.nginx", ENCODING);
		nginxProfile = nginxProfile.replace(/%USERNAME%/g, url_user);
		nginxProfile = nginxProfile.replace(/%HOMEDIR%/g, homeDir);
		nginxProfile = nginxProfile.replace(/%DOMAIN%/g, DOMAIN);
		
	try {
			fs.writeFileSync("/etc/nginx/sites-available/" + url_user + "." + DOMAIN + ".nginx", nginxProfile);
			fs.symlinkSync("/etc/nginx/sites-available/" + url_user + "." + DOMAIN + ".nginx", "/etc/nginx/sites-enabled/" + url_user + "." + DOMAIN + "");
			
			console.time("Reload nginx");
		var reloadNginxStdout = child_process.execSync("service nginx reload");
		reloadNginxStdout = reloadNginxStdout.toString(ENCODING);
			console.timeEnd("Reload nginx");
			if(reloadNginxStdout.trim()) throw new Error(reloadNginxStdout);
	}
	catch (err) {
		console.warn(err.message + " Nginx web server is probably not installed. Or there's a problem with the profiles. Try sudo nginx -T && sudo service nginx restart");
	}
	
		if(!NO_CERT) {
		// Register SSL certificate for user web page
			console.time("Letsencrypt");
		var letsencrypt = require("./shared/letsencrypt.js");
			letsencrypt.register(url_user + "." + DOMAIN, ADMIN_EMAIL);
			console.timeEnd("Letsencrypt");
		}
		
		
		/*
			In order to have a separate apparmor profile for user_worker.js we need a separate executable (scripts also work, but we need the node rcp channel so we need to use fork and not spawn)
			Use mount --bind instead of hard link to prevent EXDEV: cross-device link not permitted (we sometimes got that error even though the link was on the same device!)
			Note: user_worker.js needs capability setgid, setuid, and sys_chroot, which we don't want to give to user scripts, only user_worker.js!
			It's thus important that when user_worker.js forks, it has to set execPath in fork options!!
			
			It will be mounted the first time user logs in.
		*/
		//mount('/usr/bin/node', '/usr/bin/nodejs_' + username);
		
		//var makeNull = child_process.execSync("mknod -m 444 " + HOME + username + "/dev/null c 1 3").toString(ENCODING);
	//if(makeNull.trim() != "") throw makeNull;
		// /dev/null will be created when user first login
		
	// On some systems we need to mount --bind urandom !??
		//mount("/dev/urandom", HOME + username + "/dev/urandom");
		// Will be mounted when the user logs in
	
	// Create directory for executables
		fs.mkdirSync(HOME + username + "/usr/");
		fs.mkdirSync(HOME + username + "/usr/bin/");
	
		fs.chmodSync(HOME + username + "/usr/", "555");
		fs.chmodSync(HOME + username + "/usr/bin/", "555");
	
	
	// npm needs /usr/local/etc or it will try to create it
		fs.mkdirSync(HOME + username + "/usr/local/");
		fs.mkdirSync(HOME + username + "/usr/local/etc");
		//chownrDirSync(HOME + username + "/usr/local/", uid, gid);
		//chmodrSync(HOME + username + "/usr/local/", "555");
	

	// Mount these instead of copying to save hdd space
		// They will be mounted when the user first login
		/*
		mount("/lib/", HOME + username + "/lib");
		mount("/lib64/", HOME + username + "/lib64");
		mount("/usr/lib/", HOME + username + "/usr/lib");
		mount("/usr/local/lib", HOME + username + "/usr/local/lib"); // Needed for Python packages (hggit)
		mount("/usr/share/", HOME + username + "/usr/share"); // npm dependencies
		mount("/usr/bin/hg", HOME + username + "/usr/bin/hg");
		mount("/usr/bin/python", HOME + username + "/usr/bin/python");
		mount("/usr/bin/nodejs", HOME + username + "/usr/bin/nodejs");
		mount("/etc/ssl/certs", HOME + username + "/etc/ssl/certs"); // Sometimes? Needed for SSL verfification
		*/
	
		
		// See how to debug apparmor in README.txt
		// Apparmor profiles will be created when the user first login
		/*
		createApparmorProfile("./etc/apparmor/usr.bin.nodejs_someuser", username);
		createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.nodejs", username);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.python", username);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.bin.hg", username);
	createApparmorProfile("./etc/apparmor/home.someuser.usr.share.npm.bin.npm-cli.js", username);
		*/
		
		console.log("User with username=" + username + " and password=" + password + " successfully added!");
		
		console.timeEnd("Adding user");
		
	//console.log("Wait a few seconds, then sudo service apparmor reload to prevent EACCESS errors");
	
	});
}

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
	
	// format: jzedit_users:x:115:
	
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
