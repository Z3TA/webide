/*
	
	Debug using nodejs:
	
	
	### todo:
	
	Ignore html in xmp
	
	
	bugfix:
	
	
	
	### planned updates:
	
	Look for media in css files, (backgrounds etc)
	
	Look for <link href
	Exclude "files" that is not used in any documents.
	
	Give warning for when media (img src="...) doesnt exist.
	
	
	
	### ideas:
	Minify CSS
	Losslessly image compressing ()
	
	
	Notes to users
	==============
	
	All files should be encoded with utf8!
	
	When linking to css files and images etc in headers and footers (header.htm and footer.htm), 
	all src and href paths needs to translate from root (have an / infront)
	They will then be converted to relative paths after being inserted to the page.
	This is needed because files from several nested folders can be concatenated.
	
	Source/src's in the body (not header or footer) should however be relative!
	
	
	
	Notes to developer
	==================
	
	The URL's will be the same as the file paths!
	Having different urls and file paths would get messy when it comes to 
	dependencies like css and images.
	
	When moving files between folders, the user has to make the old file into an 
	meta refresh. See: moved-file.htm
	
	Do not remove files from the deployment server! The user has to do this manually.
	Because when colaborating, everyones working directory might look different!
	
	Deoply using rsync, scp, ftp etc.
	
*/

//process.send("Hello!");
//log("moo");

"use strict";

console.time("total time")

/*
if(require.main === module) {
	// Script was spawned or called from command line
	process.on('uncaughtException', function(err) {
	error(err);
	process.exit(1);
});
}
*/

// Require modules before we are put into chroot!
var FS = require("fs-extra");
var PATH = require('path');
var MAMMOTH = require("mammoth");
var MARKED = require('marked');
var JSCHARDET = require("jschardet");

// These paths needs to be absolute!
var BASEPATH; // Path to files that should be processed
var PUBFOLDER; // The bublic/publication folder 

// todo: Allow more flags
var PUBLISH = process.argv[4];

log("PUBLISH=" + PUBLISH);

var MEDIAFILES = []; // Files mentioned in source code

var ROOT = {}; // The tree stem

var OTHERFILES = []; // Files that are not processed, just copied

var ALLDOCUMENTS = [];

var DONOTCHANGE = ["xml", "asp", "nodejs"]; // List of file types that should not change (before evaluated)

var SEND_MESSAGE = null; // process.send;

var ERROR = false;

var MAIN_CALLBACK = null;

var NODE_MODULES_PATH = process.env.NODE_PATH;

/*
function log(txt) {
	var fs = require("fs");
	fs.appendFileSync("build.log", txt + "\n");
}
*/

var ABORT = false;

var main = {
	basePath: BASEPATH,
	pubFolder: PUBFOLDER,
	publish: PUBLISH,
	onMessage: SEND_MESSAGE,
	nodeModulesPath: NODE_MODULES_PATH,
	compile: function main(main_callback) {
	
	// Reset
		ABORT = false;
		
		ALLDOCUMENTS = [];
	OTHERFILES = [];
	ROOT = {};
	MEDIAFILES = [];
		ERROR = false;
		MAIN_CALLBACK = main_callback;
		
		BASEPATH = this.basePath;
		PUBFOLDER = this.pubFolder;
		PUBLISH = !!this.publish;
		SEND_MESSAGE = this.onMessage;
		NODE_MODULES_PATH = this.nodeModulesPath;
		
		if(typeof SEND_MESSAGE != "function") throw new Error("onMessage needs to be a function! typeof onMessage = " + (typeof this.onMessage));
		
	console.time("walk");
	findFiles(BASEPATH, ROOT, function() {
		console.timeEnd("walk");
		
		//log(JSON.stringify(ROOT, null, 2));
		
		//process.exit();
		
		log("\nCompiling files ...");
		console.time("compile");
		compile(ROOT);
		console.timeEnd("compile");
		
		log("\nEvaluating ...");
		console.time("evaulute");
		evaluate(ROOT);
		console.timeEnd("evaulute");
		
		//log("MEDIAFILES=" + MEDIAFILES);
		
		log("\nBuilding ...");
		console.time("build");
		
		build(ROOT, PUBFOLDER, function() {
			
			console.timeEnd("build");
			
			log("\nCopying media files ...")
			console.time("copy");
			copyOtherFiles(function(fileCount) {
				console.timeEnd("copy");
				log("Copied " + fileCount + " files!");
				
				// Static preview server (preview.js)
				
				// FTP upload is separate script! (deploy.js)
				
				console.timeEnd("total time");
					main_callback(null);
				
			});
			
			
		});
		
	});
	
},
	abort: function abort() {
		ABORT = true;
	}
}

/*
	function saveURLs(callback) {
	var filePath = resolvePath(BASEPATH, "url.json")
	
	FS.writeFile(filePath, JSON.stringify(URL, null, 2), "utf8", function(err) {
	if(err) error(err);
	
	callback();
	
	});
	}
	
	function getURLs(callback) {
	
	var filePath = resolvePath(BASEPATH, "url.json")
	
	FS.readFile(filePath, "utf8", function (err, data) {
	if(err == null) {
	URL = JSON.parse(data);
	callback();
	}
	else if(err.code == "ENOENT") {
	// File does not exist! We'll create it later.
	callback();
	}
	else {
	error(err);
	}
	}
	}
*/

function copyOtherFiles(callback) {
	/*
		Keep track of witch files already exist, and those that should be removed.
		
		OTHERFILES...
	*/
	
	
	var path = "";
	var src = "";
	
	var basePath = BASEPATH;
	var pubFolder = PUBFOLDER;
	
	
	log("basePath=" + basePath);
	log("pubFolder=" + pubFolder);
	log("PUBFOLDER=" + PUBFOLDER);
	//log("OTHERFILES=" + OTHERFILES);
	
	var filesToCopy = OTHERFILES.length;
	var totalFiles = filesToCopy;
	
	for(var i=0; i<filesToCopy; i++) {
		log("copyFile=" + OTHERFILES[i]);
		path = OTHERFILES[i].replace(basePath, pubFolder);
		//src = path.replace(pubFolder, "");
		
		// Fix for when the folder delimiters are different between pubFolder and basePath
		if(pubFolder.indexOf("/") != -1 && basePath.indexOf("\\") != -1) path = path.replace(/\\/g, "/");
		if(pubFolder.indexOf("\\") != -1 && basePath.indexOf("/") != -1) path = path.replace(/\//g, "\\");
		
		SEND_MESSAGE({type: "copy", from: OTHERFILES[i], to: path});
		
		/*
			// Asume som detective work has been done to figure out what files are used
			if(fileInUse(src)) {
			log("Copying file=" + path);
			FS.copy(OTHERFILES[i], path, function (err) {
			if (err) error(err);
			
			if(--filesToCopy == 0) callback();
			log("filesToCopy=" + filesToCopy);
			
			});
			}
			else {
			
			log("Not used: " + src);
			FS.unlink(path, function (err, path) {
			if(err == null) {
			log("Deleted file=" + path);
			}
			else if(err.code == "ENOENT") {
			}
			else {
			 error(err);
			}
			
			if(--filesToCopy == 0) callback();
			});
			
			//log("filesToCopy=" + filesToCopy);
			}
		*/
	}
	
	//log("filesToCopy=" + filesToCopy);
	
	/*
		for(var i=0; i<OTHERFILES.length; i++) {
		path = OTHERFILES[i].replace(basePath, pubFolder);
		
		copyFile(OTHERFILES[i], path, function(err, path) { // source, target, cb
		if(err) error(err);
		
		log("copied file=" + path);
		if(++filesCopied == OTHERFILES.length) {
		callback();
		}
		}); 
		}
	*/
	
	callback(totalFiles);
}


function build(baseTree, baseFolder, callback) {
	
	if(ABORT) callback();
	
	var filesToWrite = 0;
	
	buildeDir(baseFolder, baseTree); // Recursive
	
	callback();
	
	function buildeDir(path, branch) {
		
		SEND_MESSAGE({type: "debug", msg: "Building dir=" + path + ""});
		
		var filePath = "";
		
		for(var fileName in branch.documents) {
			filePath = resolvePath(path, fileName);
			buildFile(fileName, filePath);	
		}
		
		for(var subFolder in branch.folders) {
			if(Object.keys(branch.folders[subFolder].documents).length > 0) {
				buildeDir(path + "/" + subFolder, branch.folders[subFolder])
			}
			else {
				SEND_MESSAGE({type: "debug", msg: "Subfolder " + subFolder + " has no documents!"});
			}
		}
		
		function buildFile(fileName, filePath) {
			
			
			var fileExist = false;
			var fileChanged = false;
			
			var document = branch.documents[fileName];
			
			SEND_MESSAGE({type: "file", path: filePath, text: document.html});
			
			filesToWrite++;
			
		}
	}
	
}


function evaluate(baseTree) {
	
	/*
		Runs JavaScript within <?JS and ?>
		
		Finds media files?
	*/
	
	if(ABORT) return;
	
	evalDir(baseTree);
	
	function evalDir(branch) {
		
		if(ABORT) return;
		
		var fileType = "";
		
		for(var fileName in branch.documents) {
			fileType = getFileType(fileName);
			if(fileName == "index.htm" || fileName == "index.html" || fileName == "default.htm" || fileName == "default.html" || fileType == "xml" || fileType == "nodejs") {
				evalFile(branch.documents[fileName]);
			}
			findMedia(branch.documents[fileName].html);
		}
		
		if(branch.header) findMedia(branch.header.html);
		if(branch.footer) findMedia(branch.footer.html);
		
		for(var dirName in branch.folders) {
			evalDir(branch.folders[dirName]);
		}
		
		function evalFile(document) {
			
			log("Evaluating file=" + document.path);
			
			var depth = findDepth(document);
			
			var code = document.html; // Copied
			
			document.html = ""; // Reset
			
			document.evaluate(code);
			
			document.html = makePathsRelative(document.html, depth);
			
			//log(code);
			//log(document.html)
			
		}
	}
}


function findDepth(document) {
	var tree = document.folder;
	var depth = 0;
	
	while(true) {
		
		if(!tree.parent) break;
		
		depth++;
		
		tree = tree.parent;
		
	}
	
	return depth;
}


function compile(baseTree) {
	
	if(ABORT) return;
	
	var basePath = BASEPATH;
	
	//log("baseTree.folders=" + baseTree.folders);
	
	compileDir(baseTree, null);
	
	/*
		for(var path in baseTree.folders) {
		compileDir(baseTree.folders[path], baseTree)
		}
	*/
	
	function compileDir(branch, parentBranch) {
		
		if(ABORT) return;
		
		branch.parent = parentBranch;
		
		for(var fileName in branch.documents) {
			compileFile(branch.documents[fileName]);
		}
		
		for(var dirName in branch.folders) {
			//log("subCompiling dir=" + dirName);
			compileDir(branch.folders[dirName], branch);
		}
		
		function compileFile(document) {
			/* 
				
				Take content from the header and footer and put it together to one document
				
			*/
			
			var scriptName = document.path;
			
			log("Compiling file=" + document.path);
			
			document.url = document.path.replace(basePath, "");
			
			document.url = document.url.replace(/\\/g, "/"); 
			
			document.url = document.url.replace(/\s/g, ""); // Remove white space
			
			// Make sure url starts with a slash
			if(document.url.substr(0, 1) != "/") document.url = "/" + document.url;
			
			// Circular references to ease access
			document.folder = branch;
			document.root = ROOT;
			//document.console = console; // todo: send the message to the IDE client
			document.console = {
				log: function () {
					var msg = parseString(arguments[0]);
					for (var i = 1; i < arguments.length; i++) msg += " " + parseString(arguments[i]);
					var where = getStack(scriptName);
					SEND_MESSAGE({type: "console", msg: msg, scriptName: scriptName, location: where});
				},
				warn: function () {
					var msg = parseString(arguments[0]);
					for (var i = 1; i < arguments.length; i++) msg += " " + parseString(arguments[i]);
					var where = getStack(scriptName);
					SEND_MESSAGE({type: "console", msg: msg, scriptName: scriptName, location: where});
				},
				error: function () {
					var msg = parseString(arguments[0]);
					for (var i = 1; i < arguments.length; i++) msg += " " + parseString(arguments[i]);
					var where = getStack(scriptName, 0);
					SEND_MESSAGE({type: "console", msg: msg, scriptName: scriptName, location: where});
				}
				
			};
			
			
			document.require = function(moduleName) {
				console.log("Requring moduleName=" + moduleName);
				var nodeModulesPathOriginal = process.env.NODE_PATH;
				//process.env.NODE_PATH = NODE_MODULES_PATH;
				try {
					var m = require(NODE_MODULES_PATH + moduleName);
				}
				catch(err) {
					console.log("Requring moduleName=" + moduleName + " failed! err=" + err.message + " NODE_MODULES_PATH=" + NODE_MODULES_PATH);
				}
				//process.env.NODE_PATH = nodeModulesPathOriginal;
				return m;
			};
			document.all = ALLDOCUMENTS;
			
			var scriptOptions = {
				filename: scriptName,
				displayErrors: true
			}
			
			var fileType = getFileType(document.path);
			
			// Some files should not be compiled, only evaluated
			
			if(DONOTCHANGE.indexOf(fileType) != -1) return;
			
			
			var html = "";
			
			/* 
				Include all headers and footers all the way into the stem!
				Make an array with all headers and footers starting from the stem to the current document
			*/
			var tree = branch;
			var headers = [];
			var footers = [];
			var depth = 0;
			
			while(true) {
				
				if(tree.header) headers.push(tree.header); // stem is last
				
				// Using push (instead of unshift) will make the tree stem come last in the array
				if(tree.footer) footers.push(tree.footer);
				
				if(!tree.parent) break;
				
				depth++;
				
				tree = tree.parent;
				
			}
			
			//log("headers=" + headers.length);
			//log("footers=" + footers.length);
			
			var language = document.language; // String
			var keywords = document.keywords; // Array of words
			var bodyOnloads = document.bodyOnloads; // Array of script sources
			var headScripts = document.headScripts; // Array
			var head = document.head; // String with title, keywords, etc removed
			var mainHtml = "<main>\n" + document.body + "\n</main>\n"; 
			var bodyScripts = document.bodyScripts;
			var headerHtml = "";
			var footerHtml = "";
			
			// Error: End tag header seen, but there were open elements.
			// We can not open a div in header and close it in footer, so don't boother with the header and footer semantic elements
			
			for(var i=0; i<headers.length; i++) {
				
				// Note: stem is last!!
				
				if(language == "") language = headers[i].language;
				
				keywords = mergeUnique(keywords, headers[i].keywords);
				
				bodyOnloads = mergeUnique(bodyOnloads, headers[i].bodyOnloads);
				
				headScripts = mergeUnique(headScripts, headers[i].headScripts);
				
				
				head = head + headers[i].head; // The document head comes first, then the stem and out 
				
				// We want stem first
				headerHtml = headers[i].body + headerHtml;
				
				bodyScripts = mergeUnique(bodyScripts, headers[i].bodyScripts);
				
			}
			
			
			for(var i=0; i<footers.length; i++) {
				// No head data in the footers.
				
				// We want stem last
				footerHtml = footerHtml + footers[i].body; 
				
				bodyScripts = mergeUnique(bodyScripts, footers[i].bodyScripts);
				
			}
			
			
			// Build the HTML
			html += '<!DOCTYPE html>\n';
			
			html += '<html';
			
			if(language) {
				html += ' lang="' + language + '"';				
			}
			html += '>\n';
			
			html += '<head>\n';
			
			html += '\t<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n';
			
			html += '\t<title>' + document.title + '</title>\n';
			
			if(keywords.length > 0) {
				html += '\t<meta name="keywords" content="' + keywords.join(", ") + '">\n';
			}
			
			if(document.author != "") html += '\t<meta name="author" content="' + document.author + '">';
			
			// Add head scripts
			for(var i=0; i<headScripts.length; i++) {
				html += '\t<script src="' + headScripts[i] + '"></script>\n';
			}
			
			// Add the head part of all headers in the tree branch
			html += head;
			
			
			html += '\n</head>\n';
			
			
			html += '<body';
			if(bodyOnloads.length > 0) {
				html += ' onload="' + bodyOnloads.join("; ") + '"';
			}
			html += '>\n';
			
			// Add the bodies
			html += headerHtml + mainHtml + footerHtml;
			
			// Add body scripts
			for(var i=0; i<bodyScripts.length; i++) {
				html += '<script src="' + bodyScripts[i] + '"></script>\n';
			}
			
			html += '</body>';
			
			
			
			html = makePathsRelative(html, depth);
			
			
			
			document.html = html;
			
		}
		
	}
	
}


function makePathsRelative(html, depth) {
	// Look for href and src that starts with / (root) and make them relative!
	
	
	
	
	var relative = "";
	for(var i=0; i<depth; i++) {
		relative = relative + "../";
	}
	
	// Replace href="" with href="index.htm" (Possible bug if linking to itself)
	html = html.replace(/href.?=.?("|')\/["']/igm, "href=$1" + relative + "index.htm$1");
	
	
	html = html.replace(/src.?=.?("|')\//igm, "src=$1"+relative);
	html = html.replace(/href.?=.?("|')\//igm, "href=$1"+relative);
	
	
	// 	replace all href="foo/" with href="foo/index.htm"
	//html = html.replace(/href.?=.?("|')(.*\/)("|')/igm, "href=$1$2index.htm$1");
	
	var re = new RegExp("href.?=.?(\"|')(.*\\/)(\"|')", "img");
	var str, arr;
	while ((arr = re.exec(html)) !== null) {
		//log("Found: " + JSON.stringify(arr));
		
		str = arr[0];
		//log(str);
		if(str.indexOf("://") == -1) {
			html = html.replace(str, "href=" + arr[1] + arr[2] + "index.htm" + arr[1]);
		}
		
	}
	
	
	return html;
}

/*
	
	var walk = function(dir, done) {
	var results = [];
	fs.readdir(dir, function(err, list) {
	if (err) return done(err);
	var pending = list.length;
	if (!pending) return done(null, results);
	list.forEach(function(file) {
	file = path.resolve(dir, file);
	fs.stat(file, function(err, stat) {
	if (stat && stat.isDirectory()) {
	walk(file, function(err, res) {
	results = results.concat(res);
	if (!--pending) done(null, results);
	});
	} else {
	results.push(file);
	if (!--pending) done(null, results);
	}
	});
	});
	});
	};
	
*/

function findFiles(dir, parentBranch, done) {
	
	// Finds files and add them to branches creating a tree
	
	var wait_readdir = 0;
	var wait_stat = 0;
	var wait_Document = 0;
	
	walk(dir, parentBranch, done);
	
	function walk(dir, parentBranch, done) {
		
		if(ABORT) return;
		
		// Get last part of the dir
		
		log("walking dir=" + dir);
		
		var folderName = dir.substring( Math.max(dir.lastIndexOf("/"), dir.lastIndexOf("\\")) );
		
		var branch;
		
		if(folderName == "/" || folderName == "\\") {
			// This is the root folder
			branch = ROOT;
		}
		else {
			// Remove flashes from foldername
			//folderName = folderName.substring(1);
			folderName = folderName.replace(/\/|\\/g, "");
			
			if(!parentBranch.hasOwnProperty("folders")) parentBranch.folders = {};
			
			parentBranch.folders[folderName] = new Folder();
			
			branch = parentBranch.folders[folderName];
		}
		
		wait_readdir++;
		
		FS.readdir(dir, function(err, list) {
			if (err) error(err);
			
			if(ERROR) return;
			if(ABORT) return;
			
			branch.documents = {};
			
			
			list.forEach(function(fileName) {
				
				// Ignore files starting with _ when publishing, or files starting with __ (two underscores) alltogehter (dont even include them in preview)
				if((fileName.substr(0, 1) == "_" && PUBLISH) || (fileName.substr(0, 1) == "_" && fileName.substr(1, 1) == "_")) return; 
				
				var filePath = resolvePath(dir, fileName);
				
				wait_stat++;
				
				var fileType = "";
				
				FS.stat(filePath, function(err, file) {
					
					if(err) error(err);
					if(!file) error(new Error("Stat error!?"));
					
					if(ERROR) return;
					
					if (file.isDirectory()) {
						walk(filePath, branch, done);
					}
					else if(file.isFile()) {
						
						fileType = getFileType(fileName);
						
						wait_Document++;
						
						if(fileName == "header.htm") {
							branch.header = new Document(fileName, filePath, false, documentCreated);
						}
						else if(fileName == "footer.htm") {
							branch.footer = new Document(fileName, filePath, false, documentCreated);
						}
						else if(fileType == "htm" || fileType == "html" || fileType == "xml" || fileType == "nodejs" || fileType == "docx" || fileType == "md") {
							//log("file=" + filePath + "\n");
							
							fileName = changeFileType(fileName, "docx", "htm");
							fileName = changeFileType(fileName, "md", "htm");
							
							//fileName = changeFileType(fileName, "html", "htm"); // For consitency
							
							fileName = fileName.replace(/\s/g, ""); // Remove white space
							
							branch.documents[fileName] = new Document(fileName, filePath, false, documentCreated);
							
							ALLDOCUMENTS.push(branch.documents[fileName]);
						}
						// Todo: add markdown, pdf, and word support
						else {
							// Probably a binary file.
							
							OTHERFILES.push(filePath);
							
							//log("Unsupported file type=" + fileType);
							wait_Document--;
						}
						
					}
					else {
						error(new Error("Unsupported file: " + filePath));
					}
					
					wait_stat--;
					checkComplete();
					
					function documentCreated(filePath) {
						
						log("Read file=" + filePath);
						
						wait_Document--;
						checkComplete();
						
					}
					
				});
				
			});
			
			wait_readdir--;
			checkComplete();
			
		});
		
		function checkComplete() {
			//log("  wait_readdir=" + wait_readdir + " wait_stat=" + wait_stat + " wait_Document=" + wait_Document + "");
			
			if(wait_readdir == 0 && wait_stat == 0 && wait_Document == 0) {
				done();
			}
		}
		
	}
}


function Document(fileName, filePath, evaluate, fileRead) {
	
	var document = this;
	var gotStat = false;
	var gotData = false;
	var fileType = getFileType(filePath);
	
	
	document.html = "";
	document.path = filePath;
	document.originalFileType = fileType;
	
	// properties we must have
	document.headScripts = [];
	document.bodyScripts = [];
	document.title = "";
	document.keywords = [];
	document.language = "";
	document.body = "";
	document.lead = "";
	document.head = "";
	
	FS.stat(filePath, function(err, stat) {
		
		if(!document.created) document.created = new Date(stat.ctime);
		
		document.changed = new Date(stat.mtime);
		
		gotStat = true;
		
		if(gotData && gotStat) fileRead(filePath);
	});
	
	if(fileType == "docx") {
		log("Convert to HTML file=" + filePath);
		document.path = changeFileType(document.path, "docx", "htm");
		
		var options = {
			convertImage: MAMMOTH.images.inline(function(element) {
				return element.read("base64").then(function(imageBuffer) {
					return {
						src: "data:" + element.contentType + ";base64," + imageBuffer
					};
				});
			})
		};
		
		MAMMOTH.convertToHtml({path: filePath}, options)
		.then(function(result){
			var html = result.value; // The generated HTML
			
			makeDocument(html);
		})
		.done();
	}
	else {
		FS.readFile(filePath, function (err, data) {
			
			if (err) error(err);
			
			if(ERROR) return;
			
			// Detect encoding
			var  enc = JSCHARDET.detect(data);
			
			//log("enc=" + JSON.stringify(enc) + " path=" + filePath);
			
			if(enc.encoding.toLowerCase() != "utf-8" && enc.encoding.toLowerCase() != "ascii" && enc.confidence == 1) {
				log("Unknown encoding (" + enc.encoding + ") in file=" + filePath);
				}
			else {
				data = data.toString("utf8");
			}
			
			document.original = data;
			
			if(fileType == "md") {
				
				document.path = changeFileType(document.path, "md", "htm");
				
				// Strip markdown metadata, find a empty line
				var metaEnds = data.indexOf("\r\n\r\n"); // Windows line break
				if(metaEnds == -1) metaEnds = data.indexOf("\n\n"); // Linux
				if(metaEnds == -1) metaEnds = data.indexOf("\r\r"); // Commodore
				
				var metaData = data.substring(0, metaEnds); // Search until first empty line
				
				if(metaData.search(/(title)|(author)|(keywords)|(date):/i) != -1) {
					// It contains metadata! Remove the metadata from the body
					data = data.substring(metaEnds);
				}
				else {
					metaData = null;
				}
				
				log("metaEnds=" + metaEnds);
				
				data = MARKED(data); // Convert markdown to html
				
			}
			else if(fileType == "docx") {
				data = MAMMOTH.convertToHtml(input, options);
				document.path = changeFileType(document.path, "md", "htm");
			}
			
			
			makeDocument(data, metaData);
			
		});
	}
	
	function makeDocument(data, metaData)	{
		
		// Do not evaluate here! Evaluate in the evaluate step!
		
		var arrLanguage = [];
		var arrTitle = [];
		var arrDate = [];
		var arrKeywords = [];
		var arrAuthor = [];
		var arrDescription = [];
		
		document.html = data;
		
		
		// Note: find and document.findReplace returns an array!
		
		document.stylesheets = find(document.html, "<link(?=[^>]*rel\\s*=\\s*(\"|')\\s*stylesheet\\s*\\1)\\s+[^>]*href\\s*=\\s*(\"|')([^>\\2]*?)\\2.*(>.*</link>|>)\\s{0,}", 3);
		
		
		document.bodyOnloads = find(document.html, "<body.*onload=[\"'](.*?)[\"']", 1);
		
		
		var abstract = contentOfHtmlTag(document.html, "abstract");
		
		document.lead = abstract;
		
		if(document.lead == "" && arrDescription.length > 0) document.lead = arrDescription[0];
		
		//log("abstract=" + abstract);
		//log("description=" + description);
		//log("lead=" + document.lead);
		
		
		
		if(DONOTCHANGE.indexOf(fileType) != -1) {
			// Do NOT remove anything from the document, but collect some info
			
			// Find title, but do not remove it
			arrTitle = find(document.html, "<title>(.*?)</title>\\s{0,}", 1);
			
			// Find meta keywords, but do not replace them
			arrKeywords = find(document.html, "<meta(?=[^>]*name\\s*=\\s*(\"|')\\s*keywords\\s*\\1)\\s+[^>]*content\\s*=\\s*(\"|')([^>\\2]*?)\\2.*(>.*</meta>|>)\\s{0,}", 3);
			
			
		}
		else {
			
			// Remove stuff that will be added later when compiling
			
			
			if(fileType == "md" && metaData) {
				
				arrTitle = find(metaData, "title:\\s*(.*)$", 1);
				arrDate =  find(metaData, "date:\\s*(.*)$", 1);
				arrKeywords =  find(metaData, "keywords:\\s*(.*)$", 1);
				arrLanguage = find(metaData, "language:\\s*(.*)$", 1);
				arrDescription = find(metaData, "description:\\s*(.*)$", 1);
				arrAuthor = find(metaData, "authors?:\\s*(.*)$", 1); // Only the first author
				
			}
			else {
				
				// Asume its an HTML file
				
				//if(!isHeaderOrFooter)
				
				arrLanguage = find(document.html, "<html.*lang=[\"'](.*?)[\"']", 1);
				
				arrDate = find(document.html, "<meta(?=[^>]*name\\s*=\\s*(\"|')\\s*created\\s*\\1)\\s+[^>]*content\\s*=\\s*(\"|')([^>\\2]*?)\\2.*(>.*</meta>|>)\\s{0,}", 3);
				
				arrDescription = find(document.html, "<meta(?=[^>]*name\\s*=\\s*(\"|')\\s*description\\s*\\1)\\s+[^>]*content\\s*=\\s*(\"|')([^>\\2]*?)\\2.*(>.*</meta>|>)\\s{0,}", 3);
				
				
				
				// Find and remove the title
				arrTitle = document.findReplace("<title>(.*?)</title>\\s{0,}", 1, "");
				
				
				// Find meta keywords and replace them
				arrKeywords = document.findReplace("<meta(?=[^>]*name\\s*=\\s*(\"|')\\s*keywords\\s*\\1)\\s+[^>]*content\\s*=\\s*(\"|')([^>\\2]*?)\\2.*(>.*</meta>|>)\\s{0,}", 3);
				
				// Find and remove author info
				arrAuthor = document.findReplace("<meta(?=[^>]*name\\s*=\\s*(\"|')\\s*author\\s*\\1)\\s+[^>]*content\\s*=\\s*(\"|')([^>\\2]*?)\\2.*(>.*</meta>|>)\\s{0,}", 3);
				
				
				// Remove charset info (we will convert everything to utf-8)
				// <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
				// <meta charset="utf-8" /> 
				
				var contentType = document.findReplace("<meta(?=[^>]*http\-equiv\\s*=\\s*(\"|')\\s*Content\-Type\\s*\\1)\\s+[^>]*content\\s*=\\s*(\"|')([^>\\2]*?)\\2.*(>.*</meta>|>)\\s{0,}", 3);
				var metaCharset = document.findReplace("<meta charset\\s*=\\s*['\"](.*)['\"].*>\\s{0,}", 1);
				
				if(contentType.length > 0) {
					//log("contentType=" + contentType[0]);
					var charset = find(contentType[0].trim() + ";", "charset\\s*?=\\s*?(.*);", 1); // meh, it doesn't seem to be possible to stop at $ xor ;
					if(charset.length > 0) {
						document.originalCharset = charset[0].replace(";", "").trim();
						//log("document.originalCharset=" + document.originalCharset);
					}
				}
				if(metaCharset.length > 0) {
					//log("metaCharset=" + metaCharset[0]);
					if(document.originalCharset == "") document.originalCharset = metaCharset[0];
					//log("document.originalCharset=" + document.originalCharset);
				}
				
				
				
				// Compute this both first (for searchPart) and last (so that stuff get replaced)
				document.head = contentOfHtmlTag(document.html, "head");
				document.body = contentOfHtmlTag(document.html, "body");
				
				document.headScripts = document.findReplace("<script.*?src=[\"|'](.*?)[\"|'].*(>.*</script>|>)\\s{0,}", 1, "", document.head);
				//document.bodyScripts = document.findReplace("<script.*?src=[\"|'](.*?)[\"|'].*(>.*</script>|>)\\s{0,}", 1, "", document.body);
				
				
				// Compute this both first (for searchPart) and last (so that stuff get replaced)
				document.head = contentOfHtmlTag(document.html, "head");
				document.body = contentOfHtmlTag(document.html, "body");
				
				
				
			}	
			
		}
		
		
		if(arrDescription.length > 0 && document.lead == "") document.lead = arrDescription[0];
		
		var documentLeadFirstParagraph = false;
		
		if(document.lead == "") {
			// Use the first paragraph
			document.lead = contentOfHtmlTag(document.html, "p");
			documentLeadFirstParagraph = true;
		}
		
		
		if(arrTitle.length == 0) {
			// Take first heading as title
			arrTitle = find(document.html, "<h(\\d)>(.*)</h\\1>", 2);
			if(arrTitle.length > 0) {
				log("WARNING: Using H-tag as title in file=" + filePath);
				arrTitle.length = 1; // Dont complain about multible titles
			}
			
			if(arrTitle.length == 0) {
				// We are getting desparate, use the first paragraph
				arrTitle = [contentOfHtmlTag(document.html, "p")];
				if(arrTitle[0].length > 0) {
					log("WARNING: Using first paragraph as title in file=" + filePath);
				}
				
				if(documentLeadFirstParagraph) {
					// Change the lead to the second paragraph, because we are using the first p as title
					document.lead = contentOfHtmlTag(document.html, "p", 2);
					log("WARNING: Using second paragraph as lead in file=" + filePath);
				}
				
			}
			
		}
		
		if(arrTitle.length > 0) {
			if(arrTitle.length > 1) {
				log("WARNING: More then one title in file=" + filePath);
			}
			document.title = arrTitle[0]; // Turn into string
		}
		else {
			log("WARNING: No title in file=" + filePath);
			document.title = "";
		}
		//log("title=" + document.title);
		
		
		if(arrKeywords.length > 0) {
			if(arrKeywords.length > 1) {
				log("WARNING: Many meta keywords in file=" + filePath);
			}
			document.keywords = toUniqueArray(arrKeywords[0]);;
		}
		else {
			log("WARNING: No meta keywords exist in file=" + filePath);
			document.keywords = [];
		}
		
		if(arrAuthor.length > 0) {
			document.author = arrAuthor[0];
		}
		
		if(arrLanguage.length > 0) {
			document.language = arrLanguage[0].trim();
		}
		
		if(arrDate.length > 0) document.created = new Date(arrDate[0]);
		
		
		
		
		if(!document.body && !document.head) document.body = document.html;
		
		// Strip HTML from title
		document.title = document.title.replace(/<[^>]*>/g, "");
		
		
		gotData = true;
		
		if(gotData && gotStat) fileRead(filePath);
		
	}
	
}

Document.prototype.write = function(data) {
	var document = this;
	//log("Writing data=" + data);
	document.html += data;
}

Document.prototype.evaluate = function(str) {
	var document = this;
	
	var char = "";
	var lastChar = "";
	var lastChar2 = "";
	var lastChar3 = "";
	var codeStart = -1;
	var codeEnd = -1;
	var code = "";
	var insideCode = false;
	var buffer = [];
	var vm = require("vm");
	var context = new vm.createContext(document);
	var script;
	var initCode = '"use strict";var document = this;';
	var scriptCount = 0;
	
	var scriptOptions = {
		filename: document.path,
		displayErrors: true
	}
	
	script = new vm.Script(initCode, scriptOptions);
	script.runInContext(context);
	
	
	for(var i=0; i<str.length; i++) {
		checkChar(i);
	}
	
	document.write(buffer.join("")); // Write whats left in the buffer
	
	
	function checkChar(charIndex) {
		char = str[i];
		
		//log("char=" + char);
		//log("char=" + char + " lastChar=" + lastChar);
		
		if(char == "S" && lastChar == "J" && lastChar2 == "?" && lastChar3 == "<") {
			codeStart = i+1;
			insideCode = true;
			
			buffer.pop(); // Remove J
			buffer.pop(); // Remove ?
			buffer.pop(); // Remove the < from the buffer
			
			document.write(buffer.join("")); // Write the buffer
			buffer.length = 0; // Reset buffer
		}
		else if(char == ">" && lastChar == "?" && codeStart != -1) {
			codeEnd = i-1;
			code = str.substring(codeStart, codeEnd).trim();
			
			//log("code=" + code);
			
			insideCode = false;
			scriptCount++;
			
			//buffer.pop(); // Remove the % from the buffer
			
			if(code.substring(0, 1) == "=") {
				
				try {
					script = new vm.Script(code.substring(1));
					document.write(script.runInContext(context));
				}
				catch(err) {
					if(err) parseError(document, scriptCount, err);
				}
				
				//document.write(eval(code.substring(1)));
			}
			else {
				// Remove "use strict" or variables wont work cross eval's
				//code = code.replace(/["']use strict["']\;/gi, ""); 
				
				try {
					script = new vm.Script(code);
					script.runInContext(context);
				}
				catch(err) {
					if(err) parseError(document, scriptCount, err);
				}
				//eval(code);
				//(1, eval)(code);
			}
		}
		else {
			if(!insideCode) {
				buffer.push(char);
			}
		}
		
		lastChar3 = lastChar2;
		lastChar2 = lastChar;
		lastChar = char;
	}
}

Document.prototype.findReplace = function(reString, group, replaceWith, searchPart) {
	var document = this;
	
	var re = new RegExp(reString, "img");
	var searchInStr = document.html;
	
	if(searchPart != undefined) {
		// If searchPart is specified, search only in that string, but replace in the whole document!
		searchInStr = searchPart;
	}
	
	if(group == undefined) group = 1;
	if(replaceWith == undefined) replaceWith = "";
	
	var arr = [];
	var result = [];
	var replace = [];
	
	while ((arr = re.exec(searchInStr)) !== null) {
		//log("Found: " + JSON.stringify(arr));
		replace.push(arr[0]);
		result.push(arr[group]);
	}
	
	if(result.length == 0) {
		//log("Did not find " + reString + "");
		//result.push("");
	}
	
	for(var i=0; i<replace.length; i++) {
		document.html = replaceAll(document.html, replace[i], replaceWith); // Remove it
		//log("Replaced " + replace[i]);
	}
	
	return result;
	
}



function contentOfHtmlTag(text, tag, nr) {
	
	//log("Finding content of tag: " + tag);
	
	if(nr == undefined) nr = 1;
	
	var originalText = text;
	
	// Ignore the case
	text = text.toLowerCase();
	tag = tag.toLowerCase();
	
	
	
	var xmpStart = -1;
	var xmpEnd = -1;
	var tagStart = -1;
	var condition = true;
	var xmpTags = [];
	var insideXmp = false;
	var count = 0;
	
	// Find all xmp tags
	do {
		xmpStart = text.indexOf("<xmp", xmpEnd);
		xmpEnd = text.indexOf("</xmp", xmpStart);
		
		if(xmpStart != -1) xmpTags.push({start: xmpStart, end: xmpEnd});
		
	} while(xmpStart != -1)
	
	//log("xmpTags=" + JSON.stringify(xmpTags));
	
	// Find tagStart, nr, not inside xml tags
	do {
		
		tagStart = text.indexOf("<" + tag, tagStart+1);
		
		//log("tagStart=" + tagStart);
		
		insideXmp = false;
		
		for(var i=0; i<xmpTags.length; i++) {
			insideXmp = xmpTags[i].start < tagStart && xmpTags[i].end > tagStart;
			if(insideXmp) break;
		}
		
		if(!insideXmp) count++;
		
	} while (count < nr && tagStart != -1);
	
	if(tagStart == -1) {
		//log("Did not find enough occurencies of " + tag + "");
		return "";
	}
	
	
	// Move to the end of the tagStart
	tagStart = text.indexOf(">", tagStart) + 1;
	
	
	// Find tag end (cant be inside xmp)
	var tagEnd = tagStart;
	//log("Finding end ...");
	do {
		
		tagEnd = text.indexOf("</" + tag, tagEnd+1);
		
		//log("tagEnd=" + tagEnd);
		
		insideXmp = false;
		
		for(var i=0; i<xmpTags.length; i++) {
			insideXmp = xmpTags[i].start < tagEnd && xmpTags[i].end > tagEnd;
			if(insideXmp) {
				tagEnd = xmpTags[i].end; // Start looking from here
				break;
			}
		}
		
	} while (insideXmp && tagEnd != -1);
	
	if(tagEnd == -1) {
		console.warn("Could not find tag ending for tag: " + tag + "");
		return "";
	}
	
	if(ERROR) return;
	
	// Return the content of the html tag
	return originalText.substring(tagStart, tagEnd);
	
}


function find(text, reString, group) {
	
	var re = new RegExp(reString, "img");
	
	if(group == undefined) group = 1;
	
	var arr = [];
	var result = [];
	
	while ((arr = re.exec(text)) !== null) {
		//log("Found: " + JSON.stringify(arr));
		result.push(arr[group]);
	}
	
	if(result.length == 0) {
		//log("Did not find " + reString + "");
		//result.push("");
	}
	
	return result;
}


function getFileType(fileName) {
	
	// Returns file type (the part after last dot) in lower case
	
	var dotPosition = fileName.lastIndexOf(".");
	var fileType = "";
	
	if(dotPosition > -1) {
		fileType = fileName.substring(dotPosition+1).toLowerCase();
	}
	else {
		fileType = "";
	}
	
	return fileType;
}


function changeFileType(fileName, from, to) {
	var dotPosition = fileName.lastIndexOf(".");
	
	if(dotPosition > -1) {
		var fileType = fileName.substring(dotPosition+1).toLowerCase();
		if(fileType == from.toLowerCase()) { // Convert to lower case for easier comparison
			fileName = fileName.substring(0, dotPosition+1) + to;
		}
	}
	
	return fileName;	
	
}

function toUniqueArray(str) {
	/*
		Input: A string with comma separated words
		Output: An array with unique items
	*/
	
	var arr = str.split(",");
	var newArr = [];
	
	for(var i=0; i<arr.length; i++) {
		arr[i] = arr[i].trim();
		if(newArr.indexOf(arr[i]) == -1) {
			newArr.push(arr[i]);
		}
	}
	return newArr;
}


function mergeUnique(org, arr) {
	// Pushes items from arr that does not exist in org to org
	
	var item;
	
	for(var i=0; i<arr.length; i++) {
		item = arr[i];
		if(org.indexOf(item) == -1 && item != "") {
			org.push(item);
		}
	}
	
	//log("array=" + JSON.stringify(org));
	
	return org;
}


function mustBePath(path) {
	if(!path) error(new Error("Path=" + path));
	
	if(ERROR) return;
	
	// Make sure it ends with / or \
	
	var endsWidth = path.substring(path.length-1);
	
	if(endsWidth == "/" || endsWidth == "\\") {
		return path;
	}
	else {
		error(new Error("Path must end with a slash! path=" + path));
	}
}

function fileInUse(src) {
	// Check if the file is used anywhere
	
	src = replaceAll(src, "\\", "/").trim();
	
	//log("check=" + src);
	
	if (src=="favicon.ico") return true;
	
	if(MEDIAFILES.indexOf(src) == -1) {
		return false;
	}
	else {
		return true;
	}
}

function findMedia(txt, lookFor, group) {
	// Finds all media files in the html code and adds them to the MEDIAFILES array
	
	if(lookFor == undefined) {
		lookFor = "<.*src[ ]*=[ ]*[\"'](.*?)[\"']";
		group = 1;		
	}
	
	var files = find(txt, lookFor, group);
	
	for(var i=0; i<files.length; i++) {
		if(files[i] != "") {
			files[i] = files[i].trim();
			
			files[i] = replaceAll(files[i], "\\", "/");
			
			if(MEDIAFILES.indexOf(files[i]) == -1) {
				console.log("Found media file: " + files[i]);
				MEDIAFILES.push(files[i]);
				}
		}
	}
	
}

function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
	//log("find=" + find);
	return str.replace(new RegExp(escapeRegExp(find), 'gim'), replace);
}


function Folder(documents) {
	var folder = this;
	
	if(documents != undefined) {
		folder.documents = documents;
	}
	
}

Folder.prototype.latest = function(limit) {
	// Returns an array of all documents in the folder ordered by document.created
	var folder = this;
	
	var documents = folder.documents;
	
	
	// Make an array
	var arr = Object.keys(documents);
	
	// Sort it
	arr.sort(function (a, b) {
		return documents[b].created - documents[a].created;
	});
	
	if(limit != undefined) {
		if(limit < arr.length) arr.length = limit;
	}
	
	arr = arr.map(function (f) {
		//SEND_MESSAGE("f=" + f + " title=" + documents[f].title);
		return documents[f];
	});
	
	return arr;
	
	/*
		var obj = {};
		
		for(var i=0; i<limit; i++) {
		obj[arr[i]] = documents[arr[i]];
		}
		
		return new Folder(obj);
	*/
}


/*
	function copyFile(source, target, cb) {
	// Not used!
	var cbCalled = false;
	var rdOpen = false;
	var wrOpen = false;
	
	log("source=" + source);
	log("target=" + target);
	
	// Make sure the target path exist!
	
	
	var rd = FS.createReadStream(source);
	rd.on("error", function(err) {
	log("read error!");
	done(err);
	});
	rd.on("open", function() {
	rdOpen = true;
	log("readStream open file=" + source);
	
	if(rdOpen && wrOpen) startPipe();
	});
	
	var wr = FS.createWriteStream(target, { flags: 'w'});
	wr.on("error", function(err) {
	log("write error!");
	done(err);
	});
	wr.on("close", function(ex) {
	done();
	});
	wr.on("open", function() {
	wrOpen = true;
	log("writeStream open file=" + target);
	if(rdOpen && wrOpen) startPipe();
	});
	
	function startPipe() {
	rd.pipe(wr);
	}
	
	function done(err) {
	if (!cbCalled) {
	cb(err, source + " -> " + target);
	cbCalled = true;
	}
	}
	}
*/

function parseError(doc, scriptCount, err) {
	var arr = err.stack.match(/at evalmachine.<anonymous>:(\d):(\d)/);
	
	if(err == null) return;
	
	//log(doc.original);
	
	//log(JSON.stringify(arr, null, 2));
	
	var filePath = doc.path;
	
	var workingDir = process.cwd();
	
	log("workingDir=" + workingDir);
	
	filePath = filePath.replace(workingDir, "");
	
	var line = parseInt(arr[1]);
	var column = parseInt(arr[2]);
	
	var msg = err.message.replace('evalmachine.<anonymous>:' + line, "");
	
	// Figure out the line in the original file
	var str = doc.original;
	var startIndex = 0;
	for(var i=0; i<scriptCount; i++) {
		startIndex = str.indexOf("<?JS", startIndex) + 1;
		//log("startIndex=" + startIndex);
	}
	var upUntil = str.substr(0, startIndex);
	var lines = occurrences(upUntil, "\n");
	
	line += lines + 2;
	
	//var errMessage = "" + msg + "\nLine:" + line + " column: " + column + " of script nr: " + scriptCount + " of file: " + filePath;
	
	var errMessage = "Line:" + line + ": " + filePath + ": " + msg + "";
	
	//log(errMessage);
	SEND_MESSAGE({type: "error", msg: errMessage});
	
}

function occurrences(string, subString, allowOverlapping) {
	/** Function count the occurrences of substring in a string;
		* @param {String} string   Required. The string;
		* @param {String} subString    Required. The string to search for;
		* @param {Boolean} allowOverlapping    Optional. Default: false;
	*/
	string+=""; subString+="";
	if(subString.length<=0) return string.length+1;
	
	var n=0, pos=0;
	var step=(allowOverlapping)?(1):(subString.length);
	
	while(true){
		pos=string.indexOf(subString,pos);
		if(pos>=0){
			//log(n + " " + pos + " " + subString);
			n++;
			pos+=step;
		}
		else break;
	}
	return(n);
}

function log(str) {
	if(SEND_MESSAGE) SEND_MESSAGE({type: "debug", msg: str});
	else console.log(str);
}

function resolvePath(dir, file) {
	
	if(!dir) error(new Error("Not a directory=" + dir));
	
	if(ERROR) return;
	
	var delimiter = dir.substring(dir.length-1);
	
	if(delimiter != "/" && delimiter != "\\") {
		if(dir.indexOf("/") != -1) delimiter = "/";
		if(dir.indexOf("\\") != -1) delimiter = "\\";
		
		dir += delimiter;
		
		//error(new Error("Directory path must end with a slash! dir=" + dir));
	}
	
	return dir + file;
	
}

function error(err) {
	if(SEND_MESSAGE) SEND_MESSAGE({type: "error", stack: err.stack, code: err.code});
	ERROR = true;
	ABORT = true;
	if(MAIN_CALLBACK) MAIN_CALLBACK(err);
	MAIN_CALLBACK = null; // Prevent more callbacks, eg. from requests that are still in flight that also will give an error
	console.error(err);
}

function parseString(obj) {
	if(typeof obj == "object") return JSON.stringify(obj, null, 2);
	else return obj + "";
}

function getStack(scriptName, lineNr) {
	if(lineNr == undefined) lineNr = 0;
	
	//RangeError: Maximum call stack size exceeded
	try {
		var stack = (new Error().stack).split(/\r\n|\n/);
	}
	catch(err) {
		return null;
	}
	
	/*
		Error
		,    at getStack (/home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:1810:16)
		,    at Object.document.console.log (/home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:485:18)
		,    at evalmachine.<anonymous>:3:9,    at checkChar (/home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:1290:13)
		,    at Document.evaluate (/home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:1238:3)
		,    at evalFile (/home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:398:13)
		,    at evalDir (/home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:376:5)
		,    at evaluate (/home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:368:2)
		,    at /home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:159:3
		,    at checkComplete (/home/zeta/projects/jzedit/server/plugin/static_site_generator/ssg-build.js:871:5)
		
	*/
	
	stack.shift(); // Remove first item ("Error")
	stack.shift(); // Remove second item ("at getStack")
	
	filterStack(stack); // recursive
	
	if(lineNr >= stack.length) lineNr = stack.length-1;
	
	console.log("stack: " + stack);
	
	/*
	var re = new RegExp(scriptName + ":(\\d+):(\\d+)");
	var match;
	for (var i=0; i<stack.length; i++) {
		match = stack[i].match(re);
		if(match) break;
	}
	*/
	
	return stack[0].replace("    at evalmachine.<anonymous>", scriptName);
	
	//return {row: parseInt(match[1]), col: parseInt(match[2])};
	
	function filterStack(stack) {
		
		for (var i=0; i<stack.length; i++) {
			if(stack[i].indexOf("at Object.document.console.log") != -1) {
				stack.splice(i, 1);
				return filterStack(stack);
			}
			else if(stack[i].indexOf("at Document.evaluate") != -1) {
				stack.splice(i, 6);
				return filterStack(stack);
			}
		}
	}
	
}


if (require.main === module) {
	console.log('called directly');
	
	// These paths needs to be absolute!
	BASEPATH = mustBePath(process.argv[2], "."); // Path to files that should be processed
	PUBFOLDER = mustBePath(process.argv[3], "pub/"); // The bublic/publication folder
	
	main.compile();
} else {
	console.log('required as a module');
	module.exports = main;
}


