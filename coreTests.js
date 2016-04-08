(function() {
	"use strict";
	
	/*
		This file has all the tests for the editor core (editor.js and File.js).
		All (other) tests that has to do with a plugin, should be located together with the plugin file(s).
	*/
	
	editor.tests.push({text: "All keyBindings should return true or false", fun: function testKeyBindings() {
		
		var binding;
		var funReturn;
		var combo = {shift: false, alt: false, ctrl: false, sum: 0};
		var character = "T";
		var charCode = 116; // small case t
		var targetElementClass = "fileCanvas";
		
		for(var i=0, binding; i<editor.keyBindings.length; i++) {
			binding = editor.keyBindings[i];
			try {
				funReturn = binding.fun(editor.currentFile, combo, character, charCode, "down", targetElementClass);
			} 
			catch(err) {
				err.message += "\nWhen calling function:" + functionName(binding.fun);
				return err;				
			}
			
			if(funReturn !== true && funReturn !== false) {
				
				//objInfo(binding.fun);
				
				return "Function: " + functionName(binding.fun) + " returned " + funReturn;
				// This is not very helpful. But how can we get the source file and line number of the function!?
				// If we create a new Error here, the stack will only point here, and not to the function
			}
			
		}
		
		return true;

	}});
	
	
	
})();