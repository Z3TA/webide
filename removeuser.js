#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

var defaultGroupName = "jzedit_users";
var defaultDomain = "webide.se";

// Get arguments ...
var getArg = require("./shared/getArg.js");

var username = process.argv[2];

var DOMAIN = getArg(["d", "domain"]) || defaultDomain;

var NOZFS = !!getArg(["nozfs", "nozfs"]);

var HOME = getArg(["home", "home"]) || "/home/";

var FORCE = !!getArg(["force", "force"]) || false;

if(HOME.charAt(HOME.length-1) != "/") throw new Error("Home dir needs to end with a slash: HOME=" + HOME);

var ENCODING = "utf8";

if(!username) throw new Error("No username specified!");

var UTIL = require("./client/UTIL.js");

var fs = require("fs");
var child_process = require('child_process');



if(!FORCE) {
	// Make sure it's a jzedit user!
	try {
var hashedPw = fs.readFileSync(UTIL.joinPaths([HOME, username, ".jzeditpw"]), ENCODING);
// Should throw if the file doesn't exist!
}
catch(err) {
		console.log(err.message);
		console.log(username + " is probably not a jzedit user. Use -force flag to delete anaway.");
		process.exit();
	}
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
	
	// Reload nginx to remove descriptors to files in user home dir
	try {
		var nginxReloadStdout = child_process.execSync("service nginx reload && sleep 2");
	}
	catch(err) {
		if(err.message.indexOf("nginx.service is not active, cannot reload.") == -1) throw err;
	}
	
	// Remove apparmor profiles
	unlink("/etc/apparmor.d/usr.bin.nodejs_" + username);
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.node");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.python");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.hg");
unlink("/etc/apparmor.d/home." + username + ".usr.lib.node_modules.npm.bin.npm-cli.js");
	
	//var reloadApparmor = child_process.execSync("service apparmor reload").toString(ENCODING).trim();
	//if(reloadApparmor != "") throw reloadApparmor;
	
	
	umount("/usr/bin/nodejs_" + username); // Used by user_worker.js 
unlink("/usr/bin/nodejs_" + username); // Remove the dummy file. It's very important that umount comes before unlink!! Or the target which the mount points to will be deleted""
	
	// We don't want to accidently mess with any of these, so just in case we are doing some debugging
	/*
		umount("/home/" + username + "/dev/", true);
		umount("/home/" + username + "/lib/", true);
		umount("/home/" + username + "/lib64/", true);
		umount("/home/" + username + "/usr/", true);
		umount("/home/" + username + "/etc/", true);
		umount("/home/" + username + "/run/", true);
	*/
	
	// Very important that these are unmounted before the directories are deleted! (or we might delete the host systems files)
	umount("/home/" + username + "/dev/urandom");
	umount("/home/" + username + "/lib");
	umount("/home/" + username + "/lib64");
umount("/home/" + username + "/usr/lib");
	umount("/home/" + username + "/usr/local/lib");
	//umount("/home/" + username + "/usr/share");
umount("/home/" + username + "/usr/bin/bash");
umount("/home/" + username + "/dev/ptmx");
umount("/home/" + username + "/dev/pts");
umount("/home/" + username + "/proc/cpuinfo");
umount("/home/" + username + "/proc/stat");
umount("/home/" + username + "/proc/sys/vm/overcommit_memory");
umount("/home/" + username + "/usr/bin/env");
	umount("/home/" + username + "/usr/bin/hg");
	umount("/home/" + username + "/usr/bin/python");
	umount("/home/" + username + "/usr/bin/node");
	umount("/home/" + username + "/etc/ssl/certs");
	
	if(!NOZFS) {
		// Need to get the zfs pool
		child_process.exec("zfs list", function execAddUser(err, stdout, stderr) {
			var zfsDestroyRetry = 0;
			
			if(stderr.indexOf("zfs: not found") != -1) NOZFS = true;
			else if(err) throw err;
			else {
				
				var homeWithoutEndingSlashAndEscapedSlashes = HOME.substr(0, HOME.length-1).replace(/\//, "\\/");
				var rePool = new RegExp("(.*)\\/.*" + homeWithoutEndingSlashAndEscapedSlashes + "\\n");
				var matchPool = stdout.match(rePool);
				
				if(matchPool) {
					var zfsPool = matchPool[1];
					var userHomeDir = HOME + username;
					zfsDestroy(zfsPool, userHomeDir);
					
				}
				else {
					console.warn("No zfs file systems exist for " + HOME + " !");
					NOZFS = true;
				}
				
			}
			
			function zfsDestroy(zfsPool, userHomeDir) {
				
				if(++zfsDestroyRetry > 1) throw new Error("Unable to destroy " + zfsPool + userHomeDir + "! See errors above.");
				
				try {
					var zfsDestroyStdout = child_process.execSync("zfs destroy " + zfsPool + userHomeDir);
					zfsDestroyStdout = zfsDestroyStdout.toString(ENCODING);
				}
				catch(zfsDestroyErr) {
					if(zfsDestroyErr.message.indexOf("cannot open '" + zfsPool + HOME + username + "': dataset does not exist") != -1) {
						console.log("zfsDestroyErr: " + zfsDestroyErr.message);
					}
					if(zfsDestroyErr.message.indexOf("umount: " + HOME + username + ": target is busy") != -1) {
						// If you get umount: target is busy, try: sudo lsof | grep '/home/username'
						// Try to restart jzedit server to see if it helps
					// Last resort is to reboot to get rid of all the mounts
						try {
							var restartJzeditStdout = child_process.execSync("service jzedit restart");
							restartJzeditStdout = restartJzeditStdout.toString(ENCODING);
						}
						catch(restartJzeditErr) {
							console.log("restartJzeditErr: " + restartJzeditErr.message);
							throw new Error("Unable to restart jzedit service. You have to manually run sudo lsof " + HOME + username + " and kill the processes that are using it.");
						}
						if(restartJzeditStdout) console.log(restartJzeditStdout);
						zfsDestroy(zfsPool, userHomeDir); // Try again
						
					}
					else throw zfsDestroyErr;
				}
				
				if(zfsDestroyStdout) console.log(zfsDestroyStdout);
				
				
				
				
				userdel();
			}
			
		});
	}
	else userdel();
	
	
	function userdel() {
		
		var userDelCmd = 'userdel -f ';
		
		if(NOZFS) userDelCmd += " -r"; // Also remove home dir
		
		userDelCmd += " " + username;
		
		child_process.exec(userDelCmd, function execAddUser(err, stdout, stderr) {
			if (err) throw err;
			
			var mailspool = "userdel: " + username + " mail spool (/var/mail/" + username + ") not found";
			
			if(stderr) {
				if(stderr.trim() != mailspool) throw new Error(stderr);
			}
			
			console.log("User " + username + " deleted!");
			
		});
	}
	
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
			child_process.execSync("umount " + path + " --force").toString(ENCODING);
		}
		catch(err) {
			if(!ignoreErrors) {
				if( err.message.indexOf("umount: " + path + ": not mounted") == -1
				&& err.message.indexOf("umount: " + path + ": mountpoint not found") == -1
				&& err.message.indexOf("umount: " + path + ": No such file or directory") == -1 ) throw err;
				// stderr message are already shown in the shell, no need to repeat them
			}
		}
		
		return;
		// Server was unable to boot after adding stuff to fstab!!
		// We made jzedit_user_mounts.service instead, that mounts the mount-points on system upstart
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
	
