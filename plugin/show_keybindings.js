editor.bindKey({charCode: 75, combo: SHIFT + CTRL, desc: "Show all keyBindings", fun: function showKeyBindings() { // 75=K
	"use strict";
	
	var b, arr = [], fName, str;
	for(var i=0; i<editor.keyBindings.length; i++) {
		b = editor.keyBindings[i];
		
		fName = getFunctionName(b.fun);
		
		if(fName) {
			str = spacePad(editor.getKeyFor(fName), 29) + fName;
			if(b.desc) str = str + " (" + b.desc + ")";
			arr.push(str);
		}
		}
	
	arr.sort();
	
	editor.openFile("keybindings.txt", arr.join("\n"), function(file) {});
	
	return false;
	
	}});