editor.bindKey({charCode: 75, combo: SHIFT + CTRL, desc: "Show all keyBindings", fun: function showKeyBindings() { // 75=K
	"use strict";
	
	var padLength = 29;
	var keyBindings = editor.keyBindings();
	
	var b, arr = [], fName, str;
	for(var i=0; i<keyBindings.length; i++) {
		b = keyBindings[i];
		
		fName = UTIL.getFunctionName(b.fun);
		
		if(fName) {
			str = UTIL.spacePad(editor.getKeyFor(fName), padLength) + fName;
			if(b.desc) str = str + " (" + b.desc + ")";
			arr.push(str);
		}
	}
	
	arr.sort();
	
		editor.openFile("keybindings.txt", UTIL.spacePad("Keyboard combination", padLength) + "Function Name\n" + "==========================================\n" + arr.join("\n"), function gotFile(err, file) {});
	
	return false;
	
	}});