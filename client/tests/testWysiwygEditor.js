(function() {
	
	EDITOR.addTest(function previewCompiled(callback) {
		/*
			Should we allow the compiler to add arbitary line breaks as padding for the body/main element !?
		*/
		
		return callback(true);
		
		var compiledPage = "<html>\n<body>\nheader\n<main>\n\n\n<h1>Hello world</h1>\n\n<p>Paragraph</p>\n\n\t</main>\nfooter\n</body>\n</html>\n"
		var sourcePage = "<html>\n<body>\n\n<h1>Hello world</h1>\n\n<p>Paragraph</p>\n\n</body>\n</html>\n"
		var testFolder = "/testfolder/wysiwyg/";
		var testFile = "page_compiled_extra_added.htm";
		var newWindow;
		
		EDITOR.createWindow({url: "about:blank"}, windowOpened);
		
		function windowOpened (err, theWindow) {
			if(err) throw err;
			newWindow = theWindow;
			EDITOR.createPath(testFolder, function folderCreated(err, path) {
				if(err) throw err;
				EDITOR.saveToDisk(testFolder + testFile, compiledPage, fileCreated);
			});
		}
		
		function fileCreated(err, filePath) {
			var serveJson = {folder: testFolder};
			CLIENT.cmd("serve", serveJson, function(err, serveRespJson) {
				if(err) throw err
				
				var serveUrl = document.location.protocol + "//" + serveRespJson.url;
				
				var fileUrl = serveUrl + testFile;
				
				EDITOR.openFile("page_source.htm", sourcePage, function(err, sourceFile) {
					
					var url = fileUrl;
					
					var wysiwygEditor = new WysiwygEditor({
						sourceFile: sourceFile,
						bodyTagSource: "body",
						onlyPreview: false,
						newWindow: newWindow,
						url: url,
						whenLoaded: wysiwygEditorLoaded,
						compiledSource: compiledPage,
						bodyTagPreview: "main"
					});
					
					function wysiwygEditorLoaded() {
						
						// Does it load !?
						
						EDITOR.closeFile(sourceFile.path);
						wysiwygEditor.close();
						cleanUp();
						callback(true);
						
					}
					
				});
			});
		}
		
		function cleanUp() {
		}
		
	});
	
	
	EDITOR.addTest(function wysiwygCompiledHeaderFooter(callback) {
		/*
			Test if the wysiwygEditor gets the correct url in WYSIWYG-editing mode, 
			and that the header and footer are not removed when editing the source
			
			This test never failed. The bug was in the SSG ...
			This test sometimes failed/fails because the document was not fully loaded ... 
		*/
		
		var compiledPage = "<html>\n<body>\nheader\n<main>\n<p>main</p>\n</main>\nfooter\n</body>\n</html>\n"
		var sourcePage = "<html>\n<body>\n<p>main</p>\n</body>\n</html>\n"
		var testFolder = "/testfolder/wysiwyg/";
		var testFile = "page_compiled.htm";
		var newWindow;
		
		EDITOR.createWindow({url: "about:blank"}, windowOpened);
		
		function windowOpened (err, theWindow) {
			if(err) throw err;
			newWindow = theWindow;
			EDITOR.createPath(testFolder, function folderCreated(err, path) {
				if(err) throw err;
				EDITOR.saveToDisk(testFolder + testFile, compiledPage, fileCreated);
			});
		}
		
		function fileCreated(err, filePath) {
			var serveJson = {folder: testFolder};
			CLIENT.cmd("serve", serveJson, function(err, serveRespJson) {
				if(err) throw err
				
				var serveUrl = document.location.protocol + "//" + serveRespJson.url;
				
				var fileUrl = serveUrl + testFile;
				
				EDITOR.openFile("page_source.htm", sourcePage, function(err, sourceFile) {
					if(err) throw err;
					
					var url = fileUrl;
					var wysiwygEditorLoadedCalled = false;
					
					setTimeout(function() {
						if(!wysiwygEditorLoadedCalled) {
							throw new Error("wysiwygEditor did not load in a timely manner.  Load the dev console on the opened window and check for errors!");
						}
					}, 8000);
					
					var wysiwygEditor = new WysiwygEditor({
						sourceFile: sourceFile, 
						bodyTagSource: "body", 
						onlyPreview: false, 
						newWindow: newWindow, 
						url: url, 
						whenLoaded: wysiwygEditorLoaded, 
						compiledSource: compiledPage, 
						bodyTagPreview: "main"
					});
					
					function wysiwygEditorLoaded() {
						
						wysiwygEditorLoadedCalled = true;
						
						if(wysiwygEditor.url != url) throw new Error("Expected wysiwygEditor.url=" + wysiwygEditor.url + " == " + "url=" + url);
						
						// Make a edit
						sourceFile.insertTextRow("<p>Another paragraph</p>", 4);
						
						// Does the preview/wysiwyg window still contain the header and footer !?
						var html = wysiwygEditor.getPreviewWindowHtml();
						if(html.indexOf("header") == -1) throw new Error("preview/wysiwyg window doesn't contain header!");
						if(html.indexOf("footer") == -1) throw new Error("preview/wysiwyg window doesn't contain footer!");
						
						EDITOR.closeFile(sourceFile.path);
						wysiwygEditor.close();
						cleanUp();
						callback(true);
						
					}
					
				});
			});
		}
		
		function cleanUp() {
		}
		
	});
	
	
	EDITOR.addTest(function wysiwygRemoveLineReplaceLine(callback) {
		/*
			It should handle a diff where one line have been removed and one line has been changed
			
			The bug is actually because the file has two emty lines (instead of only one) after the body start tag!
			Causing the startrow to be one off, then the ending line break get removed!
			
		*/
		
		var compiledPage = "<html>\n<body>\nheader\n<main>\n\n\n<p>Paragraph</p>\n\n\n</main>\nfooter\n</body>\n</html>\n";
		
		var sourcePage = "<html>\n<body>\n\n\n<p>Paragraph</p>\n\n\n</body>\n</html>\n";
		
		var testFolder = "/testfolder/wysiwyg/";
		var testFile = "wysiwygRemoveLineReplaceLine.htm";
		var newWindow;
		var wysiwygEditorLoadedCalled = false;
		
		EDITOR.createWindow({url: "about:blank"}, windowOpened);
		
		setTimeout(function() {
			if(!wysiwygEditorLoadedCalled) {
				throw new Error("wysiwygEditor did not load in a timely manner. Load the dev console on the opened window and check for errors!");
				// The test can however succeed without any errors! It just takes too long. WHY??
			}
		}, 8000);
		
		function windowOpened(err, theWindow) {
			if(err) throw err;
			
			if(!theWindow) throw new Error("theWindow=" + theWindow);
			
			newWindow = theWindow;
			
			EDITOR.createPath(testFolder, function folderCreated(err, path) {
				if(err) throw err;
				EDITOR.saveToDisk(testFolder + testFile, compiledPage, fileCreated);
			});
		}
		
		function fileCreated(err, filePath) {
			var serveJson = {folder: testFolder};
			CLIENT.cmd("serve", serveJson, function(err, serveRespJson) {
				if(err) throw err
				
				var serveUrl = document.location.protocol + "//" + serveRespJson.url;
				
				var fileUrl = serveUrl + testFile;
				
				EDITOR.openFile(testFile, sourcePage, function(err, sourceFile) {
					
					if(err) throw err;
					
					var bodyTag = "body";
					var onlyPreview = false;
					var url = fileUrl;
					var compliedSourceBodyTag = "main";
					var wysiwygEditor = new WysiwygEditor({
						sourceFile: sourceFile, 
						bodyTagSource: bodyTag, 
						onlyPreview: onlyPreview, 
						newWindow: newWindow, 
						url: url, 
						whenLoaded: wysiwygEditorLoaded, 
						compiledSource: compiledPage, 
						bodyTagPreview: compliedSourceBodyTag
					});
					
					function wysiwygEditorLoaded(err, sourceFile, previewWin) {
						wysiwygEditorLoadedCalled = true;
						if(err) throw err;
						
						if(!wysiwygEditor) throw new Error("wysiwygEditor=" + wysiwygEditor);
						
						if(wysiwygEditor.url != url) throw new Error("Expected wysiwygEditor.url=" + wysiwygEditor.url + " == " + "url=" + url);
						
						// Remove a line and change one line
						var doc = previewWin.document;
						var contentElement = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
						
						contentElement.innerHTML = "\n<p>Paragraph</p>\n\n\<p>foo</p>\n";
						
						// Trigger oninput
						wysiwygEditor.previewInput();
						
						// If the bug exist, it should now have removed the last line break
						// So it's now in a bad state
						// Trigger oninput again
						wysiwygEditor.previewInput();
						// The wysiwygEditor will now complain: Uncaught Error: Text on row=6 doesn't match text to be removed!
						
						
						EDITOR.closeFile(sourceFile.path);
						previewWin.close();
						cleanUp();
						callback(true);
						
						/*
							setTimeout(function checkifWindowClosed() {
							if(newWindow) throw new Error("window doesn't appear the be closed: newWindow=" + newWindow);
							}, 1000);
						*/
						
					}
					
				});
			});
		}
		
		function cleanUp() {
		}
		
	});
	
	EDITOR.addTest(function wysiwygNoExtraLineBreaks(callback) {
		/*
			We want the compiled bodytag html and file body html to be the same after the "dance"
			(it only dance in WYSIWYG mode)
		*/
		var fileHtml = '<head></head><body>\n\n<p>Test wysiwygNoExtraLineBreaks</p>\n</body>';
		var compiledHtml = '<head></head><body>\n<main>\n\n<p>Test wysiwygNoExtraLineBreaks</p>\n</main>\n</body>';
		
		launchServe({sourcePage: fileHtml, compiledPage: compiledHtml, testFile: "wysiwygNoExtraLineBreaks.htm", onlyPreview: false}, function(err, preview, cleanup) {
			if(err) throw err;
			
			var fileBodyHtml = preview.getSourceCodeBody();
			var prewBodyHTML = preview.getContentEditableCode();
			var prewHTML = preview.getPreviewWindowHtml();
			//var lb = "\n";
			//var lbPrewHTML = UTIL.occurrences(prewHTML, lb);
			//var lbHtml = UTIL.occurrences(fileHtml, lb);
			
			console.log("fileBodyHtml: " + UTIL.lbChars(fileBodyHtml));
			console.log("prewBodyHTML: " + UTIL.lbChars(prewBodyHTML));
			console.log("prewHTML: " + UTIL.lbChars(prewHTML));
			console.log("fileHtml: " + UTIL.lbChars(fileHtml));
			
			if(fileBodyHtml != prewBodyHTML)  {
				throw new Error("The fileBodyHtml is not the same as prewBodyHTML! See console logs!");
			}
			
			cleanup();
			
			callback(true);
		});
	});
	
	EDITOR.addTest(function wysiwygHandleExtraLinebreak(callback) {
		/*
			Contenteditable sometimes inserts an extra line-break at the start, and sometimes removes it
			This might be tricky for the diff algoritm.
		*/
		var fileHtml = '<head></head><body>\n<p>Paragraph 1</p>\n\n<p>Paragraph 2</p>\n</body>';
		var compiledHtml = '<head></head><body>\nTest wysiwygHandleExtraLinebreak\n<main>\n<p>Paragraph 1</p>\n\n<p>Paragraph 2</p>\n</main>\n</body>';
		
		launchServe({sourcePage: fileHtml, compiledPage: compiledHtml, testFile: "wysiwygHandleExtraLinebreak.htm", onlyPreview: false}, function wysiwygEditorStarted(err, wysiwygEditor, cleanup) {
			if(err) throw err;
			
			// Remove a line and change one line
			var doc = wysiwygEditor.previewWin.window.document;
			var contentElement = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
			
			// Insert extra line break
			contentElement.innerHTML = "\n\n<p>Paragraph 1</p>\n\n\<p>foo</p>\n\n<p>Paragraph 2</p>\n";
			
			// Trigger oninput
			wysiwygEditor.previewInput();
			
			// Now remove them
			contentElement.innerHTML = "<p>Paragraph 1</p>\n\n\<p>bar</p>\n\n<p>Paragraph 2</p>";
			
			// Trigger oninput
			wysiwygEditor.previewInput();
			
			var fileBodyHtml = wysiwygEditor.getSourceCodeBody();
			var prewBodyHTML = wysiwygEditor.getContentEditableCode();
			var prewHTML = wysiwygEditor.getPreviewWindowHtml();
			//var lb = "\n";
			//var lbPrewHTML = UTIL.occurrences(prewHTML, lb);
			//var lbHtml = UTIL.occurrences(fileHtml, lb);
			
			console.log("fileBodyHtml: " + UTIL.lbChars(fileBodyHtml));
			console.log("prewBodyHTML: " + UTIL.lbChars(prewBodyHTML));
			console.log("prewHTML: " + UTIL.lbChars(prewHTML));
			console.log("fileHtml: " + UTIL.lbChars(fileHtml));
			
			if(fileBodyHtml != prewBodyHTML)  {
				throw new Error("The fileBodyHtml is not the same as prewBodyHTML! See console logs!");
			}
			
			cleanup();
			
			callback(true);
		});
	});
	
	EDITOR.addTest(function inlineConsoleLog(callback) {
		// The window might load before WysiwygEditor has overloaded window.console.log! So we need to set a timer !
		var fileHtml = '<head></head><body>\n<script>\nsetTimeout(function() {\nconsole.log("hi " + (new Date()).getTime());\n},50);\n</script>\n\n<p>Test inlineConsoleLog</p>\n</body>';
		
		launchServe({sourcePage: fileHtml, compiledPage: fileHtml, testFile: "inlineConsoleLog.htm"}, function(err, preview, cleanup) {
			if(err) throw err;
			
			console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
			
			setTimeout(function checkEditorInfo() {
				console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
				if(EDITOR.info.length == 0) throw new Error("Expected EDITOR.info!");
				
				cleanup();
				
				callback(true);
			}, 100);
			
		});
	});
	
	
	EDITOR.addTest(function inlineErrorMessages(callback) {
		// The window might load before WysiwygEditor has set the error listener! So we need to set a timer !
		var fileHtml = '<head></head><body>\n<script>\nsetTimeout(function() {\nthrow new Error("This is an error! " + (new Date()).getTime());\n},50);\n</script>\n\n<p>Test inlineErrorMessages</p>\n</body>';
		
		launchServe({sourcePage: fileHtml, compiledPage: fileHtml, testFile: "inlineErrorMessages.htm"}, function(err, preview, cleanup) {
			if(err) throw err;
			
			console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
			
			setTimeout(function checkEditorInfo() {
				console.log("EDITOR.info: " + JSON.stringify(EDITOR.info));
				if(EDITOR.info.length == 0) throw new Error("Expected EDITOR.info.length=" +EDITOR.info.length + " to be at least 1. EDITOR.info=" + EDITOR.info);
				
				cleanup();
				
				callback(true);
			}, 100);
			
		});
	});
	
	EDITOR.addTest(function previewAutocomplete(callback) {
		
		var var1 = "ocument.act";
		var var2 = 'document.getElementById("foobar").innerH';
		var fileHtml = '<head></head><body>\n<script>\nd' + var1 + '\n' + var2 + '\n</script>\n<div id="foobar">Test previewAutocomplete</div>\n</body>';
		
		launchServe({sourcePage: fileHtml, testFile: "previewAutocomplete.htm"}, function(err, preview, cleanup) {
			if(err) throw err;
			
			var file = preview.sourceFile;
			var index = file.text.indexOf(var1) + var1.length;
			var atCaret = autoComplete(file, index);
			UTIL.assert(atCaret.word, "document.activeElement");
			
			var index = file.text.indexOf(var2) + var2.length;
			var atCaret = autoComplete(file, index);
			UTIL.assert(atCaret.word, '.innerHTML');
			
			cleanup();
			callback(true);
		});
		
		function autoComplete(file, index) {
			
			var key_tab = 9;
			var wordDelimiters = " \t\r\n;:()"
			
			file.moveCaretToIndex(index);
			EDITOR.showFile(file);
			EDITOR.mock("keydown", {charCode: key_tab}); // tab to autocomplete
			
			return file.wordAtCaret(file.caret, wordDelimiters);
		}
		
	});
	
	EDITOR.addTest(function pressEnterTwiceInWYSIWYG(callback) {
		/*
			Pressing enter *twice* seem to remove the line breaks before </main> end tag !?
			It seem the browser removes the ending line break only *sometimes* (at random) so we need the WysiwygEditor to handle it and not blow up
		*/
		var fileHtml = '<head></head><body>\n<p id="ppp">Test pressEnterTwiceInWYSIWYG</p>\n</body>';
		var compiledHtml = '<head></head><body>\n<p>Header</p>\n<main>\n<p id="ppp">Test pressEnterTwiceInWYSIWYG</p>\n</main>\n<p>Footer</p>\n</body>';
		
		launchServe({sourcePage: fileHtml, compiledPage: compiledHtml, testFile: "pressEnterTwiceInWYSIWYG.htm", onlyPreview: false}, function servedPreview(err, wEditor, cleanup) {
			if(err) throw err;
			
			var win = wEditor.previewWin;
			var doc = win.document;
			var main = doc.getElementsByTagName("main")[0];
			
			console.log(win);
			console.log(doc);
			
			var firstParagraph = doc.getElementById("ppp");
			
			if(!firstParagraph) {
				console.log(doc);
				throw new Error("Can't find firstParagraph=" + firstParagraph + " win=" + win + " doc=" + doc + " doc.innerHTML=" + doc.innerHTML);
			}
			
			setTimeout(function firstLine() {
				var newParagraph = doc.createElement("p");
				newParagraph.innerText = "Line 1";
				var firstParagraph = doc.getElementById("ppp");
				main.insertBefore(newParagraph, firstParagraph);
				main.focus(); // Need focus, or it can't get caret position inside contenteditable!
				wEditor.previewInput();
				
				setTimeout(function secondLine() {
					var newParagraph = doc.createElement("p");
					newParagraph.innerText = "Line 2";
					var firstParagraph = doc.getElementById("ppp");
					main.insertBefore(newParagraph, firstParagraph);
					main.focus();
					wEditor.previewInput();
					
					cleanup();
					callback(true);
					
				}, 500); // Simulate user interaction
			}, 500);
			
		});
		
	});
	
	
	EDITOR.addTest(function reloadAndRecompileWhenScriptIsSaved(callback) {
		var fileHtml = '<head></head><body>\n<p id="paragraph">Test reloadAndRecompileWhenScriptIsSaved ...</p>\n</body>';
		var someScriptFileName = "somescript.js"
		var compiledHtml = '<head>\n<script src="' + someScriptFileName + '"></script>\n</head>\n<body>\n<p>Header</p>\n<main>\n<p id="paragraph">Test reloadAndRecompileWhenScriptIsSaved ...</p>\n</main>\n<p>Footer</p>\n</body>';
		var initialText = "Test reloadAndRecompileWhenScriptIsSaved script loaded"
		var successText = "Test reloadAndRecompileWhenScriptIsSaved succeeded!";
		var someScript = "window.onload=function() {\ndocument.getElementById('paragraph').innerText = '" + initialText + "';\n};\n";
		var testFolder = "/testfolder/wysiwyg/";
		
		EDITOR.createPath(testFolder, function folderCreated(err, path) {
			if(err) throw err;
			EDITOR.saveToDisk(testFolder + someScriptFileName, someScript, scriptFileCreated);
		});
		
		function scriptFileCreated(err) {
			if(err) throw err;
			
			EDITOR.openFile(testFolder + someScriptFileName, undefined, function(err, someScriptFile) {
				if(err) return callback(err);
				
				launchServe({sourcePage: fileHtml, compiledPage: compiledHtml, testFile: "reloadAndRecompileWhenScriptIsSaved.htm", onlyPreview: false}, function servedPreview(err, wEditor, cleanup, reCompile) {
					if(err) throw err;
					
					var win = wEditor.previewWin;
					var doc = win.document;
					
					console.log(win);
					console.log(doc);
					
					if(!doc) throw new Error("document not yet available!");
					
					if(win == window) throw new Error("win==window");
					if(doc == document) throw new Error("doc==document");
					
					var paragraph = doc.getElementById("paragraph");
					
					if(!paragraph) {
						console.log("doc.documentElement.innerHTML: " + doc.documentElement.innerHTML);
						console.log("doc.readyState: " + doc.readyState);
						throw new Error("Unable to find element with id paragraph from document!");
					}
					
					if(paragraph.innerText != initialText) throw new Error("Test script failed to load");
					
					// Update the script
					someScriptFile.removeRow(1);
					someScriptFile.insertTextRow("document.getElementById('paragraph').innerText = '" + successText + "';",1);
					
					var reCompileCalled = false;
					reCompile = function(cb) {
						console.log("reCompile called!");
						reCompileCalled = true;
						cb(null);
					}
					
					EDITOR.saveFile(someScriptFile, someScriptFile.path, function saved(err, path) {
						// The WysiwygEditor should now have reloaded (and called reCompile since it's a compiled file)
						
						if(!reCompileCalled) throw new Error("The reCompile function was never called!");
						
						var win = wEditor.previewWin;
						var doc = win.document;
						var paragraph = doc.getElementById("paragraph");
						
						if(paragraph.innerText != successText) throw new Error("The script update failed!");
						
						EDITOR.closeFile(someScriptFile);
						cleanup();
						callback(true);
					});
				});
			});
		}
	}, 1);
	
	
	function launchServe(opt, callback) {
		
		// opt = {sourcePage, compiledPage, testFile, onlyPreview}
		
		if(opt.compiledPage == undefined) opt.compiledPage = opt.sourcePage;
		if(opt.onlyPreview == undefined) opt.onlyPreview = true;
		if(opt.bodyTagSource == undefined) opt.bodyTagSource = "body";
		if( opt.testFolder == undefined) opt.testFolder = "/testfolder/wysiwyg/";
		
		EDITOR.createPath(opt.testFolder, function folderCreated(err, path) {
			if(err) return callback(err);
			EDITOR.saveToDisk(opt.testFolder + opt.testFile, opt.compiledPage, fileCreated);
		});
		
		function fileCreated(err, filePath) {
			if(err) return callback(err);
			CLIENT.cmd("serve", {folder: opt.testFolder}, function testFolderServed (err, serveRespJson) {
				if(err) return callback(err);
				
				var serveUrl = document.location.protocol + "//" + serveRespJson.url;
				var fileUrl = serveUrl + opt.testFile;
				
				EDITOR.openFile(opt.testFile, opt.sourcePage, function(err, sourceFile) {
					if(err) return callback(err);
					
					var url = fileUrl;
					var wysiwygEditorLoadedCalled = false;
					
					setTimeout(function() {
						if(!wysiwygEditorLoadedCalled) {
							callback(new Error("wysiwygEditor did not load in a timely manner. Load the dev console on the opened window and check for errors! You might also have to enable popups!"));
							callback =  null; // Prevent it from calling again
						}
					}, 5000);
					
					var wOptions = {
						sourceFile: sourceFile,
						bodyTagSource: opt.bodyTagSource,
						onlyPreview: opt.onlyPreview,
						url: url,
						whenLoaded: wysiwygEditorLoaded,
					}
					
					if(opt.compiledPage != opt.sourcePage) {
						wOptions.compiledSource = opt.compiledPage;
						if(opt.compiledPage.indexOf("<main") != -1) wOptions.bodyTagPreview = "main";
						wOptions.reCompile = opt.reCompile;
					}
					
					var wysiwygEditor = new WysiwygEditor(wOptions);
					
					function wysiwygEditorLoaded() {
						
						// Sometimes the document have not fully loaded, even though the browser says so
						setTimeout(function waitUntilReallyLoaded() {
							wysiwygEditorLoadedCalled = true;
							
							if(wysiwygEditor.url != url) throw new Error("Expected wysiwygEditor.url=" + wysiwygEditor.url + " == " + "url=" + url);
							
							if(wysiwygEditor.previewWin == window) throw new Error("The preview window should not be the same as the editor's window!");
							
							if(callback) {
								callback(null, wysiwygEditor, cleanUp);
							}
							
						},30); 
						
					}
					
					function cleanUp() {
						EDITOR.closeFile(sourceFile.path);
						wysiwygEditor.close();
					}
					
				});
			});
		}
	}
	
})();

