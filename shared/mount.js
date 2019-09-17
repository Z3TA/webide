"use strict";

var module_fs = require("fs");
var module_child_process = require("child_process");
var UTIL = require("../client/UTIL.js");

function makeDirP(path, callback) {
	
	var folders = UTIL.getFolders(path);
	
	if(folders.length == 0) throw new Error("Unable to get folders from path=" + path + " folders=" + JSON.stringify(folders));
	
	// Create the folders if they don't exist
	
	checkFolder(folders.shift());
	
	function checkFolder(folderPath) {
		if(!folderPath) throw new Error("folderPath=" + folderPath + " path=" + path + " folders=" + JSON.stringify(folders)); // For sanity
		
		module_fs.stat(folderPath, function(err, stats) {
			if(err) {
				if(err.code != "ENOENT") return makeDirPDone(err);
				
				// The path does not exist. Create it!
				module_fs.mkdir(folderPath, function (err) {
					if(err && err.code != "EEXIST") return makeDirPDone(err);
					
					if(folders.length > 0) checkFolder(folders.shift());
					else makeDirPDone(null);
				});
			}
			else if(!stats.isDirectory()) {
				return makeDirPDone(new Error("Not a directory: folderPath=" + folderPath + " path=" + path + " folders=" + JSON.stringify(folders)));
			}
			else {
				if(folders.length > 0) checkFolder(folders.shift());
				else makeDirPDone(null);
			}
		});
	}
	
	function makeDirPDone(err) {
		if(callback) {
			callback(err);
			callback = null;
		}
	}
}

function mount(sourcePath, targetPath, command, callback) {

	if(typeof command == "function" && callback == undefined) {
		callback = command;
		command = undefined;
	}
	
	//console.time("mounting " + targetPath);
var abort = false;
	var retryCounter = 0;
// Are we mounting a file or a folder !?

	if(typeof type == "function" && callback == undefined) {
		callback = type;
		type = undefined;
	}
	
	if(typeof targetPath != "string") throw new Error("Second parameter targetPath=" + targetPath + " is not optional!");
	
	var targetParent = UTIL.parentFolder(targetPath);
	var targetParentStats;
	
	var sourceStats = { // For when sourcePath is null
		isDirectory: function isDirectory() {
			// Depends on the target
			var lastChar = targetPath.slice(-1);
			if(lastChar == "/") return true;
			else return false;
		}
	};
	
	if(!sourcePath) {
		// Stat the parent folder instead
		module_fs.stat(targetParent, function(err, stats) {
			if(err) return mountDone(err);
			
			targetParentStats = stats;
			
			statTarget();
		});
	}
	else module_fs.stat(sourcePath, function(err, stats) {
		if(err) return mountDone(err);

		// Give a warning if we are mounting a symlink
		module_fs.readlink(sourcePath, function(err, linkString) {
			if(!err) console.log("Source is a symlink: " + sourcePath + " -> " + linkString);
		});
		
		if( !UTIL.isDirectory(sourcePath) && sourcePath.indexOf("bin") != -1 ) {
			// Give a warning if we are mounting a non-default bin
			var exec = module_child_process.exec;
			var binName = UTIL.getFilenameFromPath(sourcePath);
			exec("which " + binName, function(error, stdout, stderr) {
				if(error) return console.error(error);
				if(stderr) return console.error(new Error(stderr));
				
				var defaultBin = stdout.trim();
				
				if(defaultBin != sourcePath) return console.warn("sourcePath=" + sourcePath +" is not defaultBin=" + defaultBin);
			});
		}
		
		
		sourceStats = stats;
		
console.log("Folder exist: " + sourcePath);

		statTarget();
});

	function statTarget() {
		// We should *always* check the target to make sure it's not already mounted
		module_fs.stat(targetPath, function targetStat(err, targetStats) {
			if(err) {
				if(err.code != "ENOENT") return mountDone(err);
				
				//console.log("Target doesn't exist: " + targetPath);
				
				if(sourceStats.isDirectory()) {
					//console.log("Source is a directory: " + targetPath);
					makeDirP(targetPath, function(err) {
						if(err) return mountDone(err);
						//console.log("Target directory created: " + targetPath);
						targetCreated();
					});
				}
				else {
					//console.log("Source is a file: " + targetPath);
					var parentFolder = UTIL.parentFolder(targetPath);
					makeDirP(parentFolder, function(err) {
						if(err) {
							if(err.code == "EEXIST" && err.message.indexOf(parentFolder) != -1) {
								// If mount is called several times with the same root folders there can be racing
								console.log("Racing to create parentFolder=" + parentFolder + ": " + err.message);
							}
							else {
								console.log("makeDirP failed!");
								console.log("err.code=" + err.code + " ==EEXIST ? " + (err.code == "EEXIST") + "");
								console.log("parentFolder=" + parentFolder);
								console.log("err.message=" + err.message + " (err.message.indexOf(parentFolder)=" + err.message.indexOf(parentFolder) + ")");
								return mountDone(err);
							}
						}
						
						// Create emty file
						//console.log("Creating emty file: " + targetPath);
						module_fs.open(targetPath, 'w', function (err, fileDescriptor) {
							if(err) {
								console.log("module_fs.open targetPath=" + targetPath + " error: " + err.message);
								return mountDone(err);
							}
							//console.log("File opened for write: " + targetPath);
							
							module_fs.close(fileDescriptor, function(err) {
								if(err) {
									console.log("module_fs.close targetPath=" + targetPath + " error: " + err.message);
									return mountDone(err);
								}
								//console.log("Emty file created: " + targetPath);
								targetCreated();
							});
						});
					});
				}
			}
			else {
				
				console.log("Target exist: " + targetPath);
				/*
					
					Problem: If no source is given, how to determen if target is already mounted or not !?
					
					not mounted:
					dev: 51,
					mode: 16877,
					nlink: 2,
					uid: 0,
					gid: 0,
					rdev: 0,
					blksize: 512,
					ino: 6,
					size: 2,
					blocks: 1,
					
					
					mounted: 
					dev: 66,
					mode: 16877,
					nlink: 2,
					uid: 0,
					gid: 0,
					rdev: 0,
					blksize: 1024,
					ino: 1,
					size: 0,
					blocks: 0,
					
					mounted:
					dev: 23,
					mode: 16877,
					nlink: 19,
					uid: 0,
					gid: 0,
					rdev: 0,
					blksize: 2048,
					ino: 27,
					size: 31,
					blocks: 17,
					
					The only think that is different is dev!
					If it's mounted, the dev is likely to be something else then the parent dir!
					
				*/
				
				if(!sourcePath) {
					console.log("targetParentStats.dev=" + targetParentStats.dev + " targetStats.dev=" + targetStats.dev + "");
					if(targetParentStats.dev != targetStats.dev) {
						return mountDone(null); // Already mounted!
					}
				}
				else {
					console.log("sourceStats.dev=" + sourceStats.dev + " targetStats.dev=" + targetStats.dev + " sourceStats.ino=" + sourceStats.ino + " targetStats.ino=" + targetStats.ino + "  ");
					if(sourceStats.ino == targetStats.ino) {
						//console.timeEnd("mounting " + targetPath);
						return mountDone(null); // Already mounted!
					}
				}
				
				if(sourceStats.isDirectory()) {
					
					if(!targetStats.isDirectory()) return mountDone(new Error("Source is a directory, but target is not! sourcePath=" + sourcePath +
					" targetPath=" + targetPath + " sourceStats=" + sourceStats + " targetStats=" + targetStats + " "));
					
					// Check if the target folder is emty
					module_fs.readdir(targetPath, function readDir(err, files) {
						if(err) return mountDone(err);
						
						if(files.length > 0) {
							return mountDone(new Error("Target directory not empty! Can not mount to targetPath=" + targetPath + " targetStats=" + JSON.stringify(targetStats) + " "));
						}
						else targetCreated();
						
					});
				}
				else {
					// Make sure the file is emty
					if(targetStats.size !== 0) {
						
						// It's not empty (and it's not the same as source)
						// The source file has probably been replaced with a newever version
						// Umount the old version and mount the new version ...
						
						console.log("Target file not emty: " + targetPath + " ... Attempting umount before mounting ...");
						umount(targetPath, function unmountedMaybe(err) {
							if(err) {
								
								var errorMsg = "Target file not emty! Can not mount sourcePath=" + sourcePath + " to targetPath=" + targetPath +
								" targetStats=" + JSON.stringify(targetStats) + " sourceStats.ino=" + sourceStats.ino + " targetStats.ino=" + targetStats.ino + "" +
								"And not possible to umount: " + err.message;
								
								return mountDone(new Error(errorMsg));
								
							}
							else {
								targetCreated();
							}
						});
					}
					else targetCreated();
				}
			}
		});
	}
	
	function targetCreated() {
		
		var exec = module_child_process.exec;
		
		if(!command) command = "mount --bind " + sourcePath + " " + targetPath;
		
		//console.log("Running mount command=" + command);
		
		exec(command, function(error, stdout, stderr) {
			if(error) return mountDone(error);
			if(stderr) return mountDone(new Error(stderr));
			if(stdout) return mountDone(new Error(stdout));
			
			//console.timeEnd("mounting " + targetPath);
			return mountDone(null);
		});
		
	}
	
function mountDone(err) {
abort = true;
if(callback) {
callback(err);
callback = null;
}
}

/*


if ( module_fs.lstatSync( source ).isDirectory() ) {
// The source is a directory. Create a directory!
makeDirPsync(target);

} else {
// The source is not a directory (it's a file!?). Check if the file exist, then create it
if ( module_fs.existsSync( target ) ) throw new Error("File aready exist: " + target); // Prevent overwriting
module_fs.closeSync(module_fs.openSync(target, 'w')); // Create emty file
}

		var mountResult = module_child_process.execSync("mount --bind " + source + " " + target ).toString(ENCODING).trim();
if(mountResult != "") throw mountResult;

// Append to /etc/fstab so it is re-mounted after reboot
//module_fs.appendFileSync('/etc/fstab', source + '   ' +  target + ' none bind 0 0\n')
// Server was unable to boot after adding stuff to fstab!!
*/
}

function umount(path, callback) {
	var child_process = require("child_process");
	var command1 = "umount " + path + " --force";
	child_process.exec(command1, function(error, stdout, stderr) {
		
		console.log(command1 + " ... error=" + error + " stdout=" + stdout + " stderr=" + stderr + "");
		
		var str1 = "";
		if(stdout) str1 += stdout;
		if(stderr) str1 += stderr;
		if(error) str1 += error.message;
		
		if(umountSuccess(str1)) {
			return callback(null);
		}
		else if(str1.indexOf("umount: " + path + ": target is busy") != -1) {
			// Sometimes you can not umount because there are other mounts to the target!
			// A lazy umount might be able to get rid of those mounts!
			var command2 = "umount -lf " + path + " && sleep 1"
			console.log("umount " + path + ". Target is busy! Doing lazy umount -lf");
			// we want to throw if this fails ...
			child_process.exec(command, function(error, stdout, stderr) {
				console.log(command2 + " ... error=" + error + " stdout=" + stdout + " stderr=" + stderr + "");

				var str2 = "";
				if(stdout) str2 += stdout;
				if(stderr) str2 += stderr;
				if(error) str2 += error.message;
				
				if(error || stderr) return callback(error ? error : new Error(stderr));
				
				var command3 = "umount -f " + path + "";
				child_process.exec(command3, function(error, stdout, stderr) {

					console.log(command3 + " ... error=" + error + " stdout=" + stdout + " stderr=" + stderr + "");
					
					var str3 = "";
					if(stdout) str3 += stdout;
					if(stderr) str3 += stderr;
					if(error) str3 += error.message;
					
					if(umountSuccess(str3)) {
						console.log("Lazy umount and mount succeeded! path=" + path);
						return callback(null);
					}
					else {
						var msg = "Lazy umount failed: " + str3;
						console.log(msg);
						return callback(new Error(msg));
					}
					
				}); // command3
}); // command2
		}
		else {
			var msg = "umount failed for unknown reasons: " + str;
			console.log(msg);
			return callback(new Error(msg));
		}
	}); // command1
	
	function umountSuccess(str) {
		if( str.indexOf("umount: " + path + ": not mounted") ) {
			return true;
		}
		else if( str.indexOf("umount: " + path + ": mountpoint not found") ) {
			return true;
		}
		else if( str.indexOf("umount: " + path + ": No such file or directory") ) {
			return true;
		}
		else if( str == "" ) {
			return true;
		}
		else {
return false;
		}
	}
	
}

module.exports = mount;
