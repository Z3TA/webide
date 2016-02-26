
var fs = require("fs"); // Load it first so that we can write any errors to a log file

// Need to be before any errors
process.on('uncaughtException', function (err) {
	// prevent infinite recursion
	process.removeListener('uncaughtException', arguments.callee);

	logExit(err);
});


var isWin = /^win/.test(process.platform);
var isLinux = /^Linux/.test(process.platform);

if(isWin) {
	var Nodehun = require('./nodehun_windows.node');
}
else {
	var Nodehun = require('./nodehun_linux.node');
}

var dict = [];

var useLanguages;

var numDictionaries = 0;
var languagesLoaded = 0;

process.on('message', spellCheck);

function main() {
	//log("Worker loaded");
	
	var languages = process.argv[2]; //AFIAK elements 0 and 1 are already populated with env info
	
	if(languages == undefined) throw new Error("No languages specified in arguments!");

	useLanguages = languages.split(";");
	
	for(var i=0; i<useLanguages.length; i++) {
		loadDictionary(useLanguages[i]);
	}
	
	
}


function loadDictionary(lang) {
	
	//log("Loading dictionary " + lang);
	
	// Async load the .aff and .dic files. Then create a dictionary
	
	var affBuffer;
	var dictBuffer;
	var gotAff = false;
	var gotDict = false;
	
	readFromDisk("./languages/" + lang + "/" + lang + ".aff", readAff, true);  // true = return buffer
	readFromDisk("./languages/" + lang + "/" + lang + ".dic", readDict, true);
	
	function readAff(path, buffer) {
		affBuffer = buffer;
		gotAff = true;
		
		if(gotAff && gotDict) gotAll();
	}
	
	function readDict(path, buffer) {
		dictBuffer = buffer;
		gotDict = true;
		
		if(gotAff && gotDict) gotAll();
	}
	
	function gotAll() {
		/*
			We have both the aff and dict content!
			Create the dictionary:
		*/
		
		dict.push(new Nodehun(affBuffer,dictBuffer));
		
		//log("Dictionary " + lang + " loaded");
		
		if(++languagesLoaded == useLanguages.length) {
			allDictionariesLoaded();
		}
	}
	
}

function allDictionariesLoaded() {
	//log("All dictionaries loaded");
	numDictionaries = dict.length;
	process.send("ready!");
	//log("Worker ready");
}


function spellCheck(data) {
	
	var arg = data.split(";");
	
	var word = arg[1];
	
	var checkedDictionaries = 0;
	var voteCorrect = 0;
	var suggestion = "";
	
	//log("spellCheck:" + word);
	
	for(var i=0; i<numDictionaries; i++) {
		dict[i].spellSuggest(word, spellAnswer);
		//dict.isCorrect(word, spellAnswer);
	}
	
	function spellAnswer(err, correct, sugg, origWord){
		
		if(err) throw err;
		
		checkedDictionaries++;
		
		if(correct) {
			voteCorrect++;
		}
		else if(sugg && !suggestion) { // sugg is either a string or null
			suggestion = sugg;
		}
		
		if(checkedDictionaries == numDictionaries) {
			// All directories has been checked!
			
			if(voteCorrect > 0) {
				// At least one dictionary think it's correct.
				process.send(data + ";*");
			}
			else {
				process.send(data + ";" + suggestion);
			}
		}

	}
}


function readFromDisk(path, callback, returnBuffer) {
	// Return raw buffer
	
	fs.readFile(path, function(err, buffer) {
		if (err) throw err;
		
		callback(path, buffer);
	});
}


function log(txt) {
	fs.appendFileSync("worker-debug.log", txt + "\n");
}


function logExit(err) {
	// Functions are hoisted!
	log(err);
	log(err.stack);
	var fail = 1;
	process.exit(fail);
}

main();