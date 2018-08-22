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

function mount(sourcePath, targetPath, callback) {
//console.time("mounting " + targetPath);
var abort = false;

// Are we mounting a file or a folder !?

module_fs.stat(sourcePath, function(err, sourceStats) {

if(err) return mountDone(err);

//console.log("Folder exist: " + sourcePath);

// Does the target exist ?
module_fs.stat(targetPath, function(err, targetStats) {

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
// If mount is called several time with the same root folders there can be racing
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

//console.log("Target exist: " + targetPath);

if(sourceStats.ino == targetStats.ino) {
//console.timeEnd("mounting " + targetPath);
return mountDone(null); // Already mounted!
}

if(sourceStats.isDirectory()) {

if(!targetStats.isDirectory()) return mountDone(new Error("Source is a directory, but target is not! sourcePath=" + sourcePath +
" targetPath=" + targetPath + " sourceStats=" + sourceStats + " targetStats=" + targetStats + " "));

// Check if the target folder is emty
module_fs.readdir(targetPath, function readDir(err, files) {
if(err) return mountDone(err);

if(files.length > 0) return mountDone(new Error("Target directory not empty! Can not mount to targetPath=" + targetPath + " targetStats=" + JSON.stringify(targetStats) + " "));
else targetCreated();

});
}
else {
// Make sure the file is emty
if(targetStats.size !== 0) {
mountDone(new Error("Target file not emty! Can not mount sourcePath=" + sourcePath + " to targetPath=" + targetPath +
" targetStats=" + targetStats + " sourceStats.ino=" + sourceStats.ino + " targetStats.ino=" + targetStats.ino + ""));
}
else targetCreated();

}
}

function targetCreated() {

				var exec = module_child_process.exec;

exec("mount --bind " + sourcePath + " " + targetPath , function(error, stdout, stderr) {
if(error) return mountDone(error);
if(stderr) return mountDone(new Error(stderr));
if(stdout) return mountDone(new Error(stdout));

//console.timeEnd("mounting " + targetPath);
return mountDone(null);
});

}

});

});

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

module.exports = mount;
