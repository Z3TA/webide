(function() {

	/*
		This module makes it faster to type using a numeric keyboard
		1 = weird symbol
		2 = ABC
		3 = DEF
		4 = GHI
		5 = JKL
		6 = MNO
		7 = PQRS
		8 = TUV
		9 = WXYZ
		* = +
		0 = space
		# = special characters
		
		Typing hello world: 43556096753
		
		
		
	*/
	
	var windowMenu;
	var active = false;
	var activeOnce = false;
	var mode = "English";
	var rank, words;
	
EDITOR.plugin({
desc: "T9 input prediction",
load:function loadT9prediction() {

			EDITOR.addMode("T9P");
			
			windowMenu = EDITOR.windowMenu.add("T9 input prediction", ["Edit", 10], toggleT9);


},
unload: function unloadT9prediction() {

			EDITOR.windowMenu.remove(windowMenu);
			if(activeOnce) removeKeyboardListeners();
			
}
});

	function toggleT9() {
		
		if(active) {

			if(windowMenu) windowMenu.deactivate();
			EDITOR.setMode("default");
			active = false;
		}
		else {
			
			if(windowMenu) windowMenu.activate();
			EDITOR.setMode("T9P");
			active = true;
			
			if(!activeOnce) {
				activeOnce = true;
				loadDictionary();
				addKeyboardListeners();
			}
			
		}
		
		if(windowMenu) windowMenu.hide();
		
	}
	
	function loadDictionary() {
		UTIL.httpGet("count_1w.txt", function(err, text) {
			if(err) {
				alertBox(err.message);
				return;
			}
			
			var lines = text.split("\n");
			rank = new Array(lines.length);
			words = new Array(lines.length);
			for (var i=0, tmp=""; i<lines.length; i++) {
				tmp = lines[i].split("\t");
				words[i] = tmp[0];
				rank[i] = parseFloat(tmp[1]);
			}
			
		});
	}
	
	function addKeyboardListeners() {
		
		EDITOR.bindKey({desc: "1", fun: t9_1, key: "1", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "2", fun: t9_2, key: "2", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "3", fun: t9_3, key: "3", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "4", fun: t9_4, key: "4", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "5", fun: t9_5, key: "5", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "6", fun: t9_6, key: "6", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "7", fun: t9_7, key: "7", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "8", fun: t9_8, key: "8", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "9", fun: t9_9, key: "9", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "0", fun: t9_0, key: "0", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "*", fun: t9_star, key: "*", combo: 0, mode: "T9P"});
		EDITOR.bindKey({desc: "# Special", fun: t9_special, key: "#", combo: 0, mode: "T9P"});
		
	}
	
	function removeKeyboardListeners() {
		EDITOR.unbindKey(t9_1);
		EDITOR.unbindKey(t9_2);
		EDITOR.unbindKey(t9_3);
		EDITOR.unbindKey(t9_4);
		EDITOR.unbindKey(t9_5);
		EDITOR.unbindKey(t9_6);
		EDITOR.unbindKey(t9_7);
		EDITOR.unbindKey(t9_8);
		EDITOR.unbindKey(t9_9);
		EDITOR.unbindKey(t9_0);
		EDITOR.unbindKey(t9_star);
		EDITOR.unbindKey(t9_special);
	}
	
	function t9_1() {}
	function t9_2() {
		add(["a", "b", "c"]);
		return PREVENT_DEFAULT;
	}
	function t9_3() {
		add(["d", "e", "f"]);
		return PREVENT_DEFAULT;
}
	function t9_4() {
		add(["g", "h", "i"]);
		return PREVENT_DEFAULT;
	}
	function t9_5() {
		add(["j", "k", "l"]);
		return PREVENT_DEFAULT;
	}
	function t9_6() {
		add(["m", "n", "o"]);
		return PREVENT_DEFAULT;
	}
	function t9_7() {
		add(["p", "q", "r", "s"]);
		return PREVENT_DEFAULT;
	}
	function t9_8() {
		add(["t", "u", "v"]);
		return PREVENT_DEFAULT;
	}
	function t9_9() {
		add(["w", "x", "y", "z"]);
		return PREVENT_DEFAULT;
	}
	function t9_0() {}
	function t9_star() {}
	function t9_special() {}
	
	var currentWordLength = 0;
	var alternatives = [];
var combinations = [];

	function add(letters) {
		
		currentWordLength++;
		
if(currentWordLength == 1) combinations = [];

		var comboLength = combinations.length;
		
		suggestions = []; // Always make new suggestions when another letter is added
		
		if(comboLength == 0) {
			for (var i=0; i<letters.length; i++) {
				combinations.push(letters[i]);
			}
			
			// Suggest the most common of the letters!?
			
			console.log("combinations: " + JSON.stringify(combinations));
			
		}
		else {
			for(var j=0; j<comboLength; j++) {
				for(var k=1; k<letters.length; k++) {
					console.log("Adding letter=" + letters[i] + " to combinations.length=" + combinations.length);
					combinations.push(  combinations[j] + letters[k] );
				}
				
				console.log("Adding letter=" + letters[0] + " to existing combinations.length=" + combinations.length);
				combinations[j] += letters[0]; 
			}
			
			// Filter combinations so they only contains valid words, then sort by rank, and suggest the most common
			var goodCombinations = [];
			console.time("Checking dictionary");
			outer: for(var i=0, part=""; i<words.length; i++) {
				part = words[i].slice(0, currentWordLength);
				
				inner: for(var j=0; j<combinations.length; j++) {
					if(combinations[j] == part) {
						//console.log(combinations[j]  + " == " + part);
						suggestions.push(i);
						if(goodCombinations.indexOf(part) == -1) goodCombinations.push(part);
					}
				}
			}
			console.timeEnd("Checking dictionary");
			
			console.time("Sorting suggestions");
			suggestions.sort(sortSugg);
			console.timeEnd("Sorting suggestions");
			
			var suggestedWords = [];
			for(var i=0; i<suggestions.length; i++) {
				suggestedWords.push(words[suggestions[i]]);
			}
			
			console.log("combinations: " + JSON.stringify(combinations));
			console.log("goodCombinations: " + JSON.stringify(goodCombinations));
			console.log("suggestedWords: " + JSON.stringify(suggestedWords));
			
			if(goodCombinations.length < combinations.length) console.log("Ditching " + (combinations.length - goodCombinations.lengthength) + " combinations.");
			
			combinations = goodCombinations; // Only use the good combinations
			
		}
		
		
		
	}
	
	
	function sortSugg(iA, iB) {
		if(rank[iA] > rank[iB]) return -1;
		else if(rank[iB] > rank[iA]) return 1;
		else return 0;
	}
	
	
	
	
})();