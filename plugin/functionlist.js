(function() {
	/*
		Shows a function list in the left column.
		
	*/
	
	"use strict";
	
	var functionListWrap;
	var functionListSelect;
	var lengthOfLongestFunction = 0;
	var lastLengthOfLongestFunction = 0;
	var functionlistMaxCharacters = 36;
	var captureKeyboard = false;
	var searchString = "";
	var domModel = [];
	
	editor.on("start", functionListMain);
	
	function functionListMain() {
		
		//console.log("Initiating functionlist");
		
		editor.on("fileParse", updateFunctionList); // Update existing function list if it already exist
		
		editor.on("fileHide", hideFunctionList); // The files hide/show when tabbing between them
		editor.on("fileClose", hideFunctionList);
		
		editor.on("fileShow", loadFunctionList); // Build the function list (when switching to this file)
				
		editor.on("moveCaret", highlightCurrentFunction);
		
		editor.on("keyDown", searchFunctionList); // Enable searching in the function list
		
		var keyEscape = 27;
		var keyLeft = 37;
		var keyRight = 39;
		
		editor.keyBindings.push({charCode: keyEscape, fun: pressEscape});
		
		editor.keyBindings.push({charCode: keyLeft, fun: leftOrRight});
		editor.keyBindings.push({charCode: keyRight, fun: leftOrRight});
		
	}
	
	function leftOrRight(file, combo, character, charCode, charDirection, className) {
		// If we are inside the function list, pressing left or right should go back to the caret
		if(className == "functionList") {
			
			functionListSelect.blur();
			
			file.scrollToCaret();
			
			editor.input = true;
			
			return false;
		}
		else return true;
		
	}
	
	function searchFunctionList(file, char, combo) {
		if(captureKeyboard && !editor.input) {
			searchString += char;
		}
		else {
			return true; // Do the default
		}
		
		if(searchString.length > 1) {
			
			// Clear all selected
			for (var i=0; i<functionListSelect.options.length; i++) {
				if(functionListSelect.options[i].selected) functionListSelect.options[i].selected = false;
			}
			
			var found = false;
			
			// Find the functions that match searchString and select them
			for(var i=0; i<domModel.length; i++) {
				if(domModel[i].name.toLowerCase().indexOf(searchString.toLowerCase()) != -1) {
					found = true;
					domModel[i].option.selected = true;
				}
			}
			
			if(found) {
				
				// todo: Make sure the options found are visible on the screen.
				
				return false; // Prevent default (chromium selectbox goto firstletter)
				
			}
			else {
				searchString = ""; // Clear the buffer if there is no match
			}
		}
		
		return true; // Do the default (the chromium way)
	}
	
	function highlightCurrentFunction(file, caret) {
		
		// Selects the option for the function the file care is currently in
		
		var parent = {};
		for(var i=0; i<domModel.length; i++) {
			if(domModel[i].option && domModel[i].start <= caret.index && domModel[i].end >= caret.index) {
				domModel[i].option.selected = true;
				
				// Make sure parent is deselected
				if(parent.option) parent.option.selected = false;
			}
			else if(domModel[i].option) {
				domModel[i].option.selected = false;
			}
			parent = domModel[i];
		}
	}
		
	
	function pressEscape(file, combo, character, charCode, pushDirection) {
		// Remove focus from the select box
		if(functionListSelect) {
			functionListSelect.blur();
			//file.canvas.focus(); // Do I need to focus elsewhere for blur to work!?
			editor.input = true;
		}
		return true;
	}
	
	function updateFunctionList(file) {
		
		// (Optimization) Updating the DOM is expensive, find out if it really needs updating, or only update parts of it

		if(editor.currentFile != file) return;
		
		if(!file.parsed) return;
		
		if(!file.parsed.functions) {
			console.warn("No functions in file.parsed!");
			hideFunctionList(file);
			return;
		}
		
		var objKeys = Object.keys(file.parsed.functions)
		
		if(objKeys.length == 0) {
			console.warn("Zero functions in file.parsed!");
			hideFunctionList(file);
			return;
		}
		
		console.time("updateFunctionList");
		
		var updatedDomModel = makeDomModel(file.parsed.functions);
		
		if(updatedDomModel.length == 0) throw new Error("Did not expect updatedDomModel.length to be zero!");
		
		// Always re-compute lengthOfLongestFunction to see if the function lists need to be resized (There's only one DOM function list. Shared with all open files)
		var lastLengthOfLongestFunction = 0;
		var lengthOfLongestFunction = 0;

		var remakeFromScratch = true;
		var functionName = "";
		var oldName = "";
		if(updatedDomModel.length == domModel.length && domModel.length > 0) {
			for(var i=0; i<updatedDomModel.length; i++) {
				
				functionName = updatedDomModel[i].name;
				
				//console.log("functionName=" + functionName);
				oldName = domModel[i].name;
				if(functionName != oldName) {
					if(updatedDomModel[i].lineNumber == domModel[i].lineNumber && updatedDomModel[i].arguments == domModel[i].arguments) {
						// It did probably change name, so update it
						
						console.log("oldName=" + oldName);
						
						if(domModel[i].option) {
							
							domModel[i].option.setAttribute("id", functionName);
							domModel[i].option.removeChild( domModel[i].option.firstChild ); // Remove the name
							domModel[i].option.appendChild(document.createTextNode(spaces(updatedDomModel[i].level) + functionName)); // Add the name again
							
							remakeFromScratch = false;
						}
						else {
							console.warn("No option asociated with last dom model");
						}
						
					}
					else {
						// Both name AND line number changed at the same time. It's safest to remake the whole list
						remakeFromScratch = true;
						break;
					};
				}
				else if(functionName.length > 0) {
					// Name is the same
					remakeFromScratch = false;
					
					// Check if arguments have changed and in that case update the arguments
					if(updatedDomModel[i].arguments != domModel[i].arguments) {
						domModel[i].option.setAttribute("title", updatedDomModel[i].arguments);
					}
					
					// Check if the line number changed and update it if it did
					if(updatedDomModel[i].lineNumber != domModel[i].lineNumber) {
						domModel[i].option.setAttribute("value", updatedDomModel[i].lineNumber);						
					}
					
				}
				
				if(remakeFromScratch) {
					break;
				}
				else {
					
					// Update longest function name
					if(updatedDomModel[i].name.length > lengthOfLongestFunction) lengthOfLongestFunction = updatedDomModel[i].name.length;
					if(domModel[i].name.length > lastLengthOfLongestFunction) lastLengthOfLongestFunction = domModel[i].name.length;
					
					// Update domModel data
					domModel[i].name = updatedDomModel[i].name;
					domModel[i].lineNumber = updatedDomModel[i].lineNumber;
					domModel[i].arguments = updatedDomModel[i].arguments;
					domModel[i].level = updatedDomModel[i].level;
					domModel[i].start = updatedDomModel[i].start;
					domModel[i].end = updatedDomModel[i].end;
				}
			}
		}
		
		if(remakeFromScratch) {
			console.log("Creating the DOM for the function list from scratch!");
			loadFunctionList(file);
		}

		
		// Find the function we are in and highlight it
		highlightCurrentFunction(file, file.caret);

		
		if(lengthOfLongestFunction > functionlistMaxCharacters) {
			console.warn("There is a very long function name! The function list will not show all of it.");
			lengthOfLongestFunction = functionlistMaxCharacters;
		}
		
		//console.log("lengthOfLongestFunction=" + lengthOfLongestFunction + " lastLengthOfLongestFunction=" + lastLengthOfLongestFunction);
		
		if(lengthOfLongestFunction > lastLengthOfLongestFunction) {
			
			editor.resizeNeeded();
			editor.renderNeeded();

		}
		
		console.timeEnd("updateFunctionList");
	}
	
	
	function findCurrentFunction(functions, charIndex) {



		var func;
		var element;
		
		for(var name in functions) {
			func = functions[name];
			
			
			
			if(func.start <= charIndex && func.end >= charIndex) {
				
				if(Object.keys(func.subFunctions).length > 0) {
					let result = findCurrentFunction(func.subFunctions, charIndex);
					if(result != null) {
						return result; // The subfunction (recursive)
					}
					else {
						return name; // Not inside any subfunction
					}
				}
				else {
					return name; // Function has no subfunction
				}
			}
		}
		
		return null; // Not insde any function
		
	}
	
	function searchFunctions(str, functions) {
		/* 
			Searches the parsed function list and return an array of matched function names.
			
			Hmm, this is a weird function ...
			The tree can have an endless depth, so we have to reach sub-functions recursivley
			
		*/
		
		var matches = [];
		
		for(var name in functions) {
			
			if(name.search(new RegExp(escapeRegExp(str), "i")) != -1) {
				matches.push(name);
				//console.log(name);
			}
			
			let func = functions[name];
			
			if(Object.keys(func.subFunctions).length > 0) {
				let result = searchFunctions(str, func.subFunctions);
				
				if(result.length > 0) matches = matches.concat(result);
			}
			
		}
		
		return matches;
		
	}
	
	
	
	function loadFunctionList(file) {
		
		if(!file.parsed) return;
		
		console.log("Load functionlist for file.path=" + file.path);
		
		if(file.parsed.functions) {
			if(Object.keys(file.parsed.functions).length > 0) {
				
				domModel = makeDomModel(file.parsed.functions);
				
				buildFunctionList(domModel);
			}
			else {
				console.log("Hiding the function list because there are no functions parsed for file.path=" + file.path);
				hideFunctionList(file);
			}
		}
		else {
			console.log("No functions parsed for file.path=" + file.path);
		}
		
	}
	
	function hideFunctionList(file) {
		
		if(file == undefined) throw new Error("File is undefined!");
		
		console.log("Hiding the functionlist for file.path=" + file.path);
		
		if(functionListWrap) {
			if(functionListWrap.style.display != "none") {
				functionListWrap.style.display="none";
				editor.resizeNeeded();
				console.log("Functionlist is now hidden");
				console.log(getStack("why hide?"));
			}
		}
	}
	
	function showFunctionList(file) {
		if(functionListWrap) {
			
			if(functionListWrap.style.display != "block") { // bugfix: editor resized at every key stroke because of fileParse event
				functionListWrap.style.display="block";
				editor.resizeNeeded();
				console.log("Functionlist is now visible");
			}
			else {
				console.log("Functionlist was already visible!");
			}
		}
	}
	
	function buildFunctionList(domModel) {
		/*
			Builds the function list from scratch using domModel
			
			We choose a select box so that you can change function by typing a letter on the keyboard
			
		*/
		
		console.time("buildFunctionList");
		
		functionListWrap = document.getElementById("functionListWrap");
		
		functionListSelect = document.getElementById("functionList");

		var leftColumn = document.getElementById("leftColumn");
		
		if(!functionListWrap) {
			functionListWrap = document.createElement("div");
			
			functionListWrap.setAttribute("id", "functionListWrap");
			functionListWrap.setAttribute("class", "wrap functionListWrap");
			
			leftColumn.appendChild(functionListWrap);
		}
		else {
			showFunctionList();
		}
		
		if(!functionListSelect) {
			functionListSelect = document.createElement("select");
			
			functionListSelect.setAttribute("id", "functionList");
			functionListSelect.setAttribute("class", "functionList");
			functionListSelect.setAttribute("multiple", "multiple");
			
			functionListSelect.onchange = function(e) {
				editor.currentFile.scrollToLine(this.value);
			}
			functionListSelect.onfocus = function(e) {
				captureKeyboard = true;
				searchString = "";
			}
			functionListSelect.onblur = function(e) {
				captureKeyboard = false;
			}
			functionListSelect.onclick = function() {
				// Reset search for function string
				searchString = "";
			}
			
			functionListWrap.appendChild(functionListSelect);
			
		}
		
		// Empty the list
		while(functionListSelect.firstChild ){
			functionListSelect.removeChild( functionListSelect.firstChild );
		}
		
		
		// Fill the list
		domModel.forEach(addOption);


		
		// Adjust the height
		functionListSelect.setAttribute("size", domModel.length);		
		
		// Why isn't the width pushing out width of the parent!?
		
		editor.resizeNeeded();
		
		console.timeEnd("buildFunctionList");
				
		
		function addOption(func, thisIndex, array) {
			
			var functionName = func.name;
			
			console.log("build " + functionName);
			
			var lastIndex = array.length-1;
			var hasSubFunctions = thisIndex == lastIndex ? false : array[thisIndex+1].level > func.level;
			
			if(functionName != "" || hasSubFunctions) { // Dont show anonynous functions unless it has subfunctions
				var option = document.createElement("option");
				
				if(functionName == "") {
					option.appendChild(document.createTextNode(spaces(func.level) + "function"));
				}
				else {
					option.appendChild(document.createTextNode(spaces(func.level) + functionName));
				}
				option.setAttribute("value", func.lineNumber);
				
				if(func.arguments) {
					option.setAttribute("title", func.arguments + "");
				}
				else {
					option.setAttribute("title", "No arguments");
				}
				
				option.onclick = function() {
					//editor.currentFile.scrollToLine(func.lineNumber);
					
					// We need to keep the functionlist focused to allow typing in it
					
				}
				
				//option.setAttribute("id", func.name);
				
				func.option = option;
				
				functionListSelect.appendChild(option);
				

			}
		}
	}
	
	function spaces(level) {
		var str = [];
		var nrOfSpacesPerLevel = 2;
		for(var i=0; i<level*nrOfSpacesPerLevel; i++) {
			str.push("\u00A0"); // space or &nbsp; doesn't work, so we use unicode
		}
		//console.log(level + " spaces");
		return str.join("");
		
	}
	
	
	function makeDomModel(functions) {
		// Returns an array of the parsed functions
		
		var domModel = [];
				
		add(functions, 0);
		
		function add(functions, level) {
			var f;
			for(var name in functions) {
				f = functions[name];
				domModel.push({name: f.name, lineNumber: f.lineNumber , arguments: f.arguments, level: level, start: f.start, end: f.end});
				
				add(f.subFunctions, level+1);
			}
		}
		
		return domModel;
	}
	
	
})();