EDITOR.addTest(function getFoldersTest(callback) {
	// Testing the global getFolders function 
	
	var ftpSite = UTIL.getFolders("ftp://user:pw@hostname:port/folder1/folder2/folder3", true);
	
	if(!(ftpSite[0] == "ftp://user:pw@hostname:port/" &&
	ftpSite[1] == "ftp://user:pw@hostname:port/folder1/" &&
	ftpSite[2] == "ftp://user:pw@hostname:port/folder1/folder2/" &&
	ftpSite[3] == "ftp://user:pw@hostname:port/folder1/folder2/folder3/")) throw new Error("ftpSite=" + JSON.stringify(ftpSite));
	
	
	var windowsPath = UTIL.getFolders("C:\\Windows\\System32");
	
	if(!(windowsPath[0] == "C:\\" &&
	windowsPath[1] == "C:\\Windows\\" &&
	windowsPath[2] == "C:\\Windows\\System32\\")) throw new Error("windowsPath=" + JSON.stringify(windowsPath));
	
	
	var unixPath = UTIL.getFolders("/var/log/");
	
	if(!(unixPath[0] == "/" &&
	unixPath[1] == "/var/" &&
	unixPath[2] == "/var/log/")) throw new Error("unixPath=" + JSON.stringify(unixPath));
	
	
	var rootFolder = UTIL.getFolders("/");
	if(rootFolder.length != 1) throw new Error("Only expected one folder!");
	if(rootFolder[0] != "/") throw new Error("Expected root folder to be a slash");

	
	callback(true);

});
	