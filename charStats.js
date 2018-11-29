/*
	
	Make a list of the most common characters in the project and the  most common neighbours
	
	
	
	
*/

var characters = {}; // letter: {count, neighbours: char=count}

// Recursively find all files
var fs = require("fs");
var maxConcurrency = 100;
var concurrency = 0;
var folderQueue = [];
var statQueue = [];
var searchQueue = [];
var queueTimer;
var alreadyDone = false;

searchFolder(__dirname);

function searchFolder(folder) {
	if(concurrency >= maxConcurrency) return folderQueue.push(folder);
	console.log("searchFolder folder=" + folder + " concurrency=" + concurrency);
	
	concurrency++;
	fs.readdir(folder, listFiles);
	
	function listFiles(err, files) {
		concurrency--;
		if(err) throw err;
		for (var i=0; i<files.length; i++) stat(folder + "/" + files[i]);
	}
}

function stat(path) {
	if(concurrency >= maxConcurrency) return statQueue.push(path);
	console.log("stat: path=" + path + " concurrency=" + concurrency);
	
	concurrency++;
	fs.stat(path, statResult);
	
	function statResult(err, stats) {
		concurrency--;
		if(err) throw err;
		
		if(stats.isDirectory()) searchFolder(path);
		else searchFile(path);
		
		if(concurrency<maxConcurrency) runQueues();
		
	}
}

function searchFile(filePath) {
	
	var ext = fileExtension(filePath).toLowerCase();
	
	if(! (ext=="htm" || ext=="html" || ext=="js") ) return; // Ignore
	
	if(concurrency >= maxConcurrency) return searchQueue.push(filePath);
	console.log("searchFile: filePath=" + filePath + " concurrency=" + concurrency);
	
	concurrency++;
	fs.readFile(filePath, "utf8", readFile);
	
	function readFile(err, data) {
		concurrency--;
		if(err) throw err;
		
		var lastChar = "";
		var char = ""
		var nextChar = ""
		for (var i=0; i<data.length; i++) found( data.charAt(i).toLowerCase(), 
i>0 && data.charAt(i-1).toLowerCase(), 
		i<data.length-1 && data.charAt(i+1).toLowerCase() );
		
		//done();
		
		if(concurrency<maxConcurrency) runQueues();
	}
}

function found(char, before, after) {
	
	//console.log("found: char=" + char + " before=" + before + " after=" + after);
	if(!characters.hasOwnProperty(char)) characters[char] = {count: 1, neighbours: {}};
	else characters[char].count++;
	
	if(before && !characters[char].neighbours.hasOwnProperty(before)) characters[char].neighbours[before] = 1;
	else characters[char].neighbours[before]++;
	
	if(after && !characters[char].neighbours.hasOwnProperty(after)) characters[char].neighbours[after] = 1;
	else characters[char].neighbours[after]++;
}

function runQueues() {
	clearTimeout(queueTimer);
	
	if(concurrency >= maxConcurrency) return;
	
	if( concurrency==0 && folderQueue.length == 0 && statQueue.length == 0 ) return done();
	
	console.log("runQueues: concurrency=" + concurrency + " folderQueue.length=" + folderQueue.length + " statQueue.length=" + statQueue.length);
	
	if(concurrency < maxConcurrency && folderQueue.length > 0) searchFolder(folderQueue.pop());
	if(concurrency < maxConcurrency && statQueue.length > 0) stat(statQueue.pop());
	if(concurrency < maxConcurrency && searchQueue.length > 0) searchFile(searchQueue.pop());
	
	if( concurrency > 0) {
		queueTimer = setTimeout(runQueues, 100); // recursive
	}
}

function done() {
	
	if(alreadyDone) return;
		
	var mostCommon = [];
	var neighbours = [];
	for(var char in characters) {
		neighbours = [];
		for(var neighbouringChar in characters[char].neighbours) {
			neighbours.push({char: neighbouringChar, count: characters[char].neighbours[neighbouringChar]});
		}
		neighbours.sort(sortByCount);
		mostCommon.push({char: char, count: characters[char].count, neighbours: neighbours});
	}
	
	mostCommon.sort(sortByCount);
	
	var summarize = "Most common characters: ";
	for (var i=0; i<mostCommon.length; i++) {
		summarize = summarize + mostCommon[i].char + "=" + mostCommon[i].count + " ";
	}
	
	
	var fileName = "charStats.json";
	fs.writeFile(fileName, summarize + "\n\n" + JSON.stringify(mostCommon, null, 2), fileSaved);
	
	function fileSaved(err) {
		if(err) throw err;
		console.log("Character statistics saved in " + fileName);
	}
}

function sortByCount(a, b) {
	if(a.count > b.count) return -1; // move a left
	else if(b.count > a.count) return 1; // move a right
	else return 0;
}

function fileExtension(filePath) {
	var dotIndex = filePath.lastIndexOf(".");
	
	if(dotIndex == -1) return "";
	else return filePath.slice(dotIndex+1);
}

