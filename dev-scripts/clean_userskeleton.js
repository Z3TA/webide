#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	
	Guide for updating userskeleton (the user *new* users will be based on)
	
	1. Update files in etc/userdir_skeleton
	or login as userskeleton and download/update stuff

	2. Run this script which cleans up temporary files and cache, 
and also copies fresh files from etc/userdir_skeleton

	4. Create a new snapshot, and send it the the prod server
	
	sudo zfs snapshot rpool/home/userskeleton@base2
	
	Then send snapshot to prod server...
	If the fs do not exist:
	sudo zfs send rpool/home/userskeleton@base2 | ssh root@webide.se zfs recv ben/home/userskeleton
	
	If the fs already exist: (send incremental data)
	sudo zfs send -i rpool/home/userskeleton@baseX rpool/home/userskeleton@baseY | ssh root@webide.se zfs recv ben/home/userskeleton
	
	(where snap X on the server is the last common snap and snap Y is the latest in dev)
	
	zfs list -t snapshot
	
	
*/

var userinfo = require("../shared/userInfo.js");
var UTIL = require("../client/UTIL.js");
var DEFAULT = require("../server/default_settings.js");
var getArg = require("../shared/getArg.js");
var skeleton = require("../shared/skeleton.js");

var skeletonUser = "userskeleton";
var domain = getArg(["d", "domain"]) || DEFAULT.domain;

userinfo(skeletonUser, function(err, info) {
	if(err) throw err;
	
	var uid = info.uid;
	var netnsIP = UTIL.int2ip(167772162 + uid); // Starts on 10.0.0.2 then adds the uid to get a unique local IP address
	var dockerVMIP = UTIL.int2ip(167903234 + uid) // Starts on 10.2.0.2 ...
	
	var userInfo = {
		username: info.name,
		homeDir: UTIL.trailingSlash(info.homeDir),
		netnsIP: netnsIP,
		dockerVMIP: dockerVMIP,
		domain: domain,
uid: info.uid,
gid: info.gid

	}
	
	deleteFiles(userInfo.homeDir);
	
	skeleton.update(userInfo);
	
});


function deleteFiles(dir) {
	
	removeDirRecursiveSync(dir + "/.dbus/");
	removeDirRecursiveSync(dir + "/.local/");
	
	removeAllFiles(dir + "/.android/avd/Pixel_2_API_25.avd/", /\.lock$/);
	removeAllFiles(dir + "/log/");
	removeAllFiles(dir + "/.webide/storage/", /^__/);
	removeAllFiles(dir + "/.webide/storage/", /^state_/);
	removeAllFiles(dir + "/.AndroidStudio3.5/system/log/");
	
	removeFileSync(dir + "/.webide/storage/lastLogin");
	removeFileSync(dir + "/.webide/storage/loginCounter");
	removeFileSync(dir + "/.bash_history");
	removeFileSync(dir + "/.emulator_console_auth_token");
	removeFileSync(dir + "/testfile.txt");
}

function removeFileSync(filePath) {
	var fs = require("fs");
	try {
		fs.unlinkSync(filePath);
	}
	catch(err) {
		var error = err;
		console.log(err.code + ": " + filePath);
		if(err.code != "ENOENT") throw err;
	}
	if(!error) console.log("Deleted " + filePath);
}

function removeDirRecursiveSync(directory) {
	var fs = require("fs");
	try {
		fs.rmdirSync(directory, {recursive: true});
	}
	catch(err) {
		var error = err;
		console.log(err.code + ": " + directory);
		if(err.code != "ENOENT") throw err;
	}
	if(!error) console.log("Deleted " + directory);
}

function removeAllFiles(directory, re) {
	var fs = require('fs');
	var path = require('path');
	
	fs.readdir(directory, function(err, files) {
		if (err) {
			console.log(err.code + ": " + directory);
			if(err.code != "ENOENT") throw err;
			return;
		}
		
		for (var file of files) {
			if(re && !file.match(re)) continue;
			fs.unlink(path.join(directory, file), function(err) {
				if (err) throw err;
				console.log("Deleted " + path.join(directory, file));
			});
		}
	});
}


