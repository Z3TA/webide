(function() {
	"use strict";
	
	var menuItem;
	var indentationManager;
	var fromWhat;
	
	editor.plugin({
		desc: "Set the indentation convention and fix all indentation errors",
		load: function loadIndentationManager() {
			
			menuItem = editor.addMenuItem("Indentation ...", function() {
				showIndentationManager();
			});
			
			var charEscape = 27;
			editor.bindKey({desc: "Hide indentation manager", fun: hideIndentationManager, charCode: charEscape, combo: 0});
			
			editor.on("fileShow", showIndentationConvention);
			
			showIndentationManager();
			
		},
		unload: function unloadIndentationManager() {
			
			editor.removeMenuItem(menuItem);
			
			editor.unbindKey(hideIndentationManager);
			
			editor.removeEvent("fileShow", showIndentationConvention);
			
			if(indentationManager) {
				var footer = document.getElementById("footer");
				footer.removeChild(indentationManager);
				editor.resizeNeeded();
			}
			
		},
	});
	
	function showIndentationManager() {
		if(!indentationManager) buildIndentationManager();
		
		showIndentationConvention(editor.currentFile);
		
		indentationManager.style.display = "block";
		
		editor.hideMenu();
		editor.resizeNeeded();
	}
	
	function hideIndentationManager() {
		if(indentationManager) indentationManager.style.display = "none";
		return true;
	}
	
	function isVisible() {
		if(!indentationManager) return false;
		if(indentationManager.style.display == "block") return true;
		else return false;
	}
	
	function showIndentationConvention(file) {
		if(!file) {
			console.warn"No file!");
			return;
		}
		
		if(fromWhat) fromWhat.innerText = lbChars(file.indentation);
		
	}
	
	function buildIndentationManager() {
		
		indentationManager = document.createElement("div");
		
		var text = document.createElement("span");
		fromWhat = document.createElement("span");
		
		text.appendChild(document.createTextNode("Update/fix indentation ("));
		text.appendChild(fromWhat);
		text.appendChild(document.createTextNode("): "));
		
		indentationManager.appendChild(text);
		
		
		var btnUseTwoSpaces = document.createElement("button");
		btnUseTwoSpaces.setAttribute("class", "button");
		btnUseTwoSpaces.innerText = "Use two spaces";
		btnUseTwoSpaces.onclick = function() {
			updateIndentation(2);
		}
		indentationManager.appendChild(btnUseTwoSpaces);
		
		var btnUseFourSpaces = document.createElement("button");
		btnUseFourSpaces.setAttribute("class", "button");
		btnUseFourSpaces.innerText = "Use four spaces";
		btnUseFourSpaces.onclick = function() {
			updateIndentation(4);
		}
		indentationManager.appendChild(btnUseFourSpaces);
		
		var btnUseTabs = document.createElement("button");
		btnUseTabs.setAttribute("class", "button");
		btnUseTabs.innerText = "Use tabs";
		btnUseTabs.onclick = function() {
			updateIndentation(1);
		}
		indentationManager.appendChild(btnUseTabs);
		
		var footer = document.getElementById("footer");
		footer.appendChild(indentationManager);
		
	}
	
	
	function updateIndentation(num) {
		
		if(isNaN(num)) throw new Error("num=" + num + " needs to be an integer");
		
		var char = " ";
		var indentationCharacters = "";
		if(num == 1) indentationCharacters = "\t";
		else for(var i=0; i<num; i++) indentationCharacters += char;
		
		console.log("num=" + num + " !!indentationCharacters=" + lbChars(indentationCharacters));
		
		var file = editor.currentFile;
		
		var yes = "Save", no = "NO!";
		
		var currentIndentationCharacters = "";
		var shouldHaveIndentationCharacters = "";
		
		var text = file.text;
		var grid = file.grid;
		
		// Go from bottom to top so that startIndex don't get effected
		for(var row=grid.length-1; row>-1; row--) {
			
			currentIndentationCharacters = grid[row].indentationCharacters,
			shouldHaveIndentationCharacters = "";
			for(var i=0; i<grid[row].indentation; i++) shouldHaveIndentationCharacters += indentationCharacters;
			
			//console.log("row=" + row + " shouldHaveIndentationCharacters=" + lbChars(shouldHaveIndentationCharacters) + " currentIndentationCharacters=" + lbChars(currentIndentationCharacters));
			
			if(shouldHaveIndentationCharacters != currentIndentationCharacters) {
				
				// Remove and add
				text = text.substr(0, grid[row].startIndex-currentIndentationCharacters.length) + shouldHaveIndentationCharacters + text.substring(grid[row].startIndex, text.length);
				
				//console.log("text=" + lbChars(text));
			}
		}
		
		file.reload(text);
		showIndentationConvention(editor.currentFile);
	}
	
})();
