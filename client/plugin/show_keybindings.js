(function() {
	
	var winMenuShowKeybindings;
	
EDITOR.plugin({
		desc: "Show all keyBindings",
		load: function loadShowKeyBindings() {
			
			var charCode_K = 75;
			
			EDITOR.bindKey({ charCode: charCode_K, combo: SHIFT + CTRL, desc: "Show all keyBindings", fun: showKeyBindings });
			winMenuShowKeybindings = EDITOR.windowMenu.add("Show all key bindings", ["Editor", 2], showKeyBindings);
			
		},
		unload: function unloadShowKeyBindings() {
			EDITOR.unbindKey(showKeyBindings);
			EDITOR.windowMenu.remove(winMenuShowKeybindings);
		}
	});
	
	function showKeyBindings() {
		"use strict";
		
		var keyBindings = EDITOR.keyBindings();
		var keyComboPad = 29;
		var fNamePad = 25;
		
		var b, arr = [], fName, str, keyCombo;
		for(var i=0; i<keyBindings.length; i++) {
			b = keyBindings[i];
			
			fName = UTIL.getFunctionName(b.fun);
			
			if(fName) {
				keyCombo = EDITOR.getKeyFor(fName);
				if(!keyCombo) {
					console.warn("No key combination for fName=" + fName);
					continue;
				}
				
				str = UTIL.spacePad(keyCombo, keyComboPad) + UTIL.spacePad(fName, fNamePad);
				if(b.desc) str = str + b.desc;
				arr.push(str);
			}
		}
		
		arr.sort();
		
		EDITOR.openFile("keybindings.txt", UTIL.spacePad("Keyboard combination", keyComboPad) + UTIL.spacePad("Function Name", fNamePad) + "Description\n" + "=".repeat(100) + "\n" + arr.join("\n"), function gotFile(err, file) {});
		
		return false;
		
	}

})();