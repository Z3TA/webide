"use strict";

var module_fs = require("fs");
var module_copyFile = require("./copyFile.js");
var UTIL = require("../client/UTIL.js");
var module_path = require("path");

console.log("copyDirRecursive.js");

function copyDirRecursive(sourceDir, targetDir, callback) {
if(typeof callback != "function") throw new Error("Expected second parameter callback=" + callback + " to be a callback function!");

// Path is always a directory, put a slash after it to ease concatenation
sourceDir = UTIL.trailingSlash(sourceDir);
targetDir = UTIL.trailingSlash(targetDir);

	if( !module_path.isAbsolute(sourceDir) ) sourceDir = module_path.resolve(sourceDir);
	if( !module_path.isAbsolute(targetDir) ) targetDir = module_path.resolve(targetDir);
	
var dirsToMake = 0;
	var finish = false;
var dirsToRead = 0;

	copyDir(sourceDir, targetDir);
	
function copyDir(source, target) {
source = UTIL.trailingSlash(source);
target = UTIL.trailingSlash(target);

		console.log("copyDirRecursive: Copying source=" + source + " to target=" + target);
		
// Create the dir before copying over the files
dirsToMake++;
module_fs.mkdir(target, function(err) {
dirsToMake--;
if(finish) return;
if(err) return fail(err);

			console.log("copyDirRecursive: Created directory: " + target);
			
// Then read the files
			console.log("copyDirRecursive: Reading files in: " + source);
dirsToRead++;
module_fs.readdir(source, function readDir(err, files) {
dirsToRead--;
if(finish) return;
if(err) return fail(err);

for (var i=0; i<files.length; i++) {
statAndCopy(source + files[i], target + files[i]);
}

doneMaybe();
});
});
}

var pathsToStat = 0;
var filesToCopy = 0;

function statAndCopy(sourcePath, targetPath) {
// Check if it's a directory
		console.log("copyDirRecursive: Stat: " + sourcePath);
pathsToStat++;
module_fs.stat(sourcePath, function statResult(err, stats) {
pathsToStat--;
if(finish) return;
if(err) return fail(err);

if(stats.isDirectory()) {
// recursively copy if it's a directory
copyDir(sourcePath, targetPath)
}
else {
// copy the file
				console.log("copyDirRecursive: Copying file sourcePath=" + sourcePath + " to targetPath=" + targetPath);
filesToCopy++;
				module_copyFile(sourcePath, targetPath, function copied(err) {
filesToCopy--;
if(finish) return;
if(err) return fail(err);

doneMaybe();
});
}
});
}

function fail(err) {
finish = true;
		console.log("copyDirRecursive: fail: " + err.message);
		if(callback) callback(err);
callback = null;
	}

function doneMaybe() {
console.log("copyDirRecursive: doneMaybe? finish=" + finish + " filesToCopy=" + filesToCopy + " pathsToStat=" + pathsToStat + " dirsToRead=" + dirsToRead + " dirsToMake=" + dirsToMake);
		
if(finish) throw new Error("Should not be finish when checking if done!");

if(filesToCopy==0 && pathsToStat==0 && dirsToRead==0 && dirsToMake==0) {
finish = true;

if(!callback) throw new Error("callback=" + callback);

callback(null);
callback = null;
}
}
}

module.exports = copyDirRecursive;
