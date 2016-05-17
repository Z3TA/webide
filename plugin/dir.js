(function() {
	
	"use strict";
	
	var key_D = 68;
	
	editor.bindKey({desc: "Show a list of files in the work directory", fun: showFiles, charCode: key_D, combo: CTRL});
	
	function showFiles() {
		
		editor.openFile("file-list.txt", "", function(err, file) {
			
			editor.listFiles(editor.workingDirectory, function(err, fileList) {
				
				if(err) throw err;
				
				//console.log("fileList=" + JSON.stringify(fileList, null, 2));
				
				// Get the length of the longest path
				var maxLen = 0;
				for(var i=0; i<fileList.length; i++) {
					if(fileList[i].path.length > maxLen) maxLen = fileList[i].path.length;
}
				
				maxLen += 2;
				
				fileList.forEach(function(f) {
					file.writeLine(spacePad(f.type, 4) + spacePad(f.path, maxLen) + spacePad(f.size.toString(), 15) + f.date);
				});
				
				editor.renderNeeded();
				
});
			
		});
		
		return false;
		
}
	
})();