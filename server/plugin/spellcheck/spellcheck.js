/*
	New languages can be downloaded from here:
	https://cgit.freedesktop.org/libreoffice/dictionaries/tree/
	(make sure the files are in utf-8 format!)
*/

var logModule = require("../../../shared/log.js");
var log = logModule.log;
var nodehunExist = true;
try {
var Nodehun = require("nodehun");
}
catch(err) {
	nodehunExist = false;
	log("Can not find module nodehun!", logModule.WARN);
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
	//log("Preloading spellcheck dictionaries ...", logModule.INFO);
var langFolder = __dirname + "/languages/";
var folders = fs.readdirSync(langFolder);
for (var i=0, name=""; i<folders.length; i++) {
		name = folders[i];
		log("Found spellcheck dictionary for language " + name, logModule.INFO);
		dictFiles[name] = {};
		dictFiles[name].aff = fs.readFileSync(langFolder + name + "/" + name + ".aff");
	dictFiles[name].dic = fs.readFileSync(langFolder + name + "/" + name + ".dic");
}

SPELLCHECK.languages = function languages(user, json, callback) {
	var languages = json;
	var dictsLoaded = 0;
	var error = null;
	
	if(!Array.isArray(languages)) return callback(new Error("options need to be an array of lanugaes formatted like en_US"));
	
		var notAvailable = [];
	for (var i=0; i<languages.length; i++) {
		if(!dictFiles.hasOwnProperty(languages[i])) {
				notAvailable.push(languages[i]);
			}
	}
	
	dict.length = 0;
	
	for (var i=0; i<languages.length; i++) {
		dict.push(new Nodehun(dictFiles[languages[i]].aff, dictFiles[languages[i]].dic));
	}
	
		if(notAvailable.length > 0) {
			error = new Error("Language dictionary(ies) " + notAvailable.join(",") + " not available! Try " + Object.keys(dictFiles) + "");
		}
		
		callback(error, dict.length);
}

SPELLCHECK.check = function check(user, json, callback) {
	
	var word = json.word;
	var suggestion = null;
	var checkedDictionaries = 0;
	var voteCorrect = 0;
	
		log("Spellchecking word=" + word, logModule.DEBUG);
	
	for(var i=0; i<dict.length; i++) {
		dict[i].spellSuggest(word, spellAnswer);
		//dict.isCorrect(word, spellAnswer);
	}
	
	function spellAnswer(err, correct, sugg, origWord){
		checkedDictionaries++;
		
			log("Got answer from Nodehun err=" + (err && err.message) + 
			" currect=" + correct + " sugg=" + sugg + " origWord=" + origWord + "", logModule.DEBUG);
		
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

function nodehunNotInstalled(user, json, callback) {
	var error = new Error("nodehun module is not installed on the server!");
	error.code = "MODULE_MISSING";
	callback(error, 0);
};

module.exports = SPELLCHECK;
