(function() {
	/*
		Shows a function list in the left column.
		
		Depends on jsParser!
	
	*/
	
	"use strict";
	
	var functionListWrap;
	var functionListSelect;
	var firstLoad = true;
	var lengthOfLongestFunction = 0;
	var lastLengthOfLongestFunction = 0;
	var functionlistMaxCharacters = 36;
	var elements = {}; // name: Mapper to the option element
	var captureKeyboard = false;
	var charBuffer = "";
	
	editor.on("start", functionListMain);
	
	function functionListMain() {
		
		//console.log("Initiating functionlist");
		
		editor.on("fileParse", initFunctionList);

		editor.on("fileHide", hideFunctionList); // The files hide/show when tabbing between them
		editor.on("fileShow", loadFunctionList);
		editor.on("fileClose", hideFunctionList);
		
		editor.on("moveCaret", highlightCurrentFunction);
		
		editor.on("keyDown", searchFunctionList); // Enable searching in the function list
		
		global.keyBindings.push({charCode: 27, fun: pressEscape});
	}
	
	function searchFunctionList(file, char, combo) {
		if(captureKeyboard && !file.gotFocus) {
			charBuffer += char;
		}
		else {
			return true;
		}
		
		if(charBuffer.length > 1) {
			// Find the function in the functionlist
			var currentFunctionName = searchFunctions(charBuffer, file.parsed.functions);
			if(currentFunctionName != null) {
				elements[currentFunctionName].selected = true;
				return false; // Prevent default
			}
			else {
				charBuffer = ""; // Clear the buffer if there is no match
			}
			
		}
		return true;
		}
	
	function highlightCurrentFunction(eventName, file, cursor) {
		if(file.parsed.functions) {
			
			// Deselect all
			for(var name in elements) {
				elements[name].selected = false;
			}
			
			var currentFunctionName = findCurrentFunction(file.parsed.functions, cursor.index);
			
			//console.log("currentFunctionName=" + currentFunctionName + "");
			
			if(currentFunctionName) elements[currentFunctionName].selected = true;
			
			
		}
		
	}
	
	
	
	function pressEscape(file, combo, character, charCode, pushDirection) {
		// Remove focus from the select box
		if(functionListSelect) {
		functionListSelect.blur();
		file.canvas.focus();
			file.gotFocus = true;
		}
	}

	function initFunctionList(file) {
		
		if(!file.parsed.functions) {
			console.warn("No functions in file.parsed!");
			hideFunctionList();
		}
		else if(Object.keys(file.parsed.functions).length == 0) {
			console.warn("Zero functions in file.parsed!");

			hideFunctionList();
		}
		else {
			
			lastLengthOfLongestFunction = lengthOfLongestFunction;
			
			loadFunctionList(file); // lengthOfLongestFunction is recalculated here
			
			
			// Find the function we are in and highlight it
			var currentFunctionName = findCurrentFunction(file.parsed.functions, file.caret.index);
			if(currentFunctionName) elements[currentFunctionName].selected = true;

			//console.log("lengthOfLongestFunction=" + lengthOfLongestFunction);
			
			if(firstLoad || (lengthOfLongestFunction != lastLengthOfLongestFunction && (lengthOfLongestFunction <= functionlistMaxCharacters && lastLengthOfLongestFunction != 0))) {
				editor.resizeNeeded(); // Fixed bug of function list not starting at 100% height. PS: The file hides/show when resizing! So I had to make this extra function to prevent loop
				editor.renderNeeded();

				if(firstLoad) firstLoad = false;
			}


		}
		

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
			Hmm, this is a weird function ...
			The tree can have an endless depth, so we have to reach sub-functions recursivley
			
		*/
		
		for(var name in functions) {
			
			if(name.search(new RegExp(str, "i")) != -1) {
					return name;
			}
			
			let func = functions[name];
			
			if(Object.keys(func.subFunctions).length > 0) {
				let result = searchFunctions(str, func.subFunctions);
					
					if(result != null) return result;
				}
				
		}
		
		return null; // Nothing found
		
		}
	
	
	
	function loadFunctionList(file) {
		
		if(file.parsed.functions) {
			if(Object.keys(file.parsed.functions).length > 0) {
				buildFunctionList(file.parsed.functions);
			}
			else {
				hideFunctionList();
			}
		}
	}
	
	function hideFunctionList(file) {
		if(functionListWrap) {
			if(functionListWrap.style.display != "none") {
			functionListWrap.style.display="none";
			editor.resizeNeeded();
				console.log("Functionlist is now hidden");
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
	
	function buildFunctionList(functions) {
		/*
			We choose a select box so that you can change function by typing a letter on the keyboard
		
		*/
		
		console.time("buildFunctionList");
		
		functionListWrap = document.getElementById("functionListWrap");

		functionListSelect = document.getElementById("functionList");
		
		var leftColumn = document.getElementById("leftColumn");
		var ul;
		var li;
		var functionCount = 0;
			
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
				global.currentFile.gotoLine(this.value);
			}
			functionListSelect.onfocus = function(e) {
				captureKeyboard = true;
				charBuffer = "";
				}
			functionListSelect.onblur = function(e) {
				captureKeyboard = false;
			}
			true;
			 functionListWrap.appendChild(functionListSelect);
			 
		}
		
		// Empty the list
		while(functionListSelect.firstChild ){
		  functionListSelect.removeChild( functionListSelect.firstChild );
		}
		elements = {}; // can this leak?
		
		// Fill the list
		for(var functionName in functions) {
			buildList(functions[functionName], 0); // Second argument is level of spaces
		}
		
		// Adjust the height
		functionListSelect.setAttribute("size", functionCount);		
		
		// Why isn't the width pushing out width of the parent!?

		console.timeEnd("buildFunctionList");
		
		
		function buildList(func, level) {
			
			var functionName = func.name;
			
			if(functionName != "" || Object.keys(func.subFunctions).length > 0) { // Dont show anonynous functions unless it has subfunctions
				var option = document.createElement("option");
				
				lengthOfLongestFunction = Math.max(lengthOfLongestFunction, functionName.length);
				
				if(functionName == "") {
					option.appendChild(document.createTextNode(spaces(level) + "function"));
				}
				else {
					option.appendChild(document.createTextNode(spaces(level) + functionName));
				}
				option.setAttribute("value", func.lineNumber);
				
				if(func.arguments) {
					option.setAttribute("title", func.arguments + "");
				}
				else {
					option.setAttribute("title", "No arguments");
				}
				
				option.onclick = function() {
					global.currentFile.gotoLine(func.lineNumber);
				}
				
				option.setAttribute("id", func.name);
				
				elements[functionName] = option;
				
				functionListSelect.appendChild(option);
				
				functionCount++;
			}
			
			level = level + 1;
			
			// Sub functions
			for(var subFunctionName in func.subFunctions) {
				buildList(func.subFunctions[subFunctionName], level)
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
			
		}

		
	}
	
	
})();