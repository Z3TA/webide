editor.addTest(function getFoldersTest(callback) {
	// Testing the global getFolders function 
	
	var ftpSite = getFolders("ftp://user:pw@hostname/folder1/folder2/folder3");
	
	if(!(ftpSite[0] == "/folder1" &&
	ftpSite[1] == "/folder1/folder2" &&
	ftpSite[2] == "/folder1/folder2/folder3")) throw new Error("ftpSite=" + JSON.stringify(ftpSite));
	
	
	var windowsPath = getFolders("C:\\Windows\\System32");
	
	if(!(windowsPath[0] == "C:\\Windows" &&
	windowsPath[1] == "C:\\Windows\\System32")) throw new Error("windowsPath=" + JSON.stringify(windowsPath));
	
	
	var unixPath = getFolders("/var/log/");
	
	if(!(unixPath[0] == "/var" &&
	unixPath[1] == "/var/log")) throw new Error("unixPath=" + JSON.stringify(unixPath));
	
	callback(true);

});
	