
var copyFolderRecursiveSync = require("./copyFolderRecursiveSync.js");
var copyFileSync = require("./copyFileSync.js");
var UTIL = require("../client/UTIL.js");
var module_path = require("path");

var skeleton = {
	update: function update(userInfo) {
		
		if(!userInfo.hasOwnProperty("username")) throw new Error("username not in " + JSON.stringify(userInfo));
		if(!userInfo.hasOwnProperty("homeDir")) throw new Error("homeDir not in " + JSON.stringify(userInfo));
		if(!userInfo.hasOwnProperty("domain")) throw new Error("domain not in " + JSON.stringify(userInfo));
		if(!userInfo.hasOwnProperty("netnsIP")) throw new Error("netnsIP not in " + JSON.stringify(userInfo));
		if(!userInfo.hasOwnProperty("dockerVMIP")) throw new Error("dockerVMIP not in " + JSON.stringify(userInfo));
		
		var webideRoot = module_path.resolve(__dirname, "../"); // In case the script is not run from there
		
		userInfo.homeDir = UTIL.trailingSlash(userInfo.homeDir);
		
		console.log("Copying skeleton files to " + userInfo.homeDir + " ...");
		
		copyFolderRecursiveSync(webideRoot + "/etc/userdir_skeleton/nodejs_examples", userInfo.homeDir);
		copyFolderRecursiveSync(webideRoot + "/etc/userdir_skeleton/ssg_blog_example", userInfo.homeDir);
		copyFolderRecursiveSync(webideRoot + "/etc/userdir_skeleton/.webide/", userInfo.homeDir);
		copyFolderRecursiveSync(webideRoot + "/etc/userdir_skeleton/wwwpub", userInfo.homeDir);
		copyFolderRecursiveSync(webideRoot + "/etc/userdir_skeleton/.ssh/", userInfo.homeDir);
		
		copyFileSync(webideRoot + "/etc/userdir_skeleton/.bashrc", userInfo.homeDir + ".bashrc"); // bash settings, how the prompt look etc
		copyFileSync(webideRoot + "/etc/userdir_skeleton/.npmrc", userInfo.homeDir + ".npmrc"); // settings for npm
		
		//copyFileSync(webideRoot + "/etc/userdir_skeleton/testfile.txt", userInfo.homeDir + "testfile.txt");
		
		// Replace %USERNAME% %HOMEDIR% and %DOMAIN% and %NETNSIP%
		updateFile(userInfo.homeDir + ".webide/storage/cmsjz_sites", userInfo);
		updateFile(userInfo.homeDir + "ssg_blog_example/source/rss_en.xml", userInfo);
		updateFile(userInfo.homeDir + "wwwpub/welcome.htm", userInfo);
		updateFile(userInfo.homeDir + "nodejs_examples/http_server/http_server_example.js", userInfo);
		updateFile(userInfo.homeDir + ".bashrc", userInfo);
		updateFile(userInfo.homeDir + ".npmrc", userInfo);
		
	}
}


function updateFile(path, userInfo) {
	var fs = require("fs");
	var str = fs.readFileSync(path, "utf8");
	
	str = updateFileContent(str, userInfo);
	
	fs.writeFileSync(path, str);
}

function updateFileContent(str, userInfo) {
	str = str.replace(/%USERNAME%/g, userInfo.username);
	str = str.replace(/%HOMEDIR%/g, userInfo.homeDir);
	str = str.replace(/%DOMAIN%/g, userInfo.domain);
	str = str.replace(/%NETNSIP%/g, userInfo.netnsIP);
	str = str.replace(/%DOCKERIP%/g, userInfo.dockerVMIP);
	return str;
}



module.exports = skeleton;