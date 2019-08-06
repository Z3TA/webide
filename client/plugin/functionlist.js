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
	var leftColumn;
	var rightColumn;
	var menu;
	var alwaysShowFunctionList = true;
	var forcedSingleRow = false;
	var functionListActive = true;
	var winMenuToggleFunctionlist;
	var winMenuFunctionList;
	
	EDITOR.plugin({
		desc: "Show list of JS functions in left column",
		load: functionListMain,
		unload: unload,
		order: 200
	});
	
	function functionListMain() {
		console.log("Initiating functionlist");
		
		EDITOR.on("fileParse", updateFunctionList); // Update existing function list if it already exist
		
		EDITOR.on("fileHide", hideFunctionList); // The files hide/show when tabbing between them
		EDITOR.on("fileClose", hideFunctionList);
		
		EDITOR.on("fileShow", loadFunctionList); // Build the function list (when switching to this file)
		
		EDITOR.on("moveCaret", highlightCurrentFunction);
		
		EDITOR.on("keyDown", searchFunctionList); // Enable searching in the function list
		
		//EDITOR.bindKey({desc: "Remove focus from the function list", charCode: char_Esc, fun: blurFunctionList});
		
		winMenuToggleFunctionlist = EDITOR.windowMenu.add("Function list", ["View", 9], toggleFunctionList);
		if(functionListActive) winMenuToggleFunctionlist.activate();
		
		functionListWrap = document.createElement("div");
		
		functionListWrap.setAttribute("id", "functionListWrap");
		functionListWrap.setAttribute("class", "wrap functionListWrap");
		functionListWrap.setAttribute("style", "display: none"); // Start hidden
		
		functionListWrap.oncontextmenu = function hideMaybe() {
			var disable = "Always hide the function list";
			var hide = "Hide function list";
			var cancel = "Cancel";
			
			confirmBox('Hide the function list ?\nClick <i>Show function list</i> in the menu to show it again.', [disable, hide, cancel], function(answer) {
				if(answer == cancel) return;
				
				if(answer == disable) {
					alwaysShowFunctionList = false;
				}
				
				if(!menu) menu = EDITOR.ctxMenu.add("Show function list", 20, function showFunctionListAgain() {
					alwaysShowFunctionList = true;
					showFunctionList();
					EDITOR.ctxMenu.hide();
					EDITOR.ctxMenu.remove(menu);
				});
				
				hideFunctionList();
			});
		}
		
		leftColumn = document.getElementById("leftColumn");
		rightColumn = document.getElementById("rightColumn");
		
		leftColumn.appendChild(functionListWrap); // Placing it in right column because it is not always visible (prevents text placement to move)
		
		
	}
	
	function unload() {
		if(functionListWrap && functionListWrap.parentNode == leftColumn) leftColumn.removeChild(functionListWrap);
		
		EDITOR.removeEvent("fileParse", updateFunctionList);
		EDITOR.removeEvent("fileHide", hideFunctionList);
		EDITOR.removeEvent("fileClose", hideFunctionList);
		EDITOR.removeEvent("fileShow", loadFunctionList);
		EDITOR.removeEvent("moveCaret", highlightCurrentFunction);
		EDITOR.removeEvent("keyDown", searchFunctionList);
		
		EDITOR.windowMenu.remove(winMenuToggleFunctionlist);
		
		if(winMenuFunctionList) EDITOR.windowMenu.remove(winMenuFunctionList);
	}
	
	function mobileFubarDetected() {
		/*
			Some mobile browser does not allow multi row select box.
			Meaning there will be unneccesary empty space
			So place the function list where it doesn't take up space
			
		*/
		
		var leftColumn = document.getElementById("leftColumn");
		
		//if(!leftColumn) return;
		
		if(functionListWrap && functionListWrap.parentNode == leftColumn) {
leftColumn.removeChild(functionListWrap);
		}
		else {
			console.log("mobileFubarDetected: functionListWrap not in leftColumn!");
		}
		
		if(functionListSelect && functionListSelect.parentNode == functionListWrap) {
			functionListWrap.removeChild(functionListSelect);
		}
		else {
			console.log("mobileFubarDetected: functionListSelect not in functionListWrap!");
		}
		
		var header = document.getElementById("header");
		header.appendChild(functionListSelect);
		//functionListSelect.setAttribute("class", "functionList floatingInHeader");
		functionListSelect.setAttribute("class", "functionListInMenu");
		functionListSelect.setAttribute("size", "1");
		
		functionListSelect.removeAttribute("multiple");
		
		winMenuFunctionList = EDITOR.windowMenu.add("Functions", [], functionListMenuItemClicked);
		//EDITOR.windowMenu.add("test", [], function test() {});
		
		winMenuFunctionList.text.removeChild(winMenuFunctionList.text.firstChild); // Remove the text
		winMenuFunctionList.text.appendChild(functionListSelect);
		
		function functionListMenuItemClicked() {
			EDITOR.windowMenu.hide();
		}
		
	}
	
	function leftOrRight() {
		// If we are inside the function list, pressing left or right should go back to the caret
		
		functionListSelect.blur();
		
		EDITOR.currentFile.scrollToCaret();
		
		EDITOR.input = true;
		
	}
	
	function searchFunctionList(file, char, combo) {
		if(captureKeyboard && !EDITOR.input) {
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
					EDITOR.currentFile.scrollToLine(domModel[i].lineNumber);
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
		
		if(!functionListWrap) return true; // Some mobile browser doesn't support the function list, and the select element is moved
		
		var center = undefined;
		
		if(file == undefined) {
			file = EDITOR.currentFile;
			if(!file) return;
			
			caret = EDITOR.currentFile.caret;
			center = true;
		}
		
		var parent = {};
		var scrollTo;
		for(var i=0; i<domModel.length; i++) {
			if(domModel[i].option && domModel[i].start <= caret.index && domModel[i].end >= caret.index) {
				domModel[i].option.selected = true;
				
				// Make sure parent is deselected
				if(parent.option) parent.option.selected = false;
				
				scrollTo = domModel[i].option;
			}
			else if(domModel[i].option) {
				domModel[i].option.selected = false;
			}
			parent = domModel[i];
		}
		
		if(scrollTo) {
			var rect = scrollTo.getBoundingClientRect();
			var wrapRect = functionListWrap.getBoundingClientRect();
			var height = wrapRect.height;
			var scrollTop = functionListWrap.scrollTop;
			var wrapperStart = wrapRect.top;
			console.log("highlightCurrentFunction: wrapRect=" + JSON.stringify(wrapRect) + " scrollTo.parentElement.scrollTop=" + scrollTo.parentElement.scrollTop + " scrollTo.parentElement.parentElement.scrollTop=" + scrollTo.parentElement.parentElement.scrollTop + " scrollTo.parentElement.parentElement.parentElement.scrollTop=" + scrollTo.parentElement.parentElement.parentElement.scrollTop + " functionListSelect.scrollTop=" + functionListSelect.scrollTop + " functionListWrap.scrollTop=" + functionListWrap.scrollTop + " rect=" + JSON.stringify(rect));
			
			var alignToTop = true;
			var alignToBottom = false;
			
			// For some reason we cannot scroll right away ... scrollTimer = setTimeout
			
			// Note: rect seem to not include the scrolled amount!! (top/left will be negative)
			// But it *does* include the position of the wrapper!
			// eg. top left is absolute window position!!
			
			// note: When using behavior: "smooth" it doesn't always scroll!
			
			// If function list has not been scrolled, center it on the current function
			if(scrollTop == 0 || center === true) {
				console.log("highlightCurrentFunction: Centering");
				scrollTo.scrollIntoView({block: "center"});
			}
			// Only scroll if needed
			// Is it above the current view?
			else if (rect.top < wrapperStart) {
				console.log("highlightCurrentFunction: Aligning TOP because rect.top=" + rect.top + " is less then wrapperStart=" + wrapperStart);
				scrollTo.scrollIntoView(alignToTop);
			}
			// Is it below the current view?
			else if (rect.bottom > (height + wrapperStart)) {
				console.log("highlightCurrentFunction: Aligning BOTTOM because rect.bottom=" + rect.bottom + " is more then height=" + height + " plus wrapperStart=" + wrapperStart);
				scrollTo.scrollIntoView(alignToBottom);
				//scrollTo.scrollIntoView({block: "end"});
			}
			// Else: don't scroll!
			else {
				console.log("highlightCurrentFunction: Not scrolling! rect.bottom=" + rect.bottom + " rect.top=" + rect.top + " height=" + height + " wrapperStart=" + wrapperStart);
			}
		}
		
		return true;
	}
	
	
	function blurFunctionList() {
		// Remove focus from the select box
		if(functionListSelect) {
			functionListSelect.blur();
			//file.canvas.focus(); // Do I need to focus elsewhere for blur to work!?
			EDITOR.input = true;
		}
		return true;
	}
	
	function updateFunctionList(file) {
		
		// (Optimization) Updating the DOM is expensive, find out if it really needs updating, or only update parts of it
		
		//console.log("updateFunctionList called");
		
		if(EDITOR.currentFile != file) return;
		
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
							
							updateName(domModel[i].option, spaces(updatedDomModel[i].level) + functionName);
							
							remakeFromScratch = false;
						}
						else {
							console.warn("No option asociated with function " + functionName);
							remakeFromScratch = true;
							break;
						}
						
					}
					else {
						console.log("Both name AND line number changed at the same time. It's safest to remake the whole list");
						remakeFromScratch = true;
						break;
					};
				}
				else if(functionName.length > 0) {
					// Name is the same
					
					//console.log("Nameisthesame level old=" + domModel[i].level + " new=" + updatedDomModel[i].level);
					
					remakeFromScratch = false;
					
					if(!domModel[i].option) {
						// Probably cause: Function was copied (same name, so only one option was created) and then renamed
						console.warn("No option asociated with function " + functionName);
						remakeFromScratch = true;
						break;
					}
					
					// Check if arguments have changed and in that case update the arguments
					if(updatedDomModel[i].arguments != domModel[i].arguments) {
						domModel[i].option.setAttribute("title", updatedDomModel[i].arguments);
					}
					
					// Check if the line number changed and update it if it did
					if(updatedDomModel[i].lineNumber != domModel[i].lineNumber) {
						domModel[i].option.setAttribute("value", updatedDomModel[i].lineNumber);
					}
					
					// Check if the level has changed and in that case update the indentation
					if(updatedDomModel[i].level != domModel[i].level) {
						updateName(domModel[i].option, spaces(updatedDomModel[i].level) + functionName);
					}
					
				}
				
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
		else {
			console.log("updatedDomModel.length=" + updatedDomModel.length + " domModel.length=" + domModel.length + "");
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
			
			EDITOR.resizeNeeded();
			EDITOR.renderNeeded();
			
		}
		
		console.timeEnd("updateFunctionList");
		
		function updateName(option, newName) {
			// Can't just set attribute name, need to remove the element and add it again! 
			option.removeChild( domModel[i].option.firstChild ); // Remove the name
			option.appendChild(document.createTextNode(newName)); // Add the name again
		}
		
	}
	
	function searchFunctions(str, functions) {
		/* 
			Searches the parsed function list and return an array of matched function names.
			
			Hmm, this is a weird function ...
			The tree can have an endless depth, so we have to reach sub-functions recursivley
			
		*/
		
		var matches = [];
		
		for(var func, name, i=0; i<functions.length; i++) {
			
			func = functions[i];
			
			name = func.name;
			
			if(name.search(new RegExp(UTIL.escapeRegExp(str), "i")) != -1) {
				matches.push(name);
				//console.log(name);
			}
			
			if(func.subFunctions.length > 0) {
				var result = searchFunctions(str, func.subFunctions);
				
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
				
				setTimeout(highlightCurrentFunction, 10); // Does not scroll unless we set it in the future ...
				
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
		
		if(file) console.log("Hiding the functionlist for file.path=" + file.path);
		else console.log("Hiding the functionlist! file=" + file);
		
		if(functionListWrap) {
			if(functionListWrap.style.display != "none") {
				functionListWrap.style.display="none";
				EDITOR.resizeNeeded();
				
				functionListActive = false;
				winMenuToggleFunctionlist.deactivate();
				
				console.log("Functionlist is now hidden");
				console.log(UTIL.getStack("why hide function list?"));
			}
		}
	}
	
	function toggleFunctionList() {
		if(functionListActive) {
			hideFunctionList();
		}
		else {
			showFunctionList();
		}
	}
	
	function showFunctionList(file) {
		
		if(!alwaysShowFunctionList) {
			console.warn("Not showing function list because alwaysShowFunctionList=" + alwaysShowFunctionList);
		return;
		}
		
		if(functionListWrap) {
			
			if(functionListWrap.style.display != "block") { // bugfix: editor resized at every key stroke because of fileParse event
				functionListWrap.style.display="block";
				
				functionListActive = true;
				winMenuToggleFunctionlist.activate();
				
				EDITOR.resizeNeeded();
				
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
		
		if(!functionListWrap && !forcedSingleRow) {
console.warn("functionListWrap not available!");
		return;
		}
		
		functionListSelect = document.getElementById("functionList");
		
		showFunctionList();
		
		if(!functionListSelect) {
			functionListSelect = document.createElement("select");
			
			functionListSelect.setAttribute("id", "functionList");
			functionListSelect.setAttribute("class", "functionList");
			functionListSelect.setAttribute("multiple", "multiple");
			
			functionListSelect.onchange = function(e) {
				var line = functionListSelect.options[functionListSelect.selectedIndex].value;
				if(isNaN(line)) throw new Error("line=" + line + " options=" + JSON.stringify(functionListSelect.options) + " selectedIndex=" + functionListSelect.selectedIndex);
				EDITOR.currentFile.scrollToLine(line);
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
			
			functionListSelect.addEventListener("keyup", function(keyUpEvent) {
				var keyEscape = 27;
				var keyLeft = 37;
				var keyRight = 39;
				
				keyUpEvent.preventDefault();
				
				if (keyUpEvent.keyCode == keyEscape) {
					blurFunctionList();
				}
				else if(keyUpEvent.keyCode == keyLeft || keyUpEvent.keyCode == keyRight) {
					leftOrRight();
				}
			}, false);
			
		}
		
		// Empty the list
		while(functionListSelect.firstChild ){
			functionListSelect.removeChild( functionListSelect.firstChild );
		}
		
		
		// Fill the list
		domModel.forEach(addOption);
		
		
		if(BROWSER == "Firefox" && process.platform == "win32") {
			/*
				Both the wrapper div and the select box have a scroll bar.
				It would be best if the select alement only had a scrollbar,
				but all widgets in left and right column needs to have a scrollbar to prevent stuff from getting hidden
				So we need to hide the scrollbar of the select element
				
				margin-right on the wrapper only seem to hide the scrollbar on the wrapper.
				
			*/
			//functionListSelect.style.marginLeft="18px"; // This gives a scrollbar-x on the wrapper that we cant hide
			//functionListWrap.style.overflowX="hidden"; // Doesn't work
			
			//functionListWrap.style.marginRight="-30px"; // This will hide both scrollbars, but screw with the columns pushing the canvas to the right
			
			//functionListSelect.style.position="absolute"; 
			functionListSelect.style.right="-16px"; // Wow this works!!
			
		}
		
		
		// Adjust the height
		functionListSelect.setAttribute("size", domModel.length);		
		
		
		
		EDITOR.resizeNeeded();
		
		var height = functionListSelect.offsetHeight;
		console.log("functionListSelect.offsetHeight=" + functionListSelect.offsetHeight);
		
		if(domModel.length > 1 && height <= 18) {
			forcedSingleRow = true;
			mobileFubarDetected();
		}
		else {
			//alertBox("Not moving function-list! domModel.length=" + domModel.length + " height=" + height);
		}
		
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
					//EDITOR.currentFile.scrollToLine(func.lineNumber);
					
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
			for(var f, i=0; i<functions.length; i++) {
				f = functions[i];
				domModel.push({name: f.name, lineNumber: f.lineNumber , arguments: f.arguments, level: level, start: f.start, end: f.end});
				
				add(f.subFunctions, level+1);
			}
		}
		
		return domModel;
	}
	
	// TEST-CODE-START
	
	EDITOR.addTest(function test_removeAddSubfunctionIndentation(callback) {
		EDITOR.openFile("test_removeAddSubfunctionIndentation.js", 'function foo() {\n\nfunction bar() {\n}\n}', function(err, file) {
			
			file.moveCaretToIndex(file.text.length);
			file.moveCaretLeft();
			file.deleteCharacter();
			
			file.moveCaretToIndex(16);
			file.putCharacter("}");
			
			var fname = functionListSelect.options[1].text;
			
			//alert(UTIL.lbChars(fname.charAt(0)));
			
			if(fname.charAt(0).match(/\s/) !== null) throw new Error("Second item in the function list should not be indented after moving the subfunction out");
			
			callback(true);
			
			EDITOR.closeFile(file.path);
			
		});
	});
	
	// TEST-CODE-END
	
})();
