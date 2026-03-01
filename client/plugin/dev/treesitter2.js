/*

	!DO:NOT:BUNDLE!

	?treesitter2=true&disable=js_parser

	TreeSitter2 - A TreeSitter based JavaScript parser plugin.
	Replaces the built-in JS parser (js_parser.js) with TreeSitter.

	https://tree-sitter.github.io/tree-sitter/

	npm install --save-dev tree-sitter-cli tree-sitter-javascript
	npx tree-sitter build-wasm node_modules/tree-sitter-javascript

	If it doesn't work, wget the files from https://tree-sitter.github.io/tree-sitter/playground

*/
(function() {
	"use strict";

	var Parser;
	var treeSitterReady = false;
	var jsLanguage = null;
	var trees = {}; // file.path -> tree
	var pendingFiles = []; // Files that opened before tree-sitter was ready

	if(!QUERY_STRING["treesitter2"]) {
		return;
	}

	EDITOR.plugin({
		desc: "Treesitter2 JavaScript parser",
		load: loadTreeSitter2,
		unload: unloadTreeSitter2,
		order: 99 // Load before js_parser (order 100)
	});

	function loadTreeSitter2() {
		EDITOR.on("fileOpen", onFileOpen);
		EDITOR.on("fileChange", onFileChange, 100);

		console.log("treesitter2: Loading tree-sitter...");
		EDITOR.loadScript("../tree-sitter/tree-sitter.js", function(err) {
			if(err) {
				alertBox("treesitter2: Unable to load tree-sitter! Error: " + err.message);
				return;
			}

			Parser = window.TreeSitter;
			Parser.init().then(function ready() {
				var src = "../tree-sitter/tree-sitter-javascript.wasm";
				Parser.Language.load(src).then(function(lang) {
					jsLanguage = lang;
					treeSitterReady = true;
					console.log("treesitter2: Ready!");

					// Parse any files that were opened before we were ready
					for(var i = 0; i < pendingFiles.length; i++) {
						parseFile(pendingFiles[i]);
					}
					pendingFiles = [];

				}, function(err) {
					alertBox("treesitter2: Failed to load JavaScript grammar! Error: " + err.message);
				});
			}, function(err) {
				alertBox("treesitter2: Failed to initialize! Error: " + err.message);
			});
		});
	}

	function unloadTreeSitter2() {
		EDITOR.removeEvent("fileOpen", onFileOpen);
		EDITOR.removeEvent("fileChange", onFileChange);

		// Clean up trees
		for(var path in trees) {
			if(trees.hasOwnProperty(path)) {
				trees[path].delete();
			}
		}
		trees = {};
		pendingFiles = [];
	}

	function shouldParse(file) {
		if(file.disableParsing) return false;
		if(file.isBig) return false;
		var ext = file.fileExtension;
		return ext == "js" || ext == "jsx" || ext == "ts" || ext == "tsx";
	}

	function onFileOpen(file) {
		if(!shouldParse(file)) return;

		if(!treeSitterReady) {
			pendingFiles.push(file);
			return;
		}

		parseFile(file);
	}

	function onFileChange(file, type, characters, caretIndex, row, col) {
		if(!shouldParse(file)) return;
		if(!treeSitterReady) return;

		// For now, do a full reparse on every change.
		// A future optimization could use tree.edit() for incremental parsing.
		parseFile(file);
	}

	function parseFile(file) {
		if(!treeSitterReady || !jsLanguage) return;

		var parser = new Parser();
		parser.setLanguage(jsLanguage);

		var oldTree = trees[file.path] || null;
		var tree = parser.parse(file.text, oldTree);

		if(oldTree) oldTree.delete();
		trees[file.path] = tree;
		parser.delete();

		var parseData = extractParseData(file, tree);
		file.haveParsed(parseData);
	}

	function extractParseData(file, tree) {
		var functions = [];
		var quotes = [];
		var comments = [];
		var globalVariables = {};
		var codeBlockLeft = 0;
		var codeBlockRight = 0;
		var xmlTags = [];

		walkNode(tree.rootNode, null);

		return {
			language: "JavaScript",
			functions: functions,
			quotes: quotes,
			comments: comments,
			globalVariables: globalVariables,
			codeBlockLeft: codeBlockLeft,
			codeBlockRight: codeBlockRight,
			blockMatch: (codeBlockLeft - codeBlockRight) == 0,
			xmlTags: xmlTags
		};

		function walkNode(node, parentFunc) {

			// Count braces
			if(node.type == "{") codeBlockLeft++;
			else if(node.type == "}") codeBlockRight++;

			// Comments
			if(node.type == "comment") {
				comments.push({start: node.startIndex, end: node.endIndex});
			}

			// Strings
			else if(node.type == "string" || node.type == "template_string") {
				quotes.push({start: node.startIndex, end: node.endIndex});
			}

			// Function declarations
			else if(node.type == "function_declaration") {
				var func = extractFunction(node);
				if(parentFunc) {
					parentFunc.subFunctions.push(func);
				}
				else {
					functions.push(func);
				}
				// Walk children with this function as parent
				walkChildren(node, func);
				return;
			}

			// Arrow functions and function expressions assigned to variables
			else if(node.type == "lexical_declaration" || node.type == "variable_declaration") {
				var extracted = extractVarFunction(node);
				if(extracted) {
					if(parentFunc) {
						parentFunc.subFunctions.push(extracted);
					}
					else {
						functions.push(extracted);
					}
					walkChildren(node, extracted);
					return;
				}
				// Extract global variables
				else if(!parentFunc) {
					extractVariables(node, globalVariables);
				}
			}

			// JSX elements
			else if(node.type == "jsx_element" || node.type == "jsx_self_closing_element" ||
					node.type == "jsx_opening_element") {
				xmlTags.push({
					start: node.startIndex,
					end: node.endIndex,
					wordLength: getJsxTagNameLength(node),
					selfEnding: node.type == "jsx_self_closing_element"
				});
			}

			walkChildren(node, parentFunc);
		}

		function walkChildren(node, parentFunc) {
			for(var i = 0; i < node.childCount; i++) {
				walkNode(node.child(i), parentFunc);
			}
		}

		function extractFunction(node) {
			var nameNode = node.childForFieldName("name");
			var paramsNode = node.childForFieldName("parameters");
			var name = nameNode ? nameNode.text : "";
			var args = paramsNode ? paramsNode.text : "()";
			var lineNumber = node.startPosition.row;

			var func = {
				name: name,
				arguments: args,
				start: node.startIndex,
				end: node.endIndex,
				subFunctions: [],
				variables: {},
				lineNumber: lineNumber,
				endRow: node.endPosition.row,
				arrowFunction: false,
				lambda: false,
				global: false,
				prototype: {},
				returns: []
			};

			return func;
		}

		function extractVarFunction(node) {
			// Check if this is: var/let/const name = function() {} or var/let/const name = () => {}
			for(var i = 0; i < node.childCount; i++) {
				var child = node.child(i);
				if(child.type == "variable_declarator") {
					var nameNode = child.childForFieldName("name");
					var valueNode = child.childForFieldName("value");
					if(valueNode && (valueNode.type == "function" || valueNode.type == "arrow_function")) {
						var name = nameNode ? nameNode.text : "";
						var paramsNode = valueNode.childForFieldName("parameters");
						var args = paramsNode ? paramsNode.text : "()";
						var isArrow = valueNode.type == "arrow_function";

						return {
							name: name,
							arguments: args,
							start: node.startIndex,
							end: node.endIndex,
							subFunctions: [],
							variables: {},
							lineNumber: node.startPosition.row,
							endRow: node.endPosition.row,
							arrowFunction: isArrow,
							lambda: true,
							global: false,
							prototype: {},
							returns: []
						};
					}
				}
			}
			return null;
		}

		function extractVariables(node, vars) {
			for(var i = 0; i < node.childCount; i++) {
				var child = node.child(i);
				if(child.type == "variable_declarator") {
					var nameNode = child.childForFieldName("name");
					if(nameNode && nameNode.type == "identifier") {
						vars[nameNode.text] = {
							type: "unknown",
							value: "",
							keys: {},
							method: false,
							args: ""
						};
					}
				}
			}
		}

		function getJsxTagNameLength(node) {
			for(var i = 0; i < node.childCount; i++) {
				var child = node.child(i);
				if(child.type == "identifier" || child.type == "jsx_identifier" ||
				   child.type == "member_expression" || child.type == "nested_identifier") {
					return child.text.length;
				}
			}
			return 0;
		}
	}

})();
