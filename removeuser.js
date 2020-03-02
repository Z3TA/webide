#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

var DEFAULT = require("./server/default_settings.js");

// Get arguments ...
var getArg = require("./shared/getArg.js");

var username = process.argv[2];

var DOMAIN = getArg(["d", "domain"]) || DEFAULT.domain;

var NOZFS = !!getArg(["nozfs", "nozfs"]); // Use this flag if you do not have ZFS!

var HOME = getArg(["home", "home"]) || DEFAULT.home_dir;

var FORCE = !!getArg(["force", "force"]) || false;

var UNATTENDED = !!getArg(["unattended", "unattended"]) || false;

if(HOME.charAt(HOME.length-1) != "/") throw new Error("Home dir needs to end with a slash: HOME=" + HOME);

var ENCODING = "utf8";

if(!username) throw new Error("No username specified!");

var UTIL = require("./client/UTIL.js");

var fs = require("fs");
var child_process = require('child_process');
var rmDirRecursive = require("./shared/rmDirRecursive.js");


if(FORCE) startDelete();
else {
	// Make sure it's a webide user!
	try {
		var hashedPw = fs.readFileSync(UTIL.joinPaths([HOME, username, ".webide/", "password"]), ENCODING);
// Should throw if the file doesn't exist!
}
catch(err) {
		console.log(err.message);
		console.log(username + " is probably not a webide user. Use -force flag to delete anaway.");
		process.exit();
	}
	
	if(UNATTENDED) startDelete();
	else {
		console.log("It's recommended to disable the webide service and reboot the server to release any mounted folders.");
	console.log("Deleting a user while a folder is mounted will result in the mounted folder also getting deleted!");
	console.log("Press Enter to continue ... Or Ctrl+C to abort");
	process.stdin.once('data', function () {
		startDelete();
	});
	}
}

function startDelete() {
	
	// First empty the prod folder so that processes wont respawn when killed
	var prodDir = UTIL.joinPaths([HOME, username, ".prod/"]);
	child_process.execSync("rm -rf " + prodDir);
	
// Kill all processes owned by this user (for example scripts "in production")
var ps = child_process.execSync("ps aux | grep ^" + username + " || true").toString(ENCODING).trim();
if(ps) {
	ps = ps.split("\n");
	for (var i=0, pid; i<ps.length; i++) {
		// The first number after the user name is the pid
		console.log("ps[" + i + "]=" + ps[i]);
		pid = ps[i].match(/ \d+ /)[0].trim();
			try {
		child_process.execSync("kill " + pid);
			}
			catch(err) {
				console.log("Unable to kill process " + pid + " owned by username. Trying killing it as the user...");
				try {
					child_process.execSync("sudo -u " + username + " kill " + pid);
				}
				catch(err) {
					throw new Error("Failed to kill pid=" + pid + " as " + username + ". You have to do it manually!");
				}
			}
		}
	}
	
	
	// Remove nginx profile
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
console.warn("Did not find nginxProfile=" + nginxProfile);
			// Might now have provided the correct DOMAIN
			try {
var nginxProfiles = fs.readdirSync("/etc/nginx/sites-available/");
			}
			catch(err) {
				if(err.code == "ENOENT") console.log("Nginx doesn't seem to be installed!");
				else throw err;
			}
			
			if(nginxProfiles.toString().indexOf(url_user) != -1) { // Can't compare the string from fs.readdirSync without .toString() !!!
				console.log("Are you sure you are using the correct domain!? DOMAIN=" + DOMAIN + " Use --domain=tld to specify domain when deleting users!");
				process.exit();
			}
			else {
				console.log("url_user=" +url_user + " not in nginxProfiles=" + nginxProfiles);
			}
			
		}
		else throw err;
	}
	
	// Reload nginx to remove descriptors to files in user home dir
	try {
		var nginxReloadStdout = child_process.execSync("service nginx reload && sleep 3");
	}
	catch(err) {
		if(err.message.indexOf("nginx.service is not active, cannot reload.") == -1 &&
		err.message.indexOf("unrecognized service") == -1) throw err;
	}
	
	// Remove apparmor profiles
	unlink("/etc/apparmor.d/usr.bin.nodejs_" + username);
	unlink("/etc/apparmor.d/home." + username + ".bin.bash");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.node");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.python");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.hg");
	unlink("/etc/apparmor.d/home." + username + ".usr.bin.git");
	unlink("/etc/apparmor.d/home." + username + ".usr.lib.node_modules.npm.bin.npm-cli.js");
	unlink("/etc/apparmor.d/home." + username + ".usr.lib.node_modules.npm.bin.npx-cli.js");
	
	//var reloadApparmor = child_process.execSync("service apparmor reload").toString(ENCODING).trim();
	//if(reloadApparmor != "") throw reloadApparmor;
	
	/*
		What if the user is logged in ? We wont be able to umount nodejs_username !
		If we restart the server the user will auto-relogion (and re-create the mount-points).
		It's probably *not* a good idea to delete a user while he/she is using the system.
		But here's how to do it:
		1. Delete the system account so the user can't re-login: userdel username
		2. Restart the webide.service to force a logout: systemctl restart webide
		3. Do the unmounting and deletion of data : ./removeuser.js username
		
		Unmounting nodejs_username will fail if the user is still logged in!
		
		If umount fails, try:
		sudo lsof | grep '/home/username'
		sudo lsof | grep '/bin/file'
		
		
		sudo mount | grep '/home/ltest4/bin/bash'
		sudo lsof | grep '/bin/bash'
		sudo umount -lf /home/ltest4/bin/bash
		
		
	*/
	
	
	fuseUmount(HOME + username + "/googleDrive");
	
	// todo: Make sure all Dropbox daemons are killed so that they do not clean the Dropbox when we delete it!!
	
	
	rmDirRecursive("/etc/netns/" + username, function(err) {
		if(err) console.warn(err.message);
	});
	
	
	// todo: Stop and Delete Docker VM image
	
	
	
	
	if(!NOZFS) {
		// Need to get the zfs pool
		// todo: Check why this just hangs if you do not have zfs and not using -nozfs flag!
		child_process.exec("zfs list", function execAddUser(err, stdout, stderr) {
			var zfsDestroyRetry = 0;
			
			if(stderr.indexOf("zfs: not found") != -1 || 
			stderr.indexOf("The program 'zfs' can be found in the following packages") != -1) {
				NOZFS = true;
				userdel();
			}
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
				
				//var deleteHomeDirStdout = child_process.execSync("sleep 2 && rm -r " + userHomeDir);
				//deleteHomeDirStdout = deleteHomeDirStdout.toString(ENCODING).trim();
				
				userdel();
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
// fall through...
					}
					else if(zfsDestroyErr.message.indexOf("umount: " + HOME + username + ": target is busy") != -1) {
						// If you get umount: target is busy, try: sudo lsof | grep '/home/username'
						// Try to restart webide server to see if it helps
					// Last resort is to reboot to get rid of all the mounts
					
					// This script might be called from the editor service itself, so don't kill it!
					//restartEditorService();
					
					console.log("Retrying zfs destroy " + zfsPool + userHomeDir);
					
					return zfsDestroy(zfsPool, userHomeDir); // Try again
						
					}
					else {
					console.log("zfsPool=" + zfsPool + " HOME=" + HOME + " username=" + username);
					throw zfsDestroyErr;
				}
			}
			
			if(zfsDestroyStdout) console.log(zfsDestroyStdout);
			
			//console.log("Successfully destroyed: " + zfsPool + userHomeDir);
			
			userdel();
		}
		
	});
}
else userdel();
}

function restartEditorService() {
	console.log("Restarting webide service ...");
	try {
		var restartStdout = child_process.execSync("service webide restart");
		restartStdout = restartStdout.toString(ENCODING);
	}
	catch(restartErr) {
		console.log("restartErr: " + restartErr.message);
		throw new Error("Unable to restart webide service. You have to manually run sudo lsof " + HOME + username + " and kill the processes that are using it.");
	}
	if(restartStdout) console.log(restartStdout);
}


function userdel() {
	
	var userDelCmd = 'userdel -f';
	
	if(NOZFS) userDelCmd += " -r"; // Also remove home dir
	
	userDelCmd = userDelCmd + " " + username;
	
	child_process.exec(userDelCmd, function execAddUser(err, stdout, stderr) {
		
		var error = (err && err.message) || stderr;
		
		if(error) console.log(error);
		
		var mailspool = "userdel: " + username + " mail spool (/var/mail/" + username + ") not found";
		error = error.replace(mailspool, "").trim();
		
		var userDoesNotExist = "userdel: user '" + username + "' does not exist";
		error = error.replace(userDoesNotExist, "").trim();
		
		var comandFailed = "Command failed: " + userDelCmd;
		error = error.replace(comandFailed, "").trim();
		
		
		if (error) {
			throw new Error(error);
			}
		
		console.log("User " + username + " deleted!");
		process.exit();
		
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
	var failed = false;
	
	var child_process = require("child_process");
	try {
		child_process.execSync("umount " + path + " --force"); // .toString(ENCODING)
	}
	catch(err) {
		if(ignoreErrors) {
			failed = true;
		}
		else {
			if( err.message.indexOf("umount: " + path + ": not mounted") == -1
			&& err.message.indexOf("umount: " + path + ": mountpoint not found") == -1
			&& err.message.indexOf("umount: " + path + ": no mount point specified") == -1
			&& err.message.indexOf("umount: " + path + ": No such file or directory") == -1 ) {
				
				if(err.message.indexOf("umount: " + path + ": target is busy") != -1) {
					// Sometimes you can not umount because there are other mounts to the target!
					// A lazy umount might be able to get rid of those mounts!
					console.log("umount " + path + ". Target is busy! Doing lazy umount -lf");
					
					child_process.execSync("umount -lf " + path + " && sleep 1"); // we want to throw if this fails
					// We want to sleep to make it sync
					// can't use setTimeout because it would made the script continue
					try {
						child_process.execSync("umount -f " + path + "");
					}
					catch(err) {
						
if( err.message.indexOf("umount: " + path + ": not mounted") == -1
						&& err.message.indexOf("umount: " + path + ": mountpoint not found") == -1
						&& err.message.indexOf("umount: " + path + ": No such file or directory") == -1 ) {
							failed = true;
							throw new Error("Lazy umount failed: " + err.message);
						}
						else {
							failed = true;
							console.log("hmm? Lazy umount gave: " + err.message);
						}
					}
					
					
				}
				else {
					failed = true;
					throw err;
					// stderr message are already shown in the shell, no need to repeat them
				}
			}
			
		}
		
		if(!failed) {
			// If the umount succeeded it should be safe to unlink the dummy file!?
			
		}
	}
	
	return;
	// Server was unable to boot after adding stuff to fstab!!
	// We made webide_user_mounts.service instead, that mounts the mount-points on system upstart
	// But then we got issues after re-installing server
	// So we ended up with server.js being responsible for mounting the mount-points.
}

function fuseUmount(path, ignoreErrors) {
	// The fuse file system is used for mounting Google Drive ...
	var child_process = require("child_process");
	var command = "fusermount -u " + path + "";
	try {
		child_process.execSync(command); // .toString(ENCODING)
	}
	catch(err) {
		if(!ignoreErrors) {
			
			if( err.message.indexOf("fusermount: failed to unmount " + path + ": not mounted") == -1
			&& err.message.indexOf("fusermount: failed to unmount " + path + ": mountpoint not found") == -1
			&& err.message.indexOf("fusermount: bad mount point " + path + ": No such file or directory") == -1
			&& err.message.indexOf("fusermount: failed to unmount " + path + ": Invalid argument") == -1 // folder exist, but is not a mountpoint!?
			&& err.message.indexOf("fusermount: failed to unmount " + path + ": No such file or directory") == -1 ) {
				
				if(err.message.indexOf("failed to unmount " + path + ": Device or resource busy") != -1) {
					
					// Sometimes you can not umount because there are other mounts to the target!
					// A lazy umount might be able to get rid of those mounts!
					console.log("fusermount -u " + path + ". Target is busy! Doing lazy umount -uz");
					child_process.execSync("fusermount -uz " + path + " && sleep 1"); // we want to throw if this fails
					// We want to sleep to make it sync
					// can't use setTimeout because it would made the script continue
					try {
						child_process.execSync("fusermount -u " + path + "");
					}
					catch(err) {
						if( err.message.indexOf("fusermount: failed to unmount " + path + ": not mounted") == -1
						&& err.message.indexOf("fusermount: failed to unmount " + path + ": mountpoint not found") == -1
						&& err.message.indexOf("fusermount: failed to unmount " + path + ": No such file or directory") == -1 ) {
							throw new Error("Lazy umount failed: " + err.message);
						}
						else console.log("Running fusermount -u after fusermount -uz gave the following error: " + err.message);
					}
					
				}
				else {
					throw err;
					// stderr message are already shown in the shell, no need to repeat them
					// command is also show in the shell
				}
			}
			
		}
	}
	
	return;
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


