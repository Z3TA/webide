
var nodehunExist = true;
try {
var Nodehun = require("nodehun");
}
catch(err) {
	nodehunExist = false;
	console.warn("Can not find module nodehun!");
}

if(!nodehunExist) {
	var SPELLCHECK = {};
	SPELLCHECK.languages = nodehunNotInstalled
	SPELLCHECK.check = nodehunNotInstalled
}
else {
	
	var fs = require("fs");

var SPELLCHECK = {};

var dict = [];
var dictFiles = {};

// Preload all languages before we are chrooted
// Need to load them sync so we get them before we are chrooted
console.log("Preloading spellcheck dictionaries ...");
var langFolder = __dirname + "/languages/";
var folders = fs.readdirSync(langFolder);
for (var i=0, name=""; i<folders.length; i++) {
		name = folders[i];
		console.log("Found spellcheck dictionary for language " + name);
		dictFiles[name] = {};
		dictFiles[name].aff = fs.readFileSync(langFolder + name + "/" + name + ".aff");
	dictFiles[name].dic = fs.readFileSync(langFolder + name + "/" + name + ".dic");
}

SPELLCHECK.languages = function languages(user, json, callback) {
	var languages = json;
	var dictsLoaded = 0;
	var error = null;
	
	if(!Array.isArray(languages)) return callback(new Error("options need to be an array of lanugaes formatted like en_US"));
	
	for (var i=0; i<languages.length; i++) {
		if(!dictFiles.hasOwnProperty(languages[i])) {
			return callback(new Error("Language dictionary " + languages[i] + " not available! Try " + Object.keys(dictFiles) + ""), dict.length);
		}
	}
	
	dict.length = 0;
	
	for (var i=0; i<languages.length; i++) {
		dict.push(new Nodehun(dictFiles[languages[i]].aff, dictFiles[languages[i]].dic));
	}
	
	callback(null, dict.length);
}

SPELLCHECK.check = function check(user, json, callback) {
	
	var word = json.word;
	var suggestion = null;
	var checkedDictionaries = 0;
	var voteCorrect = 0;
	
	console.log("Spellchecking word=" + word);
	
	for(var i=0; i<dict.length; i++) {
		dict[i].spellSuggest(word, spellAnswer);
		//dict.isCorrect(word, spellAnswer);
	}
	
	function spellAnswer(err, correct, sugg, origWord){
		checkedDictionaries++;
		
		console.log("Got answer from Nodehun err=" + (err && err.message) + " currect=" + correct + " sugg=" + sugg + " origWord=" + origWord + "");
		
		if(err) return callback(err);
		
		if(correct) {
			voteCorrect++;
		}
		else if(sugg && !suggestion) { // sugg is either a string or null
			suggestion = sugg;
		}
		
		if(checkedDictionaries == dict.length) {
			// All directories has been checked!
			
			callback(null, {word: origWord, correct: voteCorrect > 0, suggestion: suggestion});
		}
	}
}
}

function loadDictionary(lang, callback) {
	console.log("Loading dictionary " + lang);
	
	// Async load the .aff and .dic files. Then create a dictionary
	
	var affBuffer;
	var dictBuffer;
	var gotAff = false;
	var gotDict = false;
	var failed = false;
	
	readFromDisk(__dirname + "/languages/" + lang + "/" + lang + ".aff", readAff);
	readFromDisk(__dirname + "/languages/" + lang + "/" + lang + ".dic", readDict);
	
	function readAff(err, buffer) {
		if(failed) return;
		if(err) {
			failed = true;
if(err.code == "ENOENT") {
				callback(new Error("Language not found: " + lang));
			}
			else callback(err);
		}
		
		affBuffer = buffer;
		gotAff = true;
		
		if(gotAff && gotDict) gotAll();
	}
	
	function readDict(err, buffer) {
		if(failed) return;
		if(err) {
			failed = true;
			if(err.code == "ENOENT") {
				callback(new Error("Language not found: " + lang));
			}
			else callback(err);
		}
		
		dictBuffer = buffer;
		gotDict = true;
		
		if(gotAff && gotDict) gotAll();
	}
	
	function gotAll() {
		/*
			We have both the aff and dict content!
			Create the dictionary:
		*/
		
		if(failed) return;
		
		dict.push(new Nodehun(affBuffer,dictBuffer));
		
		console.log("Dictionary " + lang + " loaded");
		
		callback(null);
	}
}

function readFromDisk(path, callback) {
	// Return raw buffer
	
	fs.readFile(path, function(err, buffer) {
		if (err) return callback(err);
		else callback(null, buffer);
	});
}

function nodehunNotInstalled(user, json, callback) {
	callback(new Error("nodehun module is not installed on the server!"));
};

module.exports = SPELLCHECK;
