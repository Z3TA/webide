(function() {
	"use strict";

	/*
		(Re)loads the current file / plugin 
		
		EDITOR.plugin({desc: "Allows hot loading of plugins", load: loadHotloader, unload: unloadHotloader});
		
		first time it unloads and loads twice !??
		
	*/
	
	//alert("hotload");
	
	EDITOR.plugin({
		desc: "Allows hot reloading of plugins",
		load: loadHotloader,
		unload: unloadHotloader,
	});
	
	
	function loadHotloader() {
		//alert("load");
		var keyF7 = 118;
		
		EDITOR.bindKey({desc: "Hot-Reload current plugin script", fun: reloadCurrentScript, charCode: keyF7, combo: 0});
		
	}
	
	
	function unloadHotloader() {
		//alert("unload");
		EDITOR.unbindKey(reloadCurrentScript);
	}

	function reloadCurrentScript() {
		
		var head = document.getElementsByTagName("head")[0];
		var scripts = head.getElementsByTagName("script");
		var currentFile = EDITOR.currentFile;
		
		if(!currentFile) throw new Error("No current file");
		
		// Fun fact: In Windows there are three slashes in file:/// but in Linux it's only two!
		var currentScript = EDITOR.currentFile.path.replace(/\\/g, "/");
		
		var reloaded = false;
		
		for(var i=0; i < scripts.length; i++) {
			
			console.log(scripts[i].src + " == " + currentScript + " (" + (scripts[i].src == currentScript) + ")");
			
			var parent = scripts[i].parentNode;
			
			if(parent == head && scripts[i].src.indexOf(currentScript) != -1) {
				append(scripts[i]);
				reloaded = true;
			}
			}
		
		if(!reloaded) alertBox("Failed to reload: " + currentScript);
		
		return false;
		
		
		function append(script) {
			
			console.log("Reloading script: " + currentScript);
			
			// We want to unload all plugins (asume keybindings are unloaded by the plugins unload function)
			//var code = currentFile.text;
			
			//var loadFunctionName = code.match(/editor\.plugin\s*\(\s*{[^}]*[^un]load\s*:\s*([\S]*)[,]?/);
		
			//if(!loadFunctionName) alertBox("Unable to fund plugin load function. The code will Not be hot reloaded");
			//else {
			
			//loadFunctionName = loadFunctionName[0]; // First group match in the regexp
				
			//EDITOR.disablePlugin(loadFunctionName);
					
					head.removeChild(script);
					
					script = document.createElement("script");
			script.src = "file://" + currentScript;
					script.type = "text/javascript";
					
					head.appendChild(script);
			
			alertBox("Refreshed: " + currentScript);
			
			//}
		}
		
	}
	
})();
