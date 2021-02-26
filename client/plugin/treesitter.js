/*

	?treesitter=true&disable=js_parser

	https://tree-sitter.github.io/tree-sitter/

	https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web

	npm install --save-dev tree-sitter-cli tree-sitter-javascript
	npx tree-sitter build-wasm node_modules/tree-sitter-javascript

*/
(function() {
	"use strict";

	var Parser;
	var parsers = {};
	var treeSitterReady = false;
	var whenReady = [];
	var langageIsLoading = {};
	var languages = {};
	var languageMap = {
		JavaScript: "tree-sitter-javascript.wasm" 
	};


	if(!QUERY_STRING["treesitter"]) {
		console.warn("tree-sitter:Not loading TreeSitter parser!");
		return;
	}

	EDITOR.plugin({
		desc: "Treesitter parser",
		load: loadTreeSitter,
		unload: unloadTreeSitter,
		order: 1000 // Load before reopen_files.js
	});

	function treeSitterFileOpen(file) {

		console.log("tree-sitter:treeSitterFileOpen: file.path=" + file.path + " treeSitterReady=" + treeSitterReady + "");

		if(!EDITOR.files.hasOwnProperty(file.path)) return;

		// Setup a new parser for this file...

		if(!treeSitterReady) {
			console.log("tree-sitter:treeSitterFileOpen: tree-sitter not yet ready!");
			setTimeout(function waitForTreeSitterReady() {
				treeSitterFileOpen(file);
			}, 1000);
			return;
		}


		if(file.fileExtension == "js") {
			var lang = "JavaScript";
		}
		else {
			console.warn("tree-sitter:treeSitterFileOpen: Language not supported by tree-sitter: file.path=" + file.path);
			return;
		}

		if(!languages.hasOwnProperty(lang)) {
			console.log("tree-sitter:treeSitterFileOpen: Language lang=" + lang + " not yet available!");

			if(!langageIsLoading[lang]) {
				langageIsLoading[lang] = true;

				var src = "../tree-sitter/" + languageMap[lang];

				Parser.Language.load(src).then(function languageLoaded(loadedLanguage) {
					languages[lang] = loadedLanguage;

					console.log("tree-sitter:treeSitterFileOpen: Loaded lang=" + lang);

					treeSitterFileOpen(file);

				}, function languageFailedLoading(err) {
					alertBox("Failed to load lang=" + lang + " src=" + src + " Error: " + err.message);
				});

				return;
			}

			setTimeout(function waitForTreeSitterReady() {
				treeSitterFileOpen(file);
			}, 1000);
			return;
		}


		parsers[file.path] = new Parser();
		parsers[file.path].setLanguage( languages[lang] );

		var tree = parsers[file.path].parse(file.text);

		console.log("tree-sitter:treeSitterFileOpen: tree=" + JSON.stringify(tree, null, 2) );

		console.log("tree-sitter:treeSitterFileOpen: tree.rootNode=" + JSON.stringify(tree.rootNode, null, 2) );

		console.log("tree-sitter:treeSitterFileOpen: tree.rootNode=", tree.rootNode );

		console.log("tree-sitter:treeSitterFileOpen: tree.rootNode=" + tree.rootNode.toString() );


		console.log("tree-sitter:treeSitterFileOpen: tree.walk()=",  tree.walk() );

		console.log("tree-sitter:treeSitterFileOpen: tree.rootNode.walk()=", tree.rootNode.walk() );


	}

	function treeSitterFileClose(file) {
		console.log("tree-sitter:treeSitterFileClose: file.path=" + file.path + " ");
	}

	function treeSitterFileChange(file) {
		console.log("tree-sitter:treeSitterFileChange: file.path=" + file.path + " ");
	}

	function loadTreeSitter() {

		EDITOR.on("fileOpen", treeSitterFileOpen);
		EDITOR.on("fileClose", treeSitterFileClose);
		EDITOR.on("fileChange", treeSitterFileChange);


		console.log("tree-sitter: Loading script...");
		EDITOR.loadScript("../tree-sitter/tree-sitter.js", function loadedTreeSitter(err) {
			if(err) alertBox("Unable to load tree-istter! Error: " + err.message);
		
			Parser = window.TreeSitter;
			Parser.init().then(ready, initError);

			function ready() {
				treeSitterReady = true;
				console.log("tree-sitter: ready!");
			}

			function initError(err) {
				alertBox("tree-istter parser failed to initilize! Error: " + err.message);
			}

		});

	}

	function unloadTreeSitter() {
		EDITOR.removeEvent("fileOpen", treeSitterFileOpen);
		EDITOR.removeEvent("fileClose", treeSitterFileClose);

		EDITOR.removeEvent("fileChange", treeSitterFileChange);


	}

})();
