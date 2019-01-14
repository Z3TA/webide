"use strict";

var module_fs = require("fs");
var module_copyFile = require("./copyFile.js");
var UTIL = require("../client/UTIL.js");
var module_path = require("path");

console.log("rmDirRecursive.js");

function rmDirRecursive(targetPath, callback) {
	
	var finish = false;
	var directories = [];
	var filesToDelete = 0;
var foldersToDelete = 0;
	var dirsToRead = 0;
	var pathsToStat = 0;
	var dirsToDelete = 0;
	
	if( !module_path.isAbsolute(targetPath) ) targetPath = module_path.resolve(targetPath);
	
	console.time("rmDirRecursive: " + targetPath);
	
	readDir(targetPath);
	
	
	function readDir(dirPath) {
		console.log("rmDirRecursive: readDir: dirPath=" + dirPath);
		dirPath = UTIL.trailingSlash(dirPath);
		
directories.push(dirPath);

		dirsToRead++;
		module_fs.readdir(dirPath, function readDir(err, files) {
			dirsToRead--;
			if(finish) return;
			if(err) return fail(err);
			
			for (var i=0; i<files.length; i++) {
				stat(dirPath + files[i]);
			}
			
			doneMaybe();
			
		});
	}
	
	function stat(path) {
		console.log("rmDirRecursive: stat: path=" + path);
pathsToStat++;
		module_fs.stat(path, function statResult(err, stats) {
			pathsToStat--;
			if(finish) return;
			if(err) return fail(err);
			
			if(stats.isDirectory()) {
				readDir(path);
			}
			else {
				// Delete the file
				console.log("rmDirRecursive: unlink: path=" + path);
filesToDelete++;
module_fs.unlink(path, function fileDeleted(err) {
filesToDelete--;
if(finish) return;
					if(err) return fail(err);
					
					doneMaybe();
});
}
});
	}

	function deleteDir(path) {
		console.log("rmDirRecursive: deleteDir: path=" + path);
dirsToDelete++;
		module_fs.rmdir(path, function dirDeleted(err) {
			dirsToDelete--;
			if(finish) return;
			if(err) return fail(err);
			
			doneMaybe();
		});
	}
	
	function doneMaybe() {
		
		console.log("rmDirRecursive: doneMaybe: dirsToRead=" + dirsToRead + " filesToDelete=" + filesToDelete + " pathsToStat=" + pathsToStat + " dirsToDelete=" + dirsToDelete + " directories.length=" + directories.length);
		
		if(dirsToRead == 0 && filesToDelete == 0 && pathsToStat == 0) {
			if(dirsToDelete == 0 && directories.length == 0) {
				finish = true;
				
				console.timeEnd("rmDirRecursive: " + targetPath);
				console.log("rmDirRecursive: Finished deleting " + targetPath);
				
				if(!callback) throw new Error("callback=" + callback);
				
				callback(null);
				callback = null;
			}
			else if(directories.length > 0) {
				console.log("rmDirRecursive: Done deleting files. Now deleting folders ...");
				while(directories.length > 0) deleteDir(directories.pop());
			}
		}
	}
	
	function fail(err) {
		finish = true;
		
		console.timeEnd("rmDirRecursive: " + targetPath);
		console.log("rmDirRecursive: fail: " + err.message);
		
		if(callback) callback(err);
		callback = null;
	}
}


module.exports = rmDirRecursive;
