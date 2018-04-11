
EDITOR.addTest(function openFileWithSamePath(callback) {
	
	var filePath = "someuniquefilepathxxxyyyy.txt";
	
	var contentFile1 = 'file 1';
	EDITOR.openFile(filePath, contentFile1, function(err, file1) {
		if(err) throw err;
		
		EDITOR.closeFile(file1.path);
		
		var contentFile2 = 'file 2';
		
		EDITOR.openFile(filePath, contentFile2, function(err, file2) {
			if(err) throw err;
			
			// bug: The file was now given the path file.txt(2)
			
			// bug ? File in openFileQueue! path=file.txt
			
			if(file2.text != contentFile2) throw new Error("Expected file2.text='" + contentFile2 + "' but it's '" + file2.text + "'");
			
			if(file2.path != filePath) throw new Error("Expected file2.path=" + file2.path + " to be filePath=" + filePath);
			
			var filePaths = [];
			console.log("Opened files: " + Object.keys(EDITOR.files).length );
			for (var path in EDITOR.files) {
				if(path != EDITOR.files[path].path) throw new Error(path + " != " + EDITOR.files[path].path);
				if(filePaths.indexOf(path) != -1) throw new Error("A file with path=" + path + " already exist!");
				if(filePaths.indexOf(EDITOR.files[path].path) != -1) throw new Error("A file with path=" + EDITOR.files[path].path + " already exist!");
				filePaths.push(path);
				console.log(path + " = " + EDITOR.files[path].path);
			}
			
			EDITOR.closeFile(file2.path);
			callback(true);
			});
	});
	
});


EDITOR.addTest(function openFileWithSamePathAtTheSameTime(callback) {
	
	var filePath = "file.txt";
	var filePath2 = "file2.txt";
	
	var contentFile1 = 'file 1';
	var contentFile2 = 'file 2';
	
var filesToOpen = 2;
var filesOpened = 0;

	var file1, file2;
	
	EDITOR.openFile(filePath, contentFile1, function(err, file) {
		if(err) throw err;
		
		file1 = file;
		
if(file1.text != contentFile1) throw new Error("file1.text=" + file1.text + " contentFile1=" + contentFile1);
		if(file1.path != filePath) throw new Error("Expected file1.path=" + file1.path + " to be filePath=" + filePath);
		
		if(++filesOpened == filesToOpen) allFilesOpened();
});
		
	
	var gotError = false;
	
	try {
	EDITOR.openFile(filePath, contentFile2, file2Opened);
	}
	catch(err) {
		gotError = true;
	}
	
	if(gotError) EDITOR.openFile(filePath2, contentFile2, file2Opened);
	else throw new Error("Expected an error when opening two files with the same path!");
	
	function file2Opened(err, file) {
		if(err) throw err;
		
		file2 = file;
		
		// bug: file2 will be file1
		
		if(file2.text != contentFile2) {
			console.log("file1==file2 ? " + (file1==file2));
			throw new Error("file2.text=" + file2.text + " contentFile2=" + contentFile2);
		}
		
		if(file2.path != filePath && file2.path != filePath2) throw new Error("Expected file2.path=" + file2.path + " to be filePath=" + filePath + " or filePath2=" + filePath2);
		
		if(++filesOpened == filesToOpen) allFilesOpened();
	}
	
function allFilesOpened() {

		console.log("All files opened: " + Object.keys(EDITOR.files).length );

var filePaths = [];

for (var path in EDITOR.files) {
if(path != EDITOR.files[path].path) throw new Error(path + " != " + EDITOR.files[path].path);
if(filePaths.indexOf(path) != -1) throw new Error("A file with path=" + path + " already exist!");
if(filePaths.indexOf(EDITOR.files[path].path) != -1) throw new Error("A file with path=" + EDITOR.files[path].path + " already exist!");
filePaths.push(path);
console.log(path + " = " + EDITOR.files[path].path);
}

EDITOR.closeFile(file1.path);
EDITOR.closeFile(file2.path);

callback(true);
		}
		
});

