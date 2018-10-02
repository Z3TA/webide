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
		
		var index = currentScript.indexOf("/plugin/");
		if(index == -1) return alertBox("Script is not in the plugin folder: " + currentScript);
		currentScript = currentScript.slice(index);
		
		console.log("currentScript=" + currentScript);
		
		var pluginDescription = "";
		for(var i=0; i<EDITOR.plugins.length; i++) {
			if(currentFile.text.indexOf(EDITOR.plugins[i].desc) != -1) {
				if(pluginDescription) throw new Error("There are more then one plugin with the same description: " + pluginDescription);
pluginDescription = EDITOR.plugins[i].desc;
				// Continue so we can detect dublicate descriptions
			}
		}
		
		if(!pluginDescription) {
alertBox("Did not find a plugin description for " + currentFile.path);
			return true;
		}
		
		// Find the script ...
		var reloaded = false;
		for(var i=0; i < scripts.length; i++) {
			index = scripts[i].src.indexOf("/plugin/");
			if(index == -1) {
				console.log("Not a plugin: " + scripts[i].src);
				continue;
			}
			var parent = scripts[i].parentNode;
			
			console.log("parent==head?" + (parent==head) + " " + currentScript + " in " + scripts[i].src + " ? " + (scripts[i].src.indexOf(currentScript) != -1));
			
			if(parent == head && scripts[i].src.indexOf(currentScript) != -1) {
				reloaded = append(scripts[i]);
				break;
			}
			}
		
		if(reloaded instanceof Error) alertBox("Problems reloading " + currentScript + ": " + reloaded.message);
		else if(reloaded === false) alertBox("Unable to find " + currentScript + " in header!");
		else if(reloaded === true) alertBox("Successfully reloaded " + currentScript);
		else throw new Error("reloaded=" + reloaded);
		
		return false;
		
		function append(script) {
			console.log("Reloading script: " + currentScript);
			
			//EDITOR.disablePlugin(loadFunctionName);
					
					head.removeChild(script);
					
					script = document.createElement("script");
			script.src = currentScript; // Relative path
					script.type = "text/javascript";
					
			var success = true;
			try {
				head.appendChild(script);
			}
			catch(err) {
				return err;
			}
			
			return true;
		}
		
	}
	
})();
