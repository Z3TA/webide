
(function() {

	/*
		
		!DO:NOT:BUNDLE!
		
		This wasn't very useful because almost any word can be completed with another word,
		so you end up typing the whole word anyway!
		
		English words can be downloaded from:
		https://github.com/dwyl/english-words
		
	*/
	return;
	
	var dictionary = "";
	
EDITOR.plugin({
		desc: "Autocomplete english words",
load: loadAutocompleteEnglishWords,
unload: unloadAutocompleteEnglishWords,
});

	function loadAutocompleteEnglishWords() {
		loadDictionary(function(err) {
var priorityOrder = 10;
			
			if(err) alertBox(err);
			else {
				EDITOR.on("autoComplete", autocompleteEnglishWord, priorityOrder);
			}
		});
	}
	
	function unloadAutocompleteEnglishWords() {
		
		if(dictionary) EDITOR.removeEvent("autoComplete", autocompleteEnglishWord);
		
		dictionary = ""; // Maybe will free up some memory ?
	}
	
	function autocompleteEnglishWord(file, word, wordLength, gotOptions) {
		if(gotOptions > 0) return; // Don't do anything if another plugin has made a suggestion
		
		var maxResults = 30;
			var words = [];
		var start = 0;
		var end = 0;
		while(words.length < maxResults) {
			start = dictionary.indexOf(word, end);
			if(start == -1) break;
			end = dictionary.indexOf("\n", start);
			if(end == -1) break;
			words.push(dictionary.slice(start, end));
		}
			
		return words;
	}
	
	function loadDictionary(cb) {
		var url = "/english-words.txt";
		UTIL.httpGet(url, function(err, words) {
			if(err) {
if(cb) return cb(err);
				else alertBox("Unable to load English dictionary! url=" + url + " Error: " + err.message);
			}
			else {
dictionary = words;
				if(cb) cb(null);
			}
		});
	}
	
	
	
})();