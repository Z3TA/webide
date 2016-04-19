editor.bindKey({charCode: 75, combo: SHIFT + CTRL, desc: "Show all keyBindings", fun: function showKeyBindings() { // 75=K
	"use strict";
	
	var padLength = 29;
	
	var b, arr = [], fName, str;
	for(var i=0; i<editor.keyBindings.length; i++) {
		b = editor.keyBindings[i];
		
		fName = getFunctionName(b.fun);
		
		if(fName) {
			str = spacePad(editor.getKeyFor(fName), padLength) + fName;
			if(b.desc) str = str + " (" + b.desc + ")";
			arr.push(str);
		}
		}
	
	arr.sort();
	
	editor.openFile("keybindings.txt", spacePad("Keyboard combination", padLength) + "Function Name\n" + "==========================================\n" + arr.join("\n"), function gotFile(file) {});
	
	return false;
	
	}});