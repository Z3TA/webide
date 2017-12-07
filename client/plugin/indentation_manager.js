(function() {
	"use strict";
	
	var menuItem;
	var indentationManager;
	var fromWhat;
	
	EDITOR.plugin({
		desc: "Set the indentation convention and fix all indentation errors",
		load: function loadIndentationManager() {
			
			menuItem = EDITOR.addMenuItem("Indentation ...", showIndentationManager);
			
			var charEscape = 27;
			EDITOR.bindKey({desc: "Hide indentation manager", fun: hideIndentationManager, charCode: charEscape, combo: 0});
			
			EDITOR.on("fileShow", showIndentationConvention);
			
			//showIndentationManager();
			
		},
		unload: function unloadIndentationManager() {
			
			EDITOR.removeMenuItem(menuItem);
			
			EDITOR.unbindKey(hideIndentationManager);
			
			EDITOR.removeEvent("fileShow", showIndentationConvention);
			
			if(indentationManager) {
				var footer = document.getElementById("footer");
				footer.removeChild(indentationManager);
				EDITOR.resizeNeeded();
			}
			
		},
	});
	
	function showIndentationManager() {
		if(!indentationManager) buildIndentationManager();
		
		showIndentationConvention(EDITOR.currentFile);
		
		indentationManager.style.display = "block";
		
		EDITOR.hideMenu();
		EDITOR.resizeNeeded();
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
			console.warn("No file!");
			return;
		}
		
		if(fromWhat) fromWhat.innerText = "current=" + UTIL.lbChars(file.indentation);
		
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
		
		var cancel = document.createElement("button");
		cancel.setAttribute("class", "button");
		cancel.innerText = "Cancel"
		cancel.addEventListener("click", function cancel() {
			hideIndentationManager();
		}, false);
		indentationManager.appendChild(cancel);
		
		
		var footer = document.getElementById("footer");
		footer.appendChild(indentationManager);
		
	}
	
	
	function updateIndentation(num) {
		
		if(isNaN(num)) throw new Error("num=" + num + " needs to be an integer");
		
		var char = " ";
		var indentationCharacters = "";
		if(num == 1) indentationCharacters = "\t";
		else for(var i=0; i<num; i++) indentationCharacters += char;
		
		console.log("num=" + num + " !!indentationCharacters=" + UTIL.lbChars(indentationCharacters));
		
		var file = EDITOR.currentFile;
		
		if(!file) return alertBox("No file open!");
		
		file.fixIndentation(indentationCharacters);
		
		//showIndentationConvention(EDITOR.currentFile);
		hideIndentationManager();
		EDITOR.resizeNeeded();
		
	}
	
})();
