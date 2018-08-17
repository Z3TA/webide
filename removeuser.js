#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

var DEFAULT = require("./server/default_settings.js");

// Get arguments ...
var getArg = require("./shared/getArg.js");

var username = process.argv[2];

var DOMAIN = getArg(["d", "domain"]) || DEFAULT.domain;

var NOZFS = !!getArg(["nozfs", "nozfs"]);

var HOME = getArg(["home", "home"]) || DEFAULT.home_dir;

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

// Kill all processes owned by this user (for example scripts "in production")
var ps = child_process.execSync("ps aux | grep ^" + username + " || true").toString(ENCODING).trim();
if(ps) {
	ps = ps.split("\n");
	for (var i=0, pid; i<ps.length; i++) {
		// The first number after the user name is the pid
		console.log("ps[" + i + "]=" + ps[i]);
		pid = ps[i].match(/ \d+ /)[0].trim();
		child_process.execSync("kill " + pid);
	}
}
// Note: nodejs_init_worker.js might restart the scripts before they have been deleted !


// Remove nginx profile
var url_user = UTIL.urlFriendly(username);
var nginxProfile = "/etc/nginx/sites-available/" + url_user + "." + DOMAIN + ".nginx";
var nginxProfileSymlink = "/etc/nginx/sites-enabled/" + url_user + "." + DOMAIN + "";
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
	var nginxReloadStdout = child_process.execSync("service nginx reload && sleep 1");
	}
	catch(err) {
		if(err.message.indexOf("nginx.service is not active, cannot reload.") == -1) throw err;
	}
	
	// Remove apparmor profiles
	unlink("/etc/apparmor.d/usr.bin.nodejs_" + username);
unlink("/etc/apparmor.d/home." + username + ".bin.bash");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.node");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.python");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.hg");
unlink("/etc/apparmor.d/home." + username + ".usr.lib.node_modules.npm.bin.npm-cli.js");
	
	//var reloadApparmor = child_process.execSync("service apparmor reload").toString(ENCODING).trim();
	//if(reloadApparmor != "") throw reloadApparmor;
	
/*
	What if the user is logged in ? We wont be able to umount nodejs_username !
	If we restart the server the user will auto-relogion (and re-create the mount-points).
	It's probably *not* a good idea to delete a user while he/she is using the system.
	But here's how to do it:
	1. Delete the system account so the user can't re-login: userdel username
	2. Restart the jzedit.service to force a logout: systemctl restart jzedit
	3. Do the unmounting and deletion of data : ./removeuser.js username
	
	Unmounting nodejs_username will fail if the user is still logged in!
	
	If umount fails, try:
	sudo lsof | grep '/home/username'
	sudo lsof | grep '/bin/file'
	
	
	sudo mount | grep '/home/ltest4/bin/bash'
	sudo lsof | grep '/bin/bash'
	sudo umount -lf /home/ltest4/bin/bash
	
	
*/


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

umount("/home/" + username + "/etc/ssl/certs");

umount("/home/" + username + "/usr/bin/env");
umount("/home/" + username + "/usr/bin/hg");
umount("/home/" + username + "/usr/bin/node");
umount("/home/" + username + "/usr/bin/python");
umount("/home/" + username + "/usr/bin/ssh");
umount("/home/" + username + "/usr/bin/ssh-keygen");
umount("/home/" + username + "/usr/bin/unrar");
umount("/home/" + username + "/usr/bin/unzip");

// -----------------------------------------------

umount("/home/" + username + "/bin/bash");
umount("/home/" + username + "/bin/gunzip");
umount("/home/" + username + "/bin/gzip");
umount("/home/" + username + "/bin/ln");
umount("/home/" + username + "/bin/ls");
umount("/home/" + username + "/bin/mkdir");
umount("/home/" + username + "/bin/mv");
umount("/home/" + username + "/bin/rm");
umount("/home/" + username + "/bin/rmdir");
umount("/home/" + username + "/bin/sh");
umount("/home/" + username + "/bin/tar");

umount("/home/" + username + "/dev/urandom");
umount("/home/" + username + "/dev/null");
umount("/home/" + username + "/dev/ptmx");
umount("/home/" + username + "/dev/pts");

	umount("/home/" + username + "/lib");
	umount("/home/" + username + "/lib64");

umount("/home/" + username + "/proc/cpuinfo");
umount("/home/" + username + "/proc/stat");
umount("/home/" + username + "/proc/sys/vm/overcommit_memory");

umount("/home/" + username + "/usr/lib");
umount("/home/" + username + "/usr/local/lib");
umount("/home/" + username + "/usr/share");

// It's very important that umount comes before unlink!! Or the target which the mount points to will be deleted!!
umount("/usr/bin/nodejs_" + username); // Used by user_worker.js
unlink("/usr/bin/nodejs_" + username); // Remove the dummy file.


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
				
			if(++zfsDestroyRetry > 2) throw new Error("Unable to destroy " + zfsPool + userHomeDir + "! See errors above.");
				
				try {
				var zfsDestroyStdout = child_process.execSync("sleep 2 && zfs destroy " + zfsPool + userHomeDir);
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
					
					// This script might be called from the editor service itself, so don't kill it!
					//restartEditorService();
					
					console.log("Retrying zfs destroy " + zfsPool + userHomeDir);
					
					return zfsDestroy(zfsPool, userHomeDir); // Try again
						
					}
					else throw zfsDestroyErr;
				}
				
				if(zfsDestroyStdout) console.log(zfsDestroyStdout);
				
			//console.log("Successfully destroyed: " + zfsPool + userHomeDir);
				
				userdel();
			}
			
		});
	}
	else userdel();
	

function restartEditorService() {
	console.log("Restarting jzedit service ...");
	try {
		var restartJzeditStdout = child_process.execSync("service jzedit restart");
		restartJzeditStdout = restartJzeditStdout.toString(ENCODING);
	}
	catch(restartJzeditErr) {
		console.log("restartJzeditErr: " + restartJzeditErr.message);
		throw new Error("Unable to restart jzedit service. You have to manually run sudo lsof " + HOME + username + " and kill the processes that are using it.");
	}
	if(restartJzeditStdout) console.log(restartJzeditStdout);
}

	
function userdel() {
		
		var userDelCmd = 'userdel -f ';
		
		if(NOZFS) userDelCmd += " -r"; // Also remove home dir
		
		userDelCmd += username;
		
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
	// Only use this function if you want to ignore ENOENT's, otherwise use fs.unlinkSync directly.
	// note: unlinking is the same as Removing a file!! So be careful
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
		child_process.execSync("umount " + path + " --force"); // .toString(ENCODING)
		}
		catch(err) {
			if(!ignoreErrors) {
				if( err.message.indexOf("umount: " + path + ": not mounted") == -1
				&& err.message.indexOf("umount: " + path + ": mountpoint not found") == -1
				&& err.message.indexOf("umount: " + path + ": No such file or directory") == -1 ) {
				
				if(err.message.indexOf("umount: " + path + ": target is busy") != -1) {
					// Sometimes you can not umount because there are other mounts to the target!
					// A lazy umount might be able to get rid of those mounts!
					child_process.execSync("umount -lf " + path + " && sleep 1"); // we want to throw if this fails
					// We want to sleep to make it sync
					// can't use setTimeout because it would made the script continue
					child_process.execSync("umount -f " + path + ""); // we want to throw if this fails
					
				}
				else {
					throw err;
				// stderr message are already shown in the shell, no need to repeat them
				}
			}
			
			}
		}
		
		return;
		// Server was unable to boot after adding stuff to fstab!!
		// We made jzedit_user_mounts.service instead, that mounts the mount-points on system upstart
	// But then we got issues after re-installing server
	// So we ended up with server.js being responsible for mounting the mount-points.
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
	
