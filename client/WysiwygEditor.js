var WysiwygEditor;

/*
	
	Note: If a URL is used, it must pass "same origin" check!
	https://en.wikipedia.org/wiki/Same-origin_policy
	
	
	todo:
	Remember scrolling position and capture navigation
	* 
	* previewWin.window.scrollTop = scrollTop; // Set the scroll position again
	
	previewWin.window.onbeforeunload = captureNavigation;
	
	function previewWinFocus() {
	console.log('preview window is focused');
	EDITOR.input = false;
	ignoreFileChange = true;
	}
	
	function previewWinBlur() {
	
	ignoreFileChange = false;
	
	if(EDITOR.currentFile) EDITOR.input = true;
	}
	
	
	function captureNavigation() {
	//alertBox("unload!");
	
	if(wysiwygEnabled) wysiwygSSG(); // Disable editing when navigating away (clickon on a link)
	
	}
	
	
	todo: Don't enable WYSIWYG when source file contains <% <? server side scripting or <?JS SSG scripting
	
	todo: Disable WYSIWYG when navigating away (clicking on a link)
	
	
	todo: Make sure the source file is saved!
	* 
	* 			// make sure it's saved, and that the preview is from the last save
	if(!sourceFile.isSaved ) {
	var diff = UTIL.textDiff(srcBodyHtml, main.innerHTML);
	if(diff.inserted.length > 0 || diff.removed.length > 0) {
	alertBox("The page (" + UTIL.getFilenameFromPath(sourceFile.path) + ") will not be editable from WYSIWYG mode because there are unsaved changes in the source file!");
	disableContentEdit();
	return;
	}
	}
	
*/


(function() {
	"use strict";
	
	var wysiwygEditorCounter = 0; // WysiwygEditor instances
	
	var previewInputFired = false;
	var consoleLogOriginal;
	
	var browser = UTIL.checkBrowser();
	
	var oldPreviewWindowPosition;
	var oldPreviewWindowSize;
	var oldCodeWindowPosition;
	var oldCodeWindowSize;
	
	WysiwygEditor = function WysiwygEditor(options) {
		var wysiwygEditor = this;
		
		if(arguments.length != 1) throw new Error("Expected one argument (options object) got " + arguments.length + " arguments/parameters !");
		
		var sourceFile = options.sourceFile;
		var bodyTagSource = options.bodyTagSource;
		var onlyPreview = options.onlyPreview;
		var newWindow = options.newWindow;
		var url = options.url;
		var whenLoaded = options.whenLoaded;
		var compiledSource = options.compiledSource;
		var bodyTagPreview = options.bodyTagPreview;
		var top = options.top;
		var left = options.left;
		var width = options.width;
		var height = options.height;
		
		if(newWindow == window) throw new Error("The window can not be the main window!");
		console.log("newWindow:");
		console.log(newWindow);
		
		if(!url) throw new Error("The preview/WYSIWYG needs an URL or it will not be able to load CSS and JavaScript files! url=" + url);
		
		if(!sourceFile) throw new Error("Expected sourceFile when calling WysiwygEditor");
		
		console.log("new WysiwygEditor! onlyPreview=" + onlyPreview + " sourceFile.path=" + sourceFile.path + " url=" + url + 
		" top=" + top + " left=" + left + " width=" + width + " height=" + height);
		
		if(wysiwygEditor == undefined || wysiwygEditor == window) throw new Error("Call WysiwygEditor with the new keyword! Example: var foo = new WysiwygEditor()");
		
		if(!sourceFile) throw new Error("sourceFile=" + sourceFile);
		wysiwygEditor.sourceFile = sourceFile;
		if(!wysiwygEditor.sourceFile) throw new Error("wysiwygEditor.sourceFile=" + wysiwygEditor.sourceFile);
		
		if(sourceFile.text.indexOf("<?JS") != -1) throw new Error("Source file contains dynamic script tags. Ignore/transform filter not yet implemented.");
		
		wysiwygEditor.reloadAfterSave = false;
		
		wysiwygEditor.url = url;
		wysiwygEditor.bodyTagSource = bodyTagSource || "body";
		wysiwygEditor.bodyTagPreview = bodyTagPreview || "body";
		wysiwygEditor.onlyPreview = (onlyPreview == true);
		wysiwygEditor.whenLoaded = whenLoaded;
		
		wysiwygEditor.captureConsoleLog = options.captureConsoleLog || true;
		
		wysiwygEditor.ignoreSourceFileChange = true;
		
		wysiwygEditor.lineBreak = UTIL.determineLineBreakCharacters(sourceFile.text); 
		// lineBreak convention will change once the WYSIWYG editor has danced / reloaded !
		
		wysiwygEditor.isCompiled = false;
		
		wysiwygEditor.onErrorEvent = options.onErrorEvent;
		
		wysiwygEditor.closed = false; // If the WysiwygEditor has been closed or not
		wysiwygEditor.id = ++wysiwygEditorCounter;
		
		wysiwygEditor.sourceFileIsSaved = true; // Keep track of wheter the source file is saved or not. After the "dance" it's still considered saved, even though it has changed!
		
		wysiwygEditor.isReloading = false;
		
		wysiwygEditor.reCompile = options.reCompile;
		
		wysiwygEditor.sources = [];
		
		if(compiledSource) {
			/*
				If the source code has been "compiled". For example in case of the built in Static Site Generator (SSG) the 
				content of the body element is now in the main element. And header and footer have been added to the body element.
			*/
			wysiwygEditor.isCompiled = true;
			
			var srcHTML = wysiwygEditor.getSourceCodeBody();
			var lbSrc = UTIL.determineLineBreakCharacters(srcHTML);
			var rawMainHtml = getElementContent(compiledSource, wysiwygEditor.bodyTagPreview, lbSrc);
			var lbMain = UTIL.determineLineBreakCharacters(rawMainHtml);
			
			// Sanity check
			if(wysiwygEditor.lineBreak != lbSrc) throw new Error("lbSrc=" + UTIL.lbChars(lbSrc) + " wysiwygEditor.lineBreak=" + UTIL.lbChars(wysiwygEditor.lineBreak));
			
			/*
				
				Optimally we want to support stuff being different inside the main content. For example removed script tags.
				But it has not yet been implemented. Is it even possible !? 
				
			*/
			wysiwygEditor.ignoreTransform = UTIL.textDiff(srcHTML, rawMainHtml);
			
			// Make sure there are no errors
			
			var lbCountSrc = UTIL.occurrences(srcHTML, lbSrc);
			var lbCountMain = UTIL.occurrences(rawMainHtml, lbMain);
			
			var removed = wysiwygEditor.ignoreTransform.removed.length;
			var inserted = wysiwygEditor.ignoreTransform.inserted.length;
			
			if( (lbCountSrc - removed) != (lbCountMain - inserted) ) {
				var lbCountSrcBeforeDiff = UTIL.occurrences(srcHTML, lbSrc);
				var lbCountMainBeforeDiff = UTIL.occurrences(rawMainHtml, lbMain);
				
				console.log("lbCountSrcBeforeDiff=" + lbCountSrcBeforeDiff);
				console.log("lbCountMainBeforeDiff=" + lbCountMainBeforeDiff);
				
				console.log("wysiwygEditor.lineBreak=" + UTIL.lbChars(wysiwygEditor.lineBreak));
				
				console.log("srcHTML=" + UTIL.lbChars(srcHTML));
				console.log("rawMainHtml=" + UTIL.lbChars(rawMainHtml));
				throw new Error("Not same amount of rows! lbCountSrc=" + lbCountSrc + " (" + UTIL.lbChars(lbSrc) + ") lbCountMain=" + lbCountMain + " (" + UTIL.lbChars(lbMain) + ") removed=" + removed + " inserted=" + inserted + "  diff=" + JSON.stringify(wysiwygEditor.ignoreTransform, null, 2));
			}
			
			console.log("wysiwygEditor.ignoreTransform=" + JSON.stringify(wysiwygEditor.ignoreTransform, null, 2));
			
			wysiwygEditor.setStartRow();
			
			
			// Because "ignoreTransform" is not yet supported:
			
			if(wysiwygEditor.ignoreTransform.inserted.length > 0) {
				var msg = "Can not edit the page in WYSIWYG mode because the HTML does not match the source:\n";
				for(var i=0; i< wysiwygEditor.ignoreTransform.inserted.length; i++) {
					msg += "Line " + (wysiwygEditor.ignoreTransform.inserted[i].row + 1 + wysiwygEditor.startRow) + ": ";
					if(wysiwygEditor.ignoreTransform.inserted[i].text == "") msg += " Inserted New line\n"
					else msg += "Inserted: " + UTIL.escapeHtml(wysiwygEditor.ignoreTransform.inserted[i].text) + "\n";
				}
				alertBox(msg);
				return wysiwygEditor.close();
			}
			else if(wysiwygEditor.ignoreTransform.removed.length > 0) {
				var msg = "Can not edit the page in WYSIWYG mode because of:\n";
				for(var i=0; i< wysiwygEditor.ignoreTransform.removed.length; i++) {
					msg += "Line " + (wysiwygEditor.ignoreTransform.removed[i].row + 1 + wysiwygEditor.startRow) + ": ";
					if(wysiwygEditor.ignoreTransform.removed[i].text == "") msg += " Removed New line\n"
					else msg += "Removed: " + UTIL.escapeHtml(wysiwygEditor.ignoreTransform.removed[i].text) + "\n";
				}
				alertBox(msg);
				return wysiwygEditor.close();
			}
		}
		else wysiwygEditor.ignoreTransform = null; // Not compiled
		
		
		
		
		
		if(!wysiwygEditor.bodyExistInSource()) {
			alertBox("bodyTag=" + wysiwygEditor.bodyTagSource + " does not exist in source code!");
			wysiwygEditor.close();
			return;
		}
		
		// Sanity check
		// Note that line breaks are always added as padding around the source!
		var theSource = wysiwygEditor.getSourceCodeBody();
		console.log("theSource=" + UTIL.lbChars(theSource));
		console.log("sourceFile.text=" + UTIL.lbChars(sourceFile.text));
		if(sourceFile.text.indexOf(theSource) == -1) {
			throw new Error("The source's body element can't be found in the source file!");
		}
		
		/*
			Problem: wysiwygEditor.getSourceCodeBody() trims all white space and then ads one line padding ??!
		*/
		
		wysiwygEditor.setStartRow();
		
		if(!newWindow) {
			console.warn("Creating a new window newWindow=" + newWindow + "...");
			
			// We need to create the window right away to prevent it being blocked ...
			EDITOR.createWindow({url: url}, windowCreated);
		}
		else windowCreated(null, newWindow);
		
		function windowCreated(err, newWindow) {
			console.log("wysiwygEditor windowCreated!");
			if(err) throw err;
			
			wysiwygEditor.previewWin = newWindow;
			
			/*
				The newWindow object will not have window.location populated until DOMContentLoaded!!
			*/
			
			if(!newWindow) throw new Error("newWindow=" + newWindow);
			
			if(newWindow.isBlankUrl) {
				if(wysiwygEditor.url) {
					console.log("Attempting reload to load correct window url=" + wysiwygEditor.url + " ...");
					wysiwygEditor.reload(firstLoad);
				}
				else throw new Error("url=" + url + " The window need to have an URL!");
			}
			else {
				wysiwygEditor.attachTo(newWindow, firstLoad);
			}
		}
		
		function firstLoad(err) {
			
			console.log("wysiwygEditor firstLoad!"); // why is it never called !?
			
			if(err) {
				if(wysiwygEditor.whenLoaded) {
					wysiwygEditor.whenLoaded(err);
					wysiwygEditor.whenLoaded = null;
					return;
				}
				else throw err;
			}
			
			wysiwygEditor.hasLoaded = true;
			
			wysiwygEditor.positionate(top, left, width, height);
			
			if(wysiwygEditor.onLoad) wysiwygEditor.onLoad();
			
			// Find "sources"
			console.log("Finding sources ...");
			var html = wysiwygEditor.getPreviewWindowHtml();
			var reSource = /(src|sources?)\s*=\s*(['"])([^'"]+)\2/ig // Very important with the g flag or there will be an endless loop
			var match;
			var sourcesFound = 0;
			var fileName = "";
			while ((match = reSource.exec(html)) != null) {
				fileName = UTIL.getFilenameFromPath(match[3]);
				console.log("Found source: ", match);
				wysiwygEditor.sources.push( fileName );
				if(sourcesFound > 100) { // Prevent endless loop
					console.warn("Found " + sourcesFound + " sources: ", wysiwygEditor.sources);
					break;
				}
			}
			console.log("wysiwygEditor.sources=" + JSON.stringify(wysiwygEditor.sources));
			
			if(wysiwygEditor.whenLoaded) {
				/*
					When calling whenLoaded the constructor might not have returned the new WysiwygEditor object!!
					So make sure it's async.
				*/
				console.log("About to call whenLoaded function for wysiwygEditor" + wysiwygEditor.id);
				setTimeout(function makeitAsync() {
					if(!wysiwygEditor.whenLoaded) throw new Error("wysiwygEditor.whenLoaded has gone away!");
					console.log("Calling whenLoaded function for wysiwygEditor" + wysiwygEditor.id);
					wysiwygEditor.whenLoaded(null, wysiwygEditor.sourceFile, wysiwygEditor.previewWin);
					wysiwygEditor.whenLoaded = null;
				}, 1);
			}
		}
	}
	
	WysiwygEditor.prototype.setStartRow = function setStartRow() {
		var wysiwygEditor = this;
		
		// Figure out on what row the code starts ()
		var sourceFile = wysiwygEditor.sourceFile;
		var srcMatchBody = sourceFile.text.match(/<body.*>(\n|\r\n)/i);
		console.log("srcMatchBody=" + JSON.stringify(srcMatchBody, null, 2));
		
		if(srcMatchBody === null) throw new Error("Can not find body tag in source file=" + sourceFile.path + "\n(The body tag needs to be followed by a line break)");
		
		var srcStartIndex = srcMatchBody.index + srcMatchBody[0].length;
		console.log("srcStartIndex=" + srcStartIndex + " srcMatchBody.index=" + srcMatchBody.index + " srcMatchBody[0].length=" + srcMatchBody[0].length + " srcMatchBody[0]=" + srcMatchBody[0]);
		var tmpCaret = sourceFile.createCaret(srcStartIndex);
		wysiwygEditor.startRow = tmpCaret.row;
		
		if(EDITOR.settings.devMode) {
			
			var sourceCodeBody = wysiwygEditor.getSourceCodeBody();
			
			var srcBodyRows = sourceCodeBody.split(/\n|\r\n/);
			
			// Sanity check
			for (var row=0, rowText=""; row<srcBodyRows.length; row++) {
				rowText = sourceFile.rowText(wysiwygEditor.startRow + row)
				if(srcBodyRows[row] != rowText) {
					
					console.log("Problem with setting wysiwygEditor.startRow=" + wysiwygEditor.startRow + " in source:");
					for(var j = 0; j<sourceFile.grid.length; j++) console.log(j + ": " + sourceFile.rowText(j));
					
					console.log("sourceCodeBody=" + UTIL.lbChars(sourceCodeBody));
					
					console.log("source body html:");
					for (var j=0; j<srcBodyRows.length; j++) console.log(j + ": " + srcBodyRows[j]);
					
					console.log("rowText: " + rowText);
					console.log("srcBodyRows[" + row + "]: " + srcBodyRows[row]);
					throw new Error("Source's body (row=" + row + " of body element) does not match row=" + (wysiwygEditor.startRow + row) + 
					" (wysiwygEditor.startRow=" + wysiwygEditor.startRow + " + row=" + row + " = " + (wysiwygEditor.startRow + row) + " of the source");
				}
			}
		}
	}
	
	WysiwygEditor.prototype.positionate = function positionate(top, left, width, height) {
		var wysiwygEditor = this;
		
		console.log("WysiwygEditor.positionate: top=" + top + " left=" + left + " width=" + width + " height=" + height);
		
		// Decide window width, height and placement ...
		var windowPadding = 0;
		var unityLeftThingy = 10;
		var previeWidth = width || Math.round(screen.width / 3.5) - windowPadding * 2;
		var previewHeight = height || (screen.height - windowPadding * 2);
		var posX = left || (screen.width - previeWidth - windowPadding);
		var posY = top || windowPadding;
		
		var previewWin = wysiwygEditor.previewWin;
		
		try {
			previewWin.focus();
		}
		catch(err) {
			// Probably has been closed!
			throw new Error("Unable to positionate the preview windows because it couln't be focused. Error: " + err.message);
			return;
		}
		
		if(previewWin) {
			
			if(oldPreviewWindowPosition) previewWin.moveTo(oldPreviewWindowPosition.x, oldPreviewWindowPosition.y);
			else previewWin.moveTo(posX, posY);
			
			if(oldPreviewWindowSize) previewWin.resizeTo(oldPreviewWindowSize.x, oldPreviewWindowSize.y);
			else previewWin.resizeTo(previeWidth, previewHeight);
			
			/*
				wysiwygEditor.screenX = previewWin.screenX || previewWin.screenLeft;
				wysiwygEditor.screenY = previewWin.screenY || previewWin.screenTop;
				wysiwygEditor.innerWidth = previewWin.innerWidth;
				wysiwygEditor.innerHeight = previewWin.innerHeight;
			*/
			
			// Resize the editor
			var editorCodeWindow = window; // gui.Window.get();
			
			console.log("oldCodeWindowPosition=", oldCodeWindowPosition);
			if(oldCodeWindowPosition) editorCodeWindow.moveTo(oldCodeWindowPosition.x, oldCodeWindowPosition.y);
			else editorCodeWindow.moveTo(0, 0);
			
			console.log("oldCodeWindowSize=", oldCodeWindowSize);
			if(oldCodeWindowSize) editorCodeWindow.resizeTo(oldCodeWindowSize.x, oldCodeWindowSize.y);
			else editorCodeWindow.resizeTo(screen.width - previeWidth - windowPadding * 2 - unityLeftThingy, screen.height);
		
		}
		else console.warn("previewWin not available when positionateing!")
	}
	
	
	WysiwygEditor.prototype.getCaretPosition = function getCaretPosition() {
		console.warn("WysiwygEditor.getCaretPosition");
		
		var wysiwygEditor = this;
		
		// Returns the (parent) element center x,y coordinate and position in the text node
		
		
		var previewWin = wysiwygEditor.previewWin;
		
		var doc = previewWin.window.document;
		
		var selection = doc.getSelection();
		
		if(!selection) throw new Error("Unable to get selection");
		
		
		/*
			anchorNode/baseNode: Where selection starts
			focusNode/extentNode: Where selection ends
		*/
		
		var baseNode = selection.baseNode ? selection.baseNode : selection.anchorNode
		
		if(!baseNode) {
			console.log("selection:");
			console.log(selection);
			console.log(selection.baseNode);
			console.log(selection.anchorNode);
			//We get no baseNode in Safari when clicking on buttons!!
			//var browser = UTIL.checkBrowser();
			//Chromium also gets no baseNode the first time you click on a button. (it works afterwards)
			var error = new Error("no baseNode! baseNode=" + baseNode + " selection.baseNode=" + selection.baseNode + " selection.anchorNode=" + selection.anchorNode);
			return console.warn(error.message);
			//else throw error; 
		}
		
		if(baseNode.nodeType == Node.TEXT_NODE) {
			var text = baseNode.parentNode.innerText
		}
		
		var pos = getPos(baseNode, false);
		
		if (selection.rangeCount) {
			var selRange = selection.getRangeAt(0);
			var testRange = selRange.cloneRange();
			
			testRange.selectNodeContents(baseNode);
			testRange.setEnd(selRange.startContainer, selRange.startOffset);
			var caretPos = testRange.toString().length;
			
		} else throw new Error("no selection.rangeCount");
		
		var x = Math.round(pos.left + 1);
		var y = Math.round(pos.top + 1);
		
		var element = doc.elementFromPoint(x, y);
		
		if(element == null) {
			pos = getPos(baseNode, true);
			x = Math.round(pos.left + 1);
			y = Math.round(pos.top + 1);
		}
		
		// Use top left corner + 1. just in case the node contains child elements (centering could target a child element)
		return {x: x, y: y, char: caretPos, text: text || baseNode.innerText };
		
		function getPos(baseNode, scrollIntoView) {
			// Make it visible (scrollIntoView), or elementFromPoint(x, y) will fail !
			// The scrolling is however *very* annoying. So only scroll if elementFromPoint would fail
			if(baseNode.nodeType == Node.TEXT_NODE) {
				// Measure the parent node (can't measure text nodes)
				var parentNode = baseNode.parentNode; // The basenode is a text node, select the parent node
				if(scrollIntoView) parentNode.scrollIntoView();
				var pos = parentNode.getBoundingClientRect();
				console.log("parentNode:");
				console.log(parentNode);
				console.log("parentNode nodeType=" + parentNode.nodeType);
			}
			else if(baseNode.nodeType == Node.ELEMENT_NODE) {
				// The node probably don't have any text yet
				if(scrollIntoView) baseNode.scrollIntoView();
				var pos = baseNode.getBoundingClientRect();
				console.log("baseNode:");
				console.log(baseNode);
			}
			else {
				console.log(baseNode);
				throw new Error("Unexpected baseNode nodeType=" + baseNode.nodeType);
			}
			
			return pos;
		}
		
		
	}
	
	WysiwygEditor.prototype.placeCaretInSourceCode = function placeCaretInSourceCode(elementFromContentEditable) {
		var wysiwygEditor = this;
		
		// Attempt to place the caret in the source code
		
		var sourceFile = wysiwygEditor.sourceFile;
		
		var innerText = elementFromContentEditable.innerText;
		if(innerText.length == 0) console.log("Element in content-editable does not contain text.");
		else {
			
			var caretPos = wysiwygEditor.getCaretPosition();
			
			if(!caretPos) return console.warn("Unable to get caret position!");
			
			var index = sourceFile.text.indexOf(innerText);
			
			if(index == -1 && caretPos.text != undefined) {
				// Moving the caret using keyboard arrows always seem to return the body element as target.
				// caretPos might have the right element!
				if(caretPos.text.length > 0) innerText = caretPos.text;
				index = sourceFile.text.indexOf(innerText);
			}
			
			if(index == -1) {
				// Probably because you clicked on the body element
				console.log("Unable to find the string innerText='" + UTIL.lbChars(innerText) + "' in the source file: " + sourceFile.path);
			}
			else {
				
				if(sourceFile.text.indexOf(innerText, index + 1) != -1) console.log("Source file contains more then one occurencies of innerText='" + innerText + "'");
				else {
					// The source file only contains one instance of the text string, it's safe to assume that's where the caret should be placed!
					
					console.log("index=" + index + " caretPos.char=" + caretPos.char + " ");
					
					index += caretPos.char;
					
					return sourceFile.moveCaretToIndex(index);
					
				}
			}
		}
		
		// Failed to get position based on text, try outerHTML
		var outerHTML = elementFromContentEditable.outerHTML;
		var index = sourceFile.text.indexOf(outerHTML);
		
		if(index == -1) console.log("Unable to find outerHTML='" + outerHTML + "' in the source file: " + sourceFile.path);
		else {
			
			if(sourceFile.text.indexOf(outerHTML, index + 1) != -1) console.log("Source file contains more then one occurencies of outerHTML='" + outerHTML + "'");
			else return sourceFile.moveCaretToIndex(index);
			
		}
	}
	
	WysiwygEditor.prototype.placeCaret = function placeCaret(x, y, charPos) {
		var wysiwygEditor = this;
		console.log("placeCaret: x=" + x + " y=" + y + " charPos=" + charPos);
		
		var previewWin = wysiwygEditor.previewWin;
		
		var doc = previewWin.window.document;
		var element = doc.elementFromPoint(x, y);
		
		if(element == null) { // Will probably cause the caret to be placed at the top of the document which is very annoying!
			
			console.warn("Unable to get element on x=" + x + " y=" + y);
			alertBox("Unable to get element on x=" + x + " y=" + y + " in order to place caret in contentEditable!");
			
			// Take focus away from the contentEditable
			var body = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
			body.blur();
			// The above takes focus away from the contentEditable
			// Keep writing in editors text area !?
			// But how do we get focus on the editor window so it can detect key strokes !?
			// https://stackoverflow.com/questions/6910278/how-to-return-focus-to-the-parent-window-using-javascript
			var goBack = previewWin.window.open('', 'editor'); // editor is window.name
			goBack.focus();
			
			// Additional key strokes should now register in the editor (code area)
			// The location of the caret might be a bit off though
			// If we show an alert EDITOR.input will be set to false!
			// So don't give input in order to prevent additional characters to be inserted.
			//EDITOR.input = true;
			
			return false;
		}
		else {
			if(element.childNodes.length > 0) {
			var childNode = element.childNodes[0]; // The text node
			}
			else {
				console.warn("Unable to find text node !?");
				console.log(element);
				var childNode = element;
			}
			
			return wysiwygEditor.placeCaretOnTextNode(childNode, charPos);
			
		}
	}
	
	WysiwygEditor.prototype.placeCaretOnTextNode = function placeCaretOnTextNode(node, charPos) {
		var wysiwygEditor = this;
		var previewWin = wysiwygEditor.previewWin;
		
		console.warn("placing caret on index " + charPos + " on (node ? " + !!node + "):");
		console.log(node);
		
		var doc = previewWin.window.document;
		var range = doc.createRange();
		
		if(browser=="Firefox" && node.tagName == "BR") {
			// Firefox can set the caret position, but it's not possible to input/write after the caret has been set in a br element
			node = node.parentNode; // Most likely a p element
		}
		
		try {
			range.setStart(node, charPos);
		}
		catch(e) {
			console.warn(e.message);
			return false;
		}
		
		range.collapse(true);
		
		var win = previewWin.window;
		var sel = win.getSelection();
		
		if(sel) {
		sel.removeAllRanges();
		sel.addRange(range);
		}
		else console.warn("sel=" + sel);
		
		return true;
		
	}
	
	WysiwygEditor.prototype.sourceFileChange = function sourceFileChange(file, type, characters, caretIndex, row, col) {
		var wysiwygEditor = this;
		
		console.log("WysiwygEditor.sourceFileChange type=" + type + " ignoreSourceFileChange=" + wysiwygEditor.ignoreSourceFileChange + " row=" + row + " wysiwygEditor.startRow=" + wysiwygEditor.startRow);
		
		/*
			Problem: Can not change the file in a fileChange event or it would create an endless loop
			Which means we can not sanitize on source code changes,
			which also means we can not sanitize on content-editable changes!
			
			Solution: ignoreSourceFileChange variable, and only sanitize on content-editable changes
		*/
		if(wysiwygEditor.ignoreSourceFileChange) return true;
		
		if(!wysiwygEditor.sourceFile) throw new Error("wysiwygEditor.sourceFile=" + wysiwygEditor.sourceFile);
		
		var sourceFile = wysiwygEditor.sourceFile;
		
		if(!file) throw new Error("file=" + file);
		if(!sourceFile) throw new Error("sourceFile=" + sourceFile);
		
		if(file != sourceFile) return true;
		
		if(type == "reload" && wysiwygEditor.isCompiled) return wysiwygEditor.close();
		
		wysiwygEditor.sourceFileIsSaved = false;
		
		if(!wysiwygEditor.bodyExistInSource()) return true;
		
		var previewWin = wysiwygEditor.previewWin;
		
		try {
			var doc = previewWin.window.document;
		}
		catch(err) {
			console.error(err);
			// Most likely the user has closed the preview window
			wysiwygEditor.close();
			return;
		}
		
		wysiwygEditor.setStartRow(); // In case more rows was added above the body tag
		
		if(row < wysiwygEditor.startRow) {
			// Edited above the body.
			
			if(wysiwygEditor.isCompiled) return wysiwygEditor.close();
			
			//wysiwygEditor.reload();
			wysiwygEditor.reloadAfterSave = true;
			console.log("Will reload after next save ...");
			
			return;
		}
		
		console.log("Update wysiwyg for file.path=" + file.path);
		
		// if type==reload need to redo dance
		
		//if(updatePreviewOnChange) clearTimeout(updatePreviewOnChange);
		
		// Delay updating so that we do not render broken tags etc and save some battery
		//updatePreviewOnChange = setTimeout(function() {
		
		var srcHTML = wysiwygEditor.getSourceCodeBody();
		
		
		wysiwygEditor.setContentEditableBody(srcHTML);
		
		// Setting innerHTML makes the caret disappear. Place it again ...
		// Find out the tag and if we are near text, then find the tag in content-editable
		
		var index = file.caret.index;
		
		var leftChar = index > 0 ? file.text.charAt(index-1) : "";
		var rightChar = index < file.text.length ? file.text.charAt(index) : "";
		
		var regexText = /[^\r\n<>"']/;
		
		console.log("Attempting to place caret on WYSIWYG ...");
		if(leftChar.match(regexText) ==  null && rightChar.match(regexText) == null) console.log("No text next to file.caret. leftChar=" + leftChar + " rightChar=" + rightChar + "");
		else {
			
			var leftLeftTag = file.text.lastIndexOf("<", index-1);
			if(leftLeftTag == -1) console.log("No left <tag found left of the file.caret");
			else {
				
				var firstSpaceAfterLeftTag = file.text.indexOf(" ", leftLeftTag);
				var firstRightTagAfterLeftTag = file.text.indexOf(">", leftLeftTag);
				
				if(firstRightTagAfterLeftTag == -1) console.log("No right> tag found after left tag, left of file.caret");
				else {
					
					console.log("leftLeftTag=" + leftLeftTag + " (" + file.text.substring(leftLeftTag, index) + ")");
					console.log("firstRightTagAfterLeftTag=" + firstRightTagAfterLeftTag + " (" + file.text.substring(leftLeftTag, firstRightTagAfterLeftTag+1) + ")");
					
					if(firstSpaceAfterLeftTag != -1 && firstSpaceAfterLeftTag < firstRightTagAfterLeftTag) var elementName = file.text.substring(leftLeftTag+1, firstSpaceAfterLeftTag);
					else if(firstRightTagAfterLeftTag != -1) var elementName = file.text.substring(leftLeftTag+1, firstRightTagAfterLeftTag);
					else throw new Error("firstSpaceAfterLeftTag=" + firstSpaceAfterLeftTag + " firstRightTagAfterLeftTag=" + firstRightTagAfterLeftTag);
					
					console.log("elementName=" + elementName);
					
					var rightLeftTag = file.text.indexOf("<", index);
					if(rightLeftTag == -1) console.log("No <left tag on the right side of the file.caret");
					else {
						var text = file.text.substring(firstRightTagAfterLeftTag+1, rightLeftTag);
						
						console.log("rightLeftTag=" + rightLeftTag + " (" + file.text.substring(index, rightLeftTag) + ")");
						
						console.log("text=" + text);
						
						var charPosInText = index - firstRightTagAfterLeftTag - 1;
						
						console.log("debug charPos: " + text.substr(0, charPosInText) + "|" + text.substr(charPosInText));
						
						var elements = doc.getElementsByTagName(elementName);
						
						var node;
						for(var i=0; i<elements.length; i++) {
							if(elements[i].textContent == text) {
								node = elements[i];
								break;
							}
						}
						if(!node) console.log("Unable to find element " + elementName + " containing text:" + text);
						else {
							var textNode = node.childNodes[0];
							
							console.log("Placing caret in node:");
							console.log(textNode);
							
							wysiwygEditor.placeCaretOnTextNode(textNode, charPosInText);
							
						}
					}
				}
			}
		}
		
		return true;
	}
	
	WysiwygEditor.prototype.anyFileSaved = function anyFileSaved(file, saveEventCallback) {
		var wysiwygEditor = this;
		
		// note: This function MUST call back because it's a saveFile event listener
		
		if(!file) return saveEventCallback(new Error("file=" + file));
		
		console.log("WysiwygEditor.anyFileSaved: " + file.path);
		
		if(file == wysiwygEditor.sourceFile) wysiwygEditor.sourceFileIsSaved = true;
		
		if(wysiwygEditor.reloadAfterSave && wysiwygEditor.sourceFile == file) {
			wysiwygEditor.reloadAfterSave = false;
			
			wysiwygEditor.reload(function(err) {
				return saveEventCallback(err);
});
			return;
		}
		
		var previewWin = wysiwygEditor.previewWin;
		
		try {
			var doc = previewWin.window.document;
		}
		catch(err) {
			console.error(err);
			// Most likely the user has closed the preview window
			wysiwygEditor.close();
			return saveEventCallback(null);
		}
		
		//console.log("Checking for CSS file ...");
		var fileExt = UTIL.getFileExtension(file.path);
		var fileName = UTIL.getFilenameFromPath(file.path);
		
		if(fileExt == "css") {
			var win = wysiwygEditor.previewWin;
			if(!win) throw new Error("Unable to get wysiwygEditor window! win=" + win);
			var doc = win.document;
			if(!doc) throw new Error("Unable to get document from wysiwygEditor window! doc=" + doc);
			
			var links = doc.getElementsByTagName('link');
			for (var i=0; i<links.length; i++) {
				if(links[i].getAttribute("rel").toLowerCase().indexOf("stylesheet") != -1) {
					//console.log(links[i].href);
					if(links[i].href.indexOf(fileName) != -1) {
						
						// Remove the link and append a style element instead
						
						var parent = links[i].parentNode;
						
						var style = document.createElement("style")
						style.setAttribute("href", links[i].href);
						style.innerText = file.text;
						
						parent.insertBefore(style, links[i]);
						parent.removeChild(links[i]);
						
						console.log("Replaced link css with style for " + fileName);
						
						return saveEventCallback(null);
						
					}
				}
			}
			// Update style
			var style = doc.getElementsByTagName('style');
			for (var i=0, href; i<style.length; i++) {
				href = style[i].getAttribute("href");
				if(href) {
					if(href.indexOf(fileName) != -1) {
						style[i].innerText = file.text;
						console.log("Replaced style content for " + fileName);
						return saveEventCallback(null);
					}
				}
			}
			
			return saveEventCallback(null);
			//console.log("fileName=" + fileName + " was not found on the page in preview.");
		}
		else if(fileExt == "js") {
			/*
				It's not a good idea to reload just the JS unless the file's are designed to be able to do that (like plugins in jzedit)
				As variables might still hold state. Old html elements would still linger, etc.
				
				It's better to store state in web storage. For example localStorage. And have the "app" go to where you last left when you refresh.
				
				Check if the file was any of the <script elements. and if so Reload!
			*/
			
			var scripts = doc.getElementsByTagName('script');
			for (var i=0; i<scripts.length; i++) {
				if(scripts[i].src.indexOf(fileName) != -1) {
					wysiwygEditor.reload(function(err) {
						if(err) alertBox(err.message);
						saveEventCallback(null);
					});
					return;
				}
			}
			
			return saveEventCallback(null)
		}
		else if( wysiwygEditor.sources.indexOf(fileName) != -1 ) {
			console.log("Found fileName=" + fileName + " in wysiwygEditor.sources");
			// Some source file was saved, so reload the preview page
			wysiwygEditor.reload(function(err) {
				if(err) alertBox(err.message);
				saveEventCallback(null);
			});
		}
		
		else return saveEventCallback(null);
	}
	
	WysiwygEditor.prototype.previewKeyDown = function previewKeyDown(keyDownEvent) {
		var wysiwygEditor = this;
		
		console.log("previewKeyDown! EDITOR.input=" + EDITOR.input + " keyDownEvent.keyCode=" + keyDownEvent.keyCode + " keyDownEvent.ctrlKey=" + keyDownEvent.ctrlKey);
		var key_S = 83;
		
		// It seems you can only know if Ctrl was pressed on keydown (not on keyup) !
		
		if(!EDITOR.input && keyDownEvent.keyCode == key_S && keyDownEvent.ctrlKey) {
			// The user hit Ctrl+S while in the preview window
			EDITOR.saveFile(wysiwygEditor.sourceFile);
			
			// Try to prevent the default "save document"
			keyDownEvent.preventDefault();
			return false;
		}
		
		return true;
	}
	
	WysiwygEditor.prototype.previewKeyup = function previewKeyup(keyUpEvent) {
		var wysiwygEditor = this;
		console.log("previewKeyup! EDITOR.input=" + EDITOR.input + " previewInputFired=" + previewInputFired + " keyUpEvent.keyCode=" + keyUpEvent.keyCode + "");
		
		//keyUpEvent = keyUpEvent || window.event;
		
		var key_S = 83;
		
		// Do not place caret in source code now if text was inserted (we'll do that later)
		// Only place caret if keyboard arrow keys was used to move the caret
		console.log("(keyUpEvent.keyCode=" + keyUpEvent.keyCode);
		if(!EDITOR.input && (keyUpEvent.keyCode == 37 || keyUpEvent.keyCode == 38 || keyUpEvent.keyCode == 39 || keyUpEvent.keyCode == 40)) {
			wysiwygEditor.placeCaretInSourceCode(keyUpEvent.target);
		}
		// Internet Explorer doesn't fire change events on content-editable
		else if(!previewInputFired) {
			wysiwygEditor.previewInput();
			previewInputFired = false;
		}
		
		return true;
	}
	
	WysiwygEditor.prototype.previewMouseup = function previewMouseup(e) {
		var wysiwygEditor = this;
		
		console.log("previewMouseup!");
		
		//UTIL.objInfo(e.target);
		
		var file = EDITOR.currentFile;
		
		// Safari blurs the editor before the mouseup is triggered, while other browsers does not
		// Should we always place the caret !?
		if(file == wysiwygEditor.sourceFile) wysiwygEditor.placeCaretInSourceCode(e.target);
		//else console.log("EDITOR.input=" + EDITOR.input + " file==wysiwygEditor.sourceFile?" + (file==wysiwygEditor.sourceFile) + "");
		
		if(file.path.slice(-3) == "css") {
			console.log("Current file is a CSS file!");
			var fileName = UTIL.getFilenameFromPath(file.path);
			var reStyle = new RegExp('<link.*href=.*' + fileName, "i");
			var win = wysiwygEditor.previewWin.window;
			var doc = win.document;
			var styleSheets = doc.styleSheets;
			var styleSheetFound = false;
			
			for (var i=0; i<styleSheets.length; i++) {
				if(styleSheets[i].href && styleSheets[i].href.indexOf(fileName) != -1) {
					styleSheetFound = true;
					break;
				}
			}
			
			// The stylesheet might have been replaced with a <style> element
			var styleElements = doc.getElementsByTagName("style");
			for (var i=0; i<styleElements.length; i++) {
				if(styleElements[i].getAttribute("href").indexOf(fileName) != -1) {
					styleSheetFound = true;
					break;
				}
			}
			
			if(!styleSheetFound) {
				console.log("fileName=" + fileName + " doesn't seem to be part of any stylesheet!");
				console.log(styleSheets);
				return;
			}
			
			
			
			// The currently opened css file is in the web document!
			// Go to the related place in the css file
			
			console.log("Current file is a stylesheet to the file in preview!");
			
			var cssRules = css(e.target);
			
			console.log("cssRules: " + cssRules);
			
			var rule = "";
			var index = 0;
			for (var i=0; i<cssRules.length; i++) {
				rule = cssRules[i].slice(0, cssRules[i].indexOf("{"));
				index = file.text.indexOf(rule);
				if(index != -1) {
					var loc = file.rowFromIndex(index);
					//alertBox(JSON.stringify(loc));
					file.scrollTo(undefined, loc.row);
					break;
				}
			}
			
		}
		
		
		function css(el) {
			var sheets = doc.styleSheets, ret = [];
			el.matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector
			|| el.msMatchesSelector || el.oMatchesSelector;
			for (var i in sheets) {
				var rules = sheets[i].rules || sheets[i].cssRules;
				for (var r in rules) {
					if (el.matches(rules[r].selectorText)) {
						ret.push(rules[r].cssText);
					}
				}
			}
			return ret;
		}
		
		function getCssSearchArray(el) {
			if(!el) return null;
			
			var findStyleLocation = [];
			var elClass = el.getAttribute("class");
			var nodeName = el.nodeName;
			var combos = [];
			combos.push(nodeName);
			if(elClass.indexOf(" ") != -1) {
				// It has many classes
				var elClassArr = elClass.split(" ");
				var longStr = nodeName;
				for (var i=0; i<elClassArr.length; i++) {
					combos.push(nodeName + "." + className);
					longStr += "." + className;
				}
				combos.push(longStr);
			}
			else {
				combos.push(nodeName + "." + className);
			}
			
			findStyleLocation.push(combos);
			
			if(el.parentElement) {
				var parent = getCssSearchArray(el.parentElement);
				if(parent != null) findStyleLocation.concat(parent);
			}
			
			return findStyleLocation;
		}
	}
	
	WysiwygEditor.prototype.previewSelectionchange = function previewSelectionchange(e) {
		var wysiwygEditor = this;
		console.log("previewSelectionchange!");
		if(!EDITOR.input) wysiwygEditor.placeCaretInSourceCode(e.target);
	}
	
	WysiwygEditor.prototype.previewPaste = function previewPaste(e, doc) {
		var wysiwygEditor = this;
		
		console.log("previewPaste!");
		
		var html = e.clipboardData.getData('text/html');
		
		e.preventDefault();
		
		var cleaned = html;
		
		cleaned = sanitizeOfficeDoc(cleaned);
		
		cleaned = sanitize(cleaned, wysiwygEditor.sourceFile.lineBreak);
		
		var aShowDefaultUI = true;
		doc.execCommand("insertHTML", aShowDefaultUI, cleaned);
		
	}
	
	WysiwygEditor.prototype.previewInput = function previewInput(inputEvent) {
		console.time("previewInput");
		var wysiwygEditor = this;
		
		// Called every time the contenteditable is updated
		// If nothing happends, check the debug/console for the wysiwyg window! (set "toolbar": true, in package.json)
		
		console.warn("previewInput!");
		
		
		previewInputFired = true;
		
		var sourceFile = wysiwygEditor.sourceFile;
		var previewWin = wysiwygEditor.previewWin;
		var ignoreTransform = wysiwygEditor.ignoreTransform;
		var placeCaretSuccess = true;
		
		if(!previewWin) throw new Error("The content-editable window is gone!");
		
		sourceFile.checkGrid();
		
		wysiwygEditor.ignoreSourceFileChange = true; // Ignore the change event for the changes we will now make to the source file ...
		
		if(!sourceFile) throw new Error("sourceFile=" + sourceFile)
		else if(!EDITOR.files.hasOwnProperty(sourceFile.path)) alertBox("The source for the file being previewed is not opened!")
		else {
			
			if(sourceFile != EDITOR.currentFile) {
				// alertBox("The file in the editor is not the same as the file being previewed! sourceFile=" + sourceFile.path + " EDITOR.currentFile=" + EDITOR.currentFile.path)
				EDITOR.showFile(sourceFile, false);
			}
			
			// Compare the source codes ...
			
			var srcBodyHtml = wysiwygEditor.getSourceCodeBody();
			
			var prevBody = previewWin.window.document.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
			var prevBodyHtml = wysiwygEditor.getContentEditableCode();
			
			
			
			/*
				
				problem 1: Contenteditable produce mangled/garbled HTML code. 
				Contenteditbale change stuff all over the place, for example inserts <tbody> in tables
				
				solution: Beautify the code!
				
				problem 2: The beautifier touches even more stuff, amplifying the nr 1 problem
				solution 2: insert stuff like <tbody> *before* going into WYSIWYG mode - eg "dance"
				
			*/
			
			var sanitized = sanitize(prevBodyHtml, wysiwygEditor.lineBreak);
			// note: We want to make as little sanitation as possible, 
			// as resetting the whole content-editable content at every key-stroke will feel laggy.
			if(sanitized == prevBodyHtml) console.log("No white space sanitiaztion needed"); 
			else {
				
				console.log("prevBodyHtml=\n" + UTIL.debugWhiteSpace(prevBodyHtml) + "\n");
				console.log("sanitized=\n" + UTIL.debugWhiteSpace(sanitized) + "\n");
				console.log("diff=" + JSON.stringify(UTIL.textDiff(prevBodyHtml, sanitized)));
				
				/*
					Problem: contenteditable will lose the caret when the html is updated, 
					this is verry annoying when typing as the cursor jumps
					
					solution: Set the caret again using the selection API 
				*/
				
				var caretPosition = wysiwygEditor.getCaretPosition();
				
				wysiwygEditor.setContentEditableBody(sanitized);
				
				prevBodyHtml = wysiwygEditor.getContentEditableCode();
				
				console.log("caretPosition: " + JSON.stringify(caretPosition));
				
				if(caretPosition) {
					placeCaretSuccess = wysiwygEditor.placeCaret(caretPosition.x, caretPosition.y, caretPosition.char);
					console.log("placeCaretSuccess=" + placeCaretSuccess);
				}
				
				console.log("Sanitized garbage from WYSIWYG");
				
			}
			
			//console.log("srcBodyHtml=" + UTIL.lbChars(srcBodyHtml));
			//console.log("prevBodyHtml=" + UTIL.lbChars(prevBodyHtml));
			
			// Compare the source with the editable preview
			var diff = UTIL.textDiff(srcBodyHtml, prevBodyHtml);
			
			/*
				Problem: When ignoreTransform removes a diff ...
				
			*/
			
			var ignored = 0;
			if(!ignoreTransform) console.log("Nothing in ignoreTransform");
			else {
				console.log("ignoreTransform:");
				console.log(ignoreTransform);
				if(ignoreTransform.inserted.length > 0) {
					for(var i=ignoreTransform.inserted.length-1; i>=0; i--) { // Reverse for loop to not mess up array indexes
						for(var j=0; j<diff.inserted.length; j++) {
							if(diff.inserted[j].text == ignoreTransform.inserted[i].text) {
								//if(diff.inserted[j].text != ignoreTransform.inserted[i].text) throw new Error("ignoreTransform edited text on row=" + diff.inserted[j].text + " doesn't match! diff=" + diff.inserted[j].text + " ignore=" + ignoreTransform.inserted[i].text);
								diff.inserted.splice(j, 1);
								console.log("Ignoring edited text: row=" + ignoreTransform.inserted[i].row + " text=" + ignoreTransform.inserted[i].text + "");
								ignored++;
								break;
							}
						}
					}
					if(ignored != (ignoreTransform.inserted.length-1)) console.warn("Only ignored " + ignored + " out of " + (ignoreTransform.inserted.length-1) + " ignoreTransform.inserted=" + JSON.stringify(ignoreTransform.inserted, null, 2) + " diff.inserted=" + JSON.stringify(diff.inserted, null, 2));
				}
				
				if(ignoreTransform.removed.length > 0) {
					ignored = 0;
					for(var i=ignoreTransform.removed.length-1; i>=0; i--) { // Reverse for loop to not mess up array indexes
						for(var j=0; j<diff.removed.length; j++) {
							if(diff.removed[j].text == ignoreTransform.removed[i].text) {
								//if(diff.removed[j].text != ignoreTransform.removed[i].text) throw new Error("ignoreTransform original text on row=" + diff.removed[j].text + " doesn't match! diff=" + diff.removed[j].text + " ignore=" + ignoreTransform.removed[i].text);
								diff.removed.splice(j, 1);
								console.log("Ignoring original text: row=" + ignoreTransform.removed[i].row + " text=" + ignoreTransform.removed[i].text + "");
								break;
							}
						}
					}
					if(ignored != (ignoreTransform.removed.length-1)) console.warn("Only ignored " + ignored + " out of " + (ignoreTransform.removed.length-1) + " ignoreTransform.removed=" + JSON.stringify(ignoreTransform.inserted, null, 2) + " diff.removed=" + JSON.stringify(diff.inserted, null, 2));
				}
			}
			
			
			var startRow = wysiwygEditor.startRow;
			
			console.log("source startRow=" + startRow + "");
			
			var replacedLine = false;
			var linesToBeRemoved = [];
			var row = -1;
			var col = -1;
			var text = "";
			
			//console.log("diff.removed=" + JSON.stringify(diff.removed, null, 2));
			//console.log("diff.inserted=" + JSON.stringify(diff.inserted, null, 2));
			
			//console.log("source:" + UTIL.lbChars(wysiwygEditor.sourceFile.text));
			//console.log("srcBodyHtml: " + UTIL.lbChars(srcBodyHtml));
			//console.log("prevBodyHtml: " + UTIL.lbChars(prevBodyHtml));
			
			//console.log("source before:");
			//for(var j = 0; j<sourceFile.grid.length; j++) console.log(j + ": " + sourceFile.rowText(j));
			
			// Apply the transformation to the source code ...
			var removedText = "";
			for(var i=0; i<diff.removed.length; i++) {
				console.log("i=" + i + " diff.removed.length=" + diff.removed.length);
				// Remove the text on the line, but do not remove the line (yet)
				row = diff.removed[i].row + startRow;
				
				if(row >= sourceFile.grid.length) {
					throw new Error("row=" + row + " sourceFile.grid.length=" + sourceFile.grid.length + " diff.removed=" + JSON.stringify(diff.removed, null, 2));
				}
				
				if(sourceFile.rowText(row).trim() != diff.removed[i].text.trim()) {
					
					// startRow wrong !?
					console.log("startRow=" + startRow);
					
					for(var j = 0; j<sourceFile.grid.length; j++) console.log(j + ": " + sourceFile.rowText(j));
					
					var rowsPrewBodyHtml = prevBodyHtml.split(/\n|\r\n/);
					console.log("prevBodyHtml:");
					for(var j = 0; j<rowsPrewBodyHtml.length; j++) console.log(j + ": " + rowsPrewBodyHtml[j]);
					console.log("sourceFile:");
					for(var j = 0; j<sourceFile.grid.length; j++) console.log(j + ": " + sourceFile.rowText(j));
					
					console.log("source (row=" + row + ")=" + sourceFile.rowText(row).trim());
					console.log("remove=" + diff.removed[i].text.trim());
					console.log("source code body before:" + UTIL.lbChars(srcBodyHtml));
					console.log("source code body after:" + wysiwygEditor.getSourceCodeBody());
					console.log("prevBodyHtml=" + UTIL.lbChars(prevBodyHtml));
					console.log("diff=" + JSON.stringify(diff, null, 2));
					console.log("ignoreTransform=" + JSON.stringify(wysiwygEditor.ignoreTransform, null, 2));
					
					
					
					throw new Error("Text on row=" + row + " doesn't match text to be removed! (see console log)");
					
				}
				
				removedText = sourceFile.removeAllTextOnRow(row);
				
				if(removedText.match(/\n|\r\n/)) throw new Error("Did not expect a new line character to be removed! removedText=" + UTIL.lbChars(removedText));
				
				if(removedText.trim() != diff.removed[i].text) throw new Error("Text missmatch!\n" + UTIL.lbChars(removedText) + " = removedText\n" + UTIL.lbChars(diff.removed[i].text) + " = diff.removed[" + i + "].text");
				
				console.log("Removed all text on row=" + row + ": " + diff.removed[i].text);
				
				// Is there a line that will replace it?
				replacedLine = false;
				for(var j=diff.inserted.length-1; j>=0; j--) { // There can be many inserts on the same line
					console.log("i=" + i + " j=" + j + " diff.inserted.length=" + diff.inserted.length);
					if(diff.inserted[j].row == diff.removed[i].row) {
						
						// Insert the replacing line
						text = diff.inserted[j].text;
						
						if(!replacedLine) sourceFile.insertTextOnRow(text, row)
						else sourceFile.insertTextRow(text, row);
						
						console.log("Inserting (replacing) row=" + row + " text=" + text);
						
						// textLineDiff
						col= UTIL.textDiffCol(diff.removed[i].text, diff.inserted[j].text);
						
						if(diff.inserted[j].text.length > diff.removed[i].text.length) col += (diff.inserted[j].text.length - diff.removed[i].text.length);
						
						// Move the file caret to the column where the actual change happened
						sourceFile.caret.row = row;
						sourceFile.caret.col = col;
						
						sourceFile.fixCaret();
						
						replacedLine= true;
						diff.inserted.splice(j, 1);
						//j--;
					}
				}
				
				if(!replacedLine) {
					linesToBeRemoved.push(diff.removed[i].row);
				}
				
				//console.log("i=" + i + " diff.removed.length=" + diff.removed.length);
			}
			
			// Add lines left to be inserted before removing removed lines (backwards)
			
			for(var i=diff.inserted.length-1; i>-1; i--) {
				
				// Insert the line
				row = diff.inserted[i].row + startRow;
				text = diff.inserted[i].text;
				sourceFile.insertTextRow(text, row);
				
				console.log("Inserted text on row=" + row + " text=" + text);
				
				// Increment rows in linesToBeRemoved because this insert pushed them down
				for(var j=0; j<linesToBeRemoved.length; j++) {
					if(linesToBeRemoved[j] == diff.inserted[i].row) throw new Error("Insert on a line that is about the be removed! diff.inserted=" + JSON.stringify(diff.inserted) + " linesToBeRemoved=" + JSON.stringify(linesToBeRemoved));
					
					if(linesToBeRemoved[j] > diff.inserted[i].row) linesToBeRemoved[j]++;
				}
			}
			
			// Remove lines to be removed (backwards)
			for(var i=linesToBeRemoved.length-1; i>-1; i--) {
				row = linesToBeRemoved[i] + startRow;
				text = sourceFile.removeRow(row);
				console.log("Removed row=" + row + " text=" + text);
			}
			
			//console.log("source after:" + UTIL.lbChars(wysiwygEditor.sourceFile.text));
			//console.log("source after:");
			//for(var j = 0; j<sourceFile.grid.length; j++) console.log(j + ": " + sourceFile.rowText(j));
			
			//console.log("source code body after:" + UTIL.lbChars(wysiwygEditor.getSourceCodeBody()));
			
			// after the transformation: Update what should be ignored again ? Nope
			
		}
		
		wysiwygEditor.ignoreSourceFileChange = false;
		
		
		
		if(RUNTIME == "nw.js") {
			// Show the editor window
			var gui = require('nw.gui');
			var win = gui.Window.get();
			win.show();
		}
		else {
			// We don't want to take away focus from the content-editable
		}
		
		if(placeCaretSuccess) {
		// Focus the content-edit window
		wysiwygEditor.previewWin.focus();
		EDITOR.input = false;
		}
		
		console.timeEnd("previewInput");
		
		sourceFile.checkGrid();
		
	}
	
	
	WysiwygEditor.prototype.close = function close(closeWindow) {
		// Clean up and close the window ...
		
		var wysiwygEditor = this;
		
		console.log("About to close wysiwygEditor" + wysiwygEditor.id + " wysiwygEditor.closed=" + wysiwygEditor.closed);
		
		if(wysiwygEditor.closed) return console.warn("wysiwygEditor" + wysiwygEditor.id + " has already been closed!");
		
		if(wysiwygEditor.fileChangeEventListener) EDITOR.removeEvent("fileChange", wysiwygEditor.fileChangeEventListener);
		if(wysiwygEditor.afterFileSaveEventListener) EDITOR.removeEvent("afterSave", wysiwygEditor.afterFileSaveEventListener);
		if(wysiwygEditor.autoCompleteListener) EDITOR.removeEvent("autoComplete", wysiwygEditor.autoCompleteListener);
		
		/*
			body.onmouseup = null;
			body.onkeyup = null;
			body.onselectionchange = null;
			body.onpaste = null;
			body.oninput = null;
		*/
		
		wysiwygEditor.ignoreSourceFileChange = true;
		
		wysiwygEditor.closed = true;
		// Closing the window will also call wysiwygEditor.close()
		if(closeWindow !== false && wysiwygEditor.previewWin) wysiwygEditor.previewWin.close();
		
		if(wysiwygEditor.onClose) {
			wysiwygEditor.onClose();
			wysiwygEditor.onClose = null;
		}
		
		console.warn("WysiwygEditor" + wysiwygEditor.id + " closed!");
	}
	
	WysiwygEditor.prototype.isOpen = function isOpen() {
		var wysiwygEditor = this;
		
		// Probably have to check for something more!
		
		if(wysiwygEditor.previewWin) return true;
		else return false;		
		
	}
	
	WysiwygEditor.prototype.getPreviewWindowHtml = function getPreviewWindowHtml() {
		// Returns everyting in the preview window
		// Useful for debugging purpuses
		var wysiwygEditor = this;
		var win = wysiwygEditor.previewWin.window;
		var doc = win.document; // previewWin.document is not available in nw.js gui
		
		if(doc.documentElement) doc = doc.documentElement;
		
		var prewHtml = doc.innerHTML;
		
		console.log("prewHtml:" + prewHtml);
		
		return prewHtml;
	}
	
	WysiwygEditor.prototype.getContentEditableCode = function getContentEditableCode() {
		var wysiwygEditor = this;
		
		/*
			innerHTML will *sometimes* include the line-break after <body> and before </body> !
			And it *sometimes* removes the same line breaks ...
			
		*/
		
		// 
		
		var win = wysiwygEditor.previewWin.window;
		var doc = win.document; // previewWin.document is not available in nw.js gui
		var body = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
		//console.log(body);
		
		if(!body) {
			console.log(win);
			console.log(doc);
			throw new Error("Unable to find body element bodyTagPreview=" + wysiwygEditor.bodyTagPreview + " in doc.innerHTML=" + doc.innerHTML);
		}
		
		var html = body.innerHTML;
		//var prewHTML = wysiwygEditor.lineBreak + html.trim() + wysiwygEditor.lineBreak;
		var prewHTML = html;
		
		//var html = wysiwygEditor.getPreviewWindowHtml();
		//var prewHTML = getElementContent(html, wysiwygEditor.bodyTagPreview, wysiwygEditor.lineBreak);
		
		// Sanity check:
		if(wysiwygEditor.lineBreak == "\n" && html.indexOf("\r") != -1) {
			throw new Error("wysiwygEditor.lineBreak=" + UTIL.lbChars(wysiwygEditor.lineBreak) + " but html contains CR!");
		}
		
		return prewHTML;	
		
		
		function removeHeadLineBreak(prewHTML) {
			if(prewHTML.charAt(0) == "\r" && prewHTML.charAt(1) == "\n") {
				prewHTML = prewHTML.substr(2); // Remove the CR+LF
				console.log("Removed heading CRLF when retrieved content-editable body");
			}
			else if(prewHTML.charAt(0) == "\n") {
				prewHTML = prewHTML.substr(1); // Remove the LF
				console.log("Removed heading LF when retrieved content-editable body");
			}
			return prewHTML;
		}
		
		function removeTailLineBreak(prewHTML) {
			if(prewHTML.charAt(prewHTML.length-2) == "\r" && prewHTML.charAt(prewHTML.length-1) == "\n") {
				prewHTML = prewHTML.substr(0, prewHTML.length-2); // Remove the CR+LF
				console.log("Removed tailing CRLF when retrieved content-editable body");
			}
			else if(prewHTML.charAt(prewHTML.length-1) == "\n") {
				prewHTML = prewHTML.substr(0, prewHTML.length - 1); // Remove the LF
				console.log("Removed tailing LF when retrieved content-editable body");
			}
			else {
				console.log("last char: " + UTIL.lbChars(prewHTML.charAt(prewHTML.length-1)));
			}
			return prewHTML;
		}
		
		function removeTailTab(prewHTML) {
			if(prewHTML.charAt(prewHTML.length-1) == "\t") {
				prewHTML = prewHTML.substr(0, prewHTML.length - 1); // Remove the tab
				console.log("Removed tailing TAB when retrieved content-editable body");
			}
			else {
				console.log("last char: " + UTIL.lbChars(prewHTML.charAt(prewHTML.length-1)));
			}
			return prewHTML;
		}
		
	}
	
	WysiwygEditor.prototype.getSourceCodeBody = function getSourceCodeBody() {
		var wysiwygEditor = this;
		
		// Sanity check:
		if(wysiwygEditor.lineBreak == "\n" && wysiwygEditor.sourceFile.text.indexOf("\r") != -1) {
			throw new Error("wysiwygEditor.lineBreak=" + UTIL.lbChars(wysiwygEditor.lineBreak) + " but sourceFile.text contains CR!");
		}
		
		var srcBodyHtml = getElementContent(wysiwygEditor.sourceFile.text, wysiwygEditor.bodyTagSource, wysiwygEditor.lineBreak)
		
		return srcBodyHtml;
	}
	
	WysiwygEditor.prototype.bodyExistInSource = function bodyExistInSource(close) {
		var wysiwygEditor = this;
		
		if(close == undefined) close = true;
		
		var sourceFile = wysiwygEditor.sourceFile;
		
		// Make sure the text contains body tags with space after <body> and before </body> (white space is allowed infront of </body>)
		if(!sourceFile.text.match(/<body.*>([\s\S]*)<\/body>/i)) {
			return exit("The source needs to have a body tag for the WYSIWYG editor to work!");
		}
		
		if(!sourceFile.text.match(/<body.*>/i)) throw new Error("Source file contains no body tag! sourceFile.path:\n" + sourceFile.path);
		if(!sourceFile.text.match(/<\/body>/i)) throw new Error("Source file contains no end body tag! sourceFile.path:\n" + sourceFile.path);
		
		if(!sourceFile.text.match(/<body[^>]*>\s*[\n|\r\n]/i)) {
			return exit("There needs to be a line break after the body start tag for the WYSIWYG editor to work!");
			throw new Error("There is no line break after the body start tag in sourceFile.path:\n" + sourceFile.path);
		}
		if(!sourceFile.text.match(/[\n|\r\n]\s*<\/body>/i)) {
			return exit("There needs to be a line break before the body end tag for the WYSIWYG editor to work!");
			throw new Error("There is no line break before the body end tag in sourceFile.path:\n" + sourceFile.path);
		}
		
		return true;
		
		function exit(msg) {
			alertBox(msg);
			if(close) wysiwygEditor.close();
			return false;
		}
		
	}
	
	WysiwygEditor.prototype.reload = function reload(reloadCallback) {
		console.log("WysiwygEditor reload!");
		
		var wysiwygEditor = this;
		
		/*
			
			Note that when the window is reloaded. There will be a new window object. 
			And all event listeners need to be re-attached to that object.
			
		*/
		
		console.warn("(re)loading preview window ...");
		
		oldPreviewWindowPosition = {
			x: wysiwygEditor.previewWin.screenX || wysiwygEditor.previewWin.screenLeft, 
			y: wysiwygEditor.previewWin.screenY || wysiwygEditor.previewWin.screenTop
		};
		oldPreviewWindowSize = {
			x: wysiwygEditor.previewWin.innerWidth,
			y: wysiwygEditor.previewWin.innerHeight
		};
		
		var editorCodeWindow = window; // gui.Window.get();
		oldCodeWindowPosition = {
			x: editorCodeWindow.screenX || editorCodeWindow.screenLeft, 
			y: editorCodeWindow.screenY || editorCodeWindow.screenTop
		};
		oldCodeWindowSize = {
			x: editorCodeWindow.innerWidth,
			y: editorCodeWindow.innerHeight
		};
		
		console.log("Set oldCodeWindowPosition=", oldCodeWindowPosition);
		console.log("Set oldCodeWindowSize=", oldCodeWindowSize);
		
		if(wysiwygEditor.hasLoaded) {
			
			if(!wysiwygEditor.sourceFileIsSaved) {
				var err = new Error("It's not safe to reload because the wysiwygEditor source file has not been saved!");
				if(reloadCallback) return reloadCallback(err);
				else alertBox(err.message);
			}
			
			if(wysiwygEditor.isCompiled) {
				/*
					The source code has most likely been changed during the "dance" where contentediable code is synced
					with source code (tbody etc elements are added). The "dance" mangles the source code so it should be
					avoided if possible, but it's needed for the WYSIWYG (contentediable) functionality, so we can make sane diffs
					in contenteditable vs source code to see what changed.
					
					But if the source code has been saved, we could try a re-compile !?
				*/
				if(!wysiwygEditor.reCompile) {
					var err = new Error("No reCompile method found. Can not reload (a second time) if the source code have been compiled !");
					if(reloadCallback) return reloadCallback(err);
					else alertBox(err.message);
				}
				
				// note: Source files can't change during reCompile ! (so need to check if it has changed)
				
				wysiwygEditor.reCompile(function(err) {
					if(err) {
						if(reloadCallback) return reloadCallback(err);
						else return alertBox(err.message);
					}
					else readyToRefresh();
				});
				
				return; // Wait for reCompile
				
			}
		}
		
		readyToRefresh();
		
		function readyToRefresh() {
			// We don't want to use wysiwygEditor.previewWin.location = wysiwygEditor.previewWin.location.href redirect.
			// Because it would not be possible to capture early events as there is no way to add event listeners to it until it has loaded!
			
			wysiwygEditor.isReloading = true; // Prevent onbeforeunload from calling wysiwygEditor.close() when the window closes
			
			if(wysiwygEditor.previewWin) wysiwygEditor.previewWin.close();
			
			console.log("Waiting for new window with url=" + wysiwygEditor.url + " to be created ...");
			EDITOR.createWindow({
				url: wysiwygEditor.url, 
				width: oldPreviewWindowSize.x,
				height: oldPreviewWindowSize.y,
				left: oldPreviewWindowPosition.x,
				top: oldPreviewWindowPosition.y
			}, windowCreated);
			
			function windowCreated(err, newWindow) {
				console.log("WysiwygEditor reload windowCreated!");
				
				wysiwygEditor.isReloading = false;
				
				if(err) {
					if(reloadCallback) return reloadCallback(err);
					else throw err;
				}
				
				wysiwygEditor.attachTo(newWindow, function attached(err) {
					console.log("WysiwygEditor reload attached!");
					if(err) {
						if(reloadCallback) return reloadCallback(err);
						else throw err;
					}
					else {
						console.log("Successfully attached WysiwygetEdtior to new window");
						
						console.log("Done (re)loading preview window");
						
						if(reloadCallback) reloadCallback(null);
						
						wysiwygEditor.ignoreSourceFileChange = false;
					}
				});
			}
		}
	}
	
	WysiwygEditor.prototype.attachTo = function attach(newWindow, callback) {
		console.log("WysiwygEditor attachTo!");
		
		if(typeof callback != "function") throw new Error("callback=" + callback);
		
		console.log("Attaching event listeners etc to " + newWindow);
		var wysiwygEditor = this;
		
		if(newWindow == undefined) throw new Error("newWindow=" + newWindow);
		
		if(newWindow == window) throw new Error("newWindow can not be the same as window!"); // Sanity
		
		wysiwygEditor.previewWin = newWindow;
		
		var previewWin = wysiwygEditor.previewWin;
		
		console.log("previewWin.document.readyState=" + previewWin.document.readyState);
		
		/*
			We want to overload the console.log as fast as possible so we can capture early console.log's
			The window might already have loaded! Thus we missed the early console.log's !!
		*/
		if(wysiwygEditor.captureConsoleLog) {
			consoleLogOriginal = previewWin.window.console.log;
			previewWin.window.console.log = consoleLogCapturer;
			previewWin.window.console.warn = consoleLogCapturer;
			
			// For sanity
			if(previewWin.loaded === false) {
				previewWin.addEventListener("load", function checkConsoleLogOverloaded() {
					if(previewWin.window.console.log != consoleLogCapturer) throw new Error("Failed to overload console.log!");
					else console.log("consoleLogCapturer attached successfully!? (it attached before load) " + UTIL.timeStamp());
				});
			}
			else if(previewWin.loaded === true) {
				console.log("consoleLogCapturer attached successfully!? (it attached after load) " + UTIL.timeStamp());
			}
			/*
				1522935134102 attached
				1522935134322 console.log hi
				So why is it not captured !!?!?!?!?!?!?!?
			*/
			/*
				setTimeout(function checkAgainConsoleLogOverloaded() {
				if(previewWin.window.console.log != consoleLogCapturer) throw new Error("Failed to overload console.log!");
				else console.log("consoleLogCapturer *still* attached ! " +  + UTIL.timeStamp());
				},30);
			*/
			// Just adding the code above seems to make it capture it!!! why ?
			// Because it now always attaches before load !?
			// ok, it now seems to always attach before load, even though we have uncommented the code
			/*
				consoleLogCapturer attached successfully!? (it attached after load) 1523000404122-1
				hi 1523000404155
				ok, so if it attached after load, it will not capture the console.log, even though console log comes after ...
				
			*/
		}
		
		// Capture errors on the content-editable so that they do not go by unoticed
		previewWin.window.addEventListener("error", captureError);
		
		
		if(previewWin.loaded === true) attachEvents();
		else previewWin.addEventListener("load", function windowLoaded() {
			attachEvents();
		});
		
		function captureError(err) {
			wysiwygEditor.error(err);
		}
		
		function consoleLogCapturer() {
			wysiwygEditor.consoleLog(arguments);
		}
		
		function attachEvents() {
			
			if(previewWin.loaded !== true) throw new Error("The preview window has not loaded!");
			
			var doc = previewWin.document;
			var win = previewWin.window;
			
			if(!doc.documentElement) {
				throw new Error("Failed to get doc.documentElement after " + retries + " retries.");
			}
			
			if(!previewWin) throw new Error("Unable to get preview window!");
			if(!doc) throw new Error("Unable to get preview window document!");
			if(!win) throw new Error("Unable to get preview window window!");
			
			/*
				var prewviewContent = doc.documentElement.outerHTML;
				console.log("prewviewContent=" + prewviewContent);
				if(prewviewContent != html && prewviewContent) {
				
				console.log("html=" + html);
				console.log("prewviewContent=" + prewviewContent);
				throw new Error("Failed to write HTML to preview window!");
				}
			*/
			
			var bodyTags = doc.documentElement.getElementsByTagName(wysiwygEditor.bodyTagPreview);
			
			if(bodyTags.length == 0) {
				console.log((new Date()).getTime() + " unable to get " + wysiwygEditor.bodyTagPreview + " element! doc.readyState=" + doc.readyState +
				" doc.documentElement.readyState=" + doc.documentElement.readyState);
				return callback(new Error("Unable to find wysiwygEditor.bodyTagPreview=" + wysiwygEditor.bodyTagPreview +
				" in preview window! doc.documentElement.innerHTML=" + doc.documentElement.innerHTML + " doc.innerHTML=" + doc.innerHTML + ""));
			}
			
			var body = bodyTags[0];
			
			/*
				"dancing" will mess up the source code, so we want to avoid it if possible.
				I'ts only needed if we want to edit in WYSIWYG mode !?
			*/
			if(!wysiwygEditor.onlyPreview) wysiwygEditor.dance();
			
			
			if(!wysiwygEditor.onlyPreview) {
				// Make body editable and attatch event listeners
				
				body.setAttribute("contenteditable", "true");
				
				body.onkeydown = function(e) {wysiwygEditor.previewKeyDown(e)};
				body.onkeyup = function(e) {wysiwygEditor.previewKeyup(e)};
				body.onselectionchange = function(e) {wysiwygEditor.previewSelectionchange(e)};
				body.onpaste = function(e) {wysiwygEditor.previewPaste(e, doc)};
				
				// body.input doesn't work on nw.js gui, has to use window instead
				//body.input = function(e) {wysiwygEditor.previewInput(e)};
				body.oninput = function(e) {wysiwygEditor.previewInput(e)};
				//win.addEventListener("input", function(e) {wysiwygEditor.previewInput(e)});
			}
			else console.log("wysiwygEditor.onlyPreview=" + wysiwygEditor.onlyPreview);
			
			body.onmouseup = function(e) {wysiwygEditor.previewMouseup(e);}
			
			// Capture F5 and make a soft reload
			previewWin.window.onkeydown = function keyDown(keyDownEvent) {
				//console.log("previewWin.window.onkeydown:", keyDownEvent);
				var keyF5 = 116;
				if(keyDownEvent.keyCode == keyF5) {
					keyDownEvent.preventDefault();
					wysiwygEditor.reload();
					return false;
				}
				else return true;
			};
			
			attachFileChangeListener(wysiwygEditor);
			attachFileSaveListener(wysiwygEditor);
			attachAutoCompleteListener(wysiwygEditor);
			
			/*
				Remove the fileChange and afterSave event listener when closing the content-editable window
				
				Note: If the window loads fast, onbeforeunload will be called (Chrome)!
				We put it behind a timeout in the hopes of it not firing 
			*/
			
			setTimeout(function afterWeirdStuff() {
				previewWin.window.onbeforeunload = function onbeforeunload() {
					console.warn("onbeforeunload called!");
					// We don't want the preview window to close when clicking on a link (in the preview window)
					// We however want the "preview" to unload so that it doesn't pop open again
					if(!wysiwygEditor.isReloading) wysiwygEditor.close(false);
					else console.log("wysiwygEditor.isReloading=" + wysiwygEditor.isReloading + " wysiwygEditor.onlyPreview=" + wysiwygEditor.onlyPreview);
					//return true; // Shows a "are you sure" message
				};
				
				callback(null);
			}, 1);
			
		}
	}
	
	WysiwygEditor.prototype.dance = function dance() {
		// We need to dance to make sure source code and content-editable code is the same ...
		var wysiwygEditor = this;
		
		if(!wysiwygEditor.previewWin) throw new Error("Unable to get preview window!");
		
		var doc = wysiwygEditor.previewWin.document;
		if(!doc) throw new Error("Unable to get preview window document!");
		
		var srcHtmlBeforeDance = wysiwygEditor.getSourceCodeBody();
		
		console.log("srcHtmlBeforeDance=" + UTIL.lbChars(srcHtmlBeforeDance));
		
		var bodyTags = doc.documentElement.getElementsByTagName(wysiwygEditor.bodyTagPreview);
		
		if(bodyTags.length === 0) {
			// The user probably have an open html tag above the body element
			// or the document is not yet fully loaded !?
			
			throw new Error("Unable to find wysiwygEditor.bodyTagPreview=" + wysiwygEditor.bodyTagPreview + " in preview window! doc.documentElement.innerHTML=" + doc.documentElement.innerHTML);
		}
		
		var body = bodyTags[0];
		
		// Need to know line break convention before getting the content-editable code!
		console.log("WYSIWYG determine line break convention:");
		wysiwygEditor.lineBreak = UTIL.determineLineBreakCharacters(body.innerHTML);
		
		// Get the html from content-editable, (tbody, and other html "fixes" might have been inserted)
		var prevBodyHtml = wysiwygEditor.getContentEditableCode();
		console.log("(after write) prevBodyHtml=" + UTIL.lbChars(prevBodyHtml));
		
		if(srcHtmlBeforeDance == prevBodyHtml) {
			console.warn("No dance needed !?");
			return;
		}
		
		wysiwygEditor.ignoreSourceFileChange = true;
		
		// Sanitize (add line breaks etc) to the content-editable code
		var sanitazed = sanitize(prevBodyHtml, wysiwygEditor.lineBreak);
		
		if(sanitazed != prevBodyHtml) {
			wysiwygEditor.setContentEditableBody(sanitazed);
			prevBodyHtml = wysiwygEditor.getContentEditableCode();
			console.log("(after sanitation) prevBodyHtml=" + UTIL.lbChars(prevBodyHtml));
		}
		
		var sourceFile = wysiwygEditor.sourceFile;
		var allSourceHtml = sourceFile.text;
		
		// Use the contenteditable line break convention in the source file to make life easier
		if(wysiwygEditor.lineBreak != sourceFile.lineBreak) {
			var regCurrentLineBreaks = new RegExp(sourceFile.lineBreak, "g");
			allSourceHtml = allSourceHtml.replace(regCurrentLineBreaks, wysiwygEditor.lineBreak);
			console.log("Replaced line breaks in source code: allSourceHtml=" + UTIL.lbChars(allSourceHtml));
		}
		
		// Replace the the content of the body element with the content-editable code
		allSourceHtml = changeCodeInBody(prevBodyHtml, allSourceHtml, wysiwygEditor.bodyTagSource, wysiwygEditor.lineBreak);
		
		console.log("(after setting) allSourceHtml=" + UTIL.lbChars(allSourceHtml));
		
		sourceFile.reload(allSourceHtml);
		
		// Finally make the body of the source file the body of the content-editable
		var sourceBody = wysiwygEditor.getSourceCodeBody();
		wysiwygEditor.setContentEditableBody(sourceBody);
		
		
		// The source code and content-editable should now have the same line breaks!
		
		console.log("(after) sourceBody=" + UTIL.lbChars(sourceBody));
		
		// The source code and content editable code should now be the same!
		if(wysiwygEditor.getContentEditableCode() != sourceBody) {
			throw new Error("Source code does not match!\n \
			wysiwygEditor.getContentEditableCode()=" + UTIL.lbChars(wysiwygEditor.getContentEditableCode()) + "\n\n\
			sourceBody=" + UTIL.lbChars(sourceBody) + "\n\n\
			diff=" + JSON.stringify(UTIL.textDiff(wysiwygEditor.getContentEditableCode(), sourceBody, null, 2)));
		}
		
		sourceFile.checkGrid();
		
		// Problem: The source code and a "compiled" page might diff a lot
		// Solution: .... ???
		
		var danceDiff = UTIL.textDiff(srcHtmlBeforeDance, sourceBody);
		console.log("danceDiff=" + JSON.stringify(danceDiff, null, 2));
		
		// It's ok to add new lines, but not OK to add new content
		
		// Only index and xml pages can contain SSG server code! So we do not need to worry about that
		
		wysiwygEditor.ignoreSourceFileChange = false;
		
	}
	
	WysiwygEditor.prototype.enableEdit = function enableEdit(callback) {
		var wysiwygEditor = this;
		
		wysiwygEditor.onlyPreview = false;
		
		wysiwygEditor.reload(true, callback);
		
	}
	
	WysiwygEditor.prototype.disableEdit = function disableEdit(callback) {
		var wysiwygEditor = this;
		
		console.log("Disabling WYSIWYG editing of " + wysiwygEditor.sourceFile.path);
		
		// Disable content editable, but keep the window open for preview
		
		
		wysiwygEditor.onlyPreview = true;
		
		var doc = wysiwygEditor.previewWin.document;
		
		if(!doc) {
			// The window has probably been closed!
			return callback();
		}
		
		var bodyTags = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview);
		
		if(bodyTags.length === 0) {
			// The preview window has probably been closed.
			// Don't bother about it
			return callback();
		}
		
		var body = bodyTags[0];
		
		body.setAttribute("contenteditable", "false");
		
		body.onmouseup = null;
		body.onkeyup = null;
		body.onselectionchange = null;
		body.onpaste = null;
		body.oninput = null;
		
		
		if(callback) callback();
		
	}
	
	WysiwygEditor.prototype.consoleLog = function consoleLog(arg) {
		var wysiwygEditor = this;
		
		// Console log takes many arguments and concatenates them
		console.log("Console log detected!");
		var msg = "";
		for (var i=0; i<arg.length; i++) {
			console.log("typeof arg[" + i + "]=" + (typeof typeof arg[i]));
			if(typeof arg[i] == "string") msg = msg + " " + arg[i];
			else if(typeof arg[i] == "object") {
				var stringifyError = false;
				try {
					var jsonStr = JSON.stringify(arg[i]);
				}
				catch(err) {
					stringifyError = true;
				}
				if(stringifyError) {
					msg = msg + " " + arg[i].toString();
				}
				else msg = msg + " " + jsonStr;
			}
			else {
				try {
					msg = msg + " " + arg[i].toString();
				}
				catch(err) {
					console.warn("Unable to convert to string:");
					console.log(arg[i]);
				}
			}
		}
		if(msg.length > 1) msg = msg.slice(1, msg.length); // Remove the first space
		
		//consoleLogOriginal(msg);
		// Gives eligal invocation error in nw.js
		if(RUNTIME != "nw.js") consoleLogOriginal.apply(undefined, arg);
		
		console.log("Captured console.log (" + arg.length + " argument(s)): " + msg);
		// Figure out what script made the log
		/*
			
			Error
			at WysiwygEditor.consoleLog (http://192.168.0.3:8080/WysiwygEditor.js:1820:16)
			at consoleLogCapturer (http://192.168.0.3:8080/WysiwygEditor.js:1532:18)
			at http://192.168.0.3:8080/kvkvx3pet0/inlineConsoleLog.htm:4:9
			
		*/
		var stack = (new Error("")).stack;
		var arrStack = stack.split("\n");
		
		for(var i=0; i<arrStack.length; i++) console.log(i + " " + arrStack[i]);
		
		var stackLineWithFile;
		for (var i=0, index = 0; i<arrStack.length; i++) {
			
			index = arrStack[i].trim().indexOf("at consoleLogCapturer"); // Chrome
			if(index == -1) index = arrStack[i].indexOf("consoleLogCapturer@"); // Firefox
			
			console.log("index=" + index);
			if(index != -1) {
				stackLineWithFile = arrStack[i+1];
				break;
			}
		}
		
		if(stackLineWithFile) {
			
			var urlPath = UTIL.getDirectoryFromPath(wysiwygEditor.url);
			var folder = UTIL.getDirectoryFromPath(wysiwygEditor.sourceFile.path);
			
			console.log("urlPath=" + urlPath);
			console.log("folder=" + folder);
			
			var reFile = new RegExp("\\(?" + urlPath + "(.*):(\\d*):(\\d*)\\)?");
			console.log(reFile);
			console.log(stackLineWithFile);
			var matchFile = stackLineWithFile.match(reFile);
			if(!matchFile) {
				console.log("Could not get file path from stackLineWithFile=" + stackLineWithFile + ". Searching the whole stack ...");
				matchFile = stack.match(reFile);
				if(!matchFile) {
					console.warn("Could not get file path from stackLineWithFile=" + stackLineWithFile + " or stack=" + stack + ". Most likely it's from another domain.");
					return;
				}
			}
			console.log(matchFile);
			var filePath = folder + matchFile[1];
			var row = parseInt(matchFile[2])-1;
			var col = parseInt(matchFile[3]);
			console.log("filePath=" + filePath);
			
			if(!wysiwygEditor.sourceFile.path.match(/\/|\\/)) {
				// Source file path has no slash in it! (some tests doesn't add the root slash)
				if(filePath.charAt(0) == "/" || filePath.charAt(0) == "\\") filePath = filePath.slice(1);
			}
			if(!EDITOR.files.hasOwnProperty(filePath)) return console.log("File not opened in the editor: " + filePath);
			
			var file = EDITOR.files[filePath];
			//if(file != EDITOR.currentFile) return console.log("File is not in view: " + filePath);
			
			//if(!(row >= file.startRow && row <= (file.startRow+EDITOR.view.visibleRows))) return console.log("The row is not in veiw: row=" + row + " file.startRow=" + file.startRow + " EDITOR.view.visibleRows=" + EDITOR.view.visibleRows);
			
			col = col - file.grid[row].indentationCharacters.length;
			if(col < 0) { // Sanity check
				throw new Error("col=" + col + " file.grid[" + row + "].indentationCharacters=" + UTIL.lbChars(file.grid[row].indentationCharacters) +
				" (" + file.grid[row].indentationCharacters.length + ")");
			}
			var rowText = file.rowText(row);
			var matchText = rowText.match(/console.log ?\( ?(['"`]?)(.*)\1\)/);
			// The user might have removed the console.log !
			// We might also be higher up in the stack, for example a function that calls console.log
			if(!matchText) {
console.warn("Unabled to find console.log on line=" + (row+1) + " in " + file.path + " matchText=" + matchText + " rowText=" + rowText + "");
			}
			
			EDITOR.addInfo(row, col, msg, file);
			
		}
		else throw new Error("Did not find the file location in stack=" + stack);
		
	}
	
	WysiwygEditor.prototype.error = function error(errorEvent) {
		var wysiwygEditor = this;
		
		var message = errorEvent.message;
		var source = errorEvent.filename;
		var lineno = errorEvent.lineno;
		var colno = errorEvent.colno;
		var error = errorEvent.error;
		
		console.log("Captured error: message=" + message + " line=" + lineno + "");
		
		console.log(errorEvent);
		
		if(!lineno) {
			return console.warn("No linenno!");
		}
		
		var urlPath = UTIL.getDirectoryFromPath(wysiwygEditor.url);
		var folder = UTIL.getDirectoryFromPath(wysiwygEditor.sourceFile.path);
		
		console.log("error: source=" + source + " lineno=" + lineno + " message=" + message +
		" urlPath=" + urlPath + " folder=" + folder + " stack=" + errorEvent.error.stack);
		
		var filePath = folder + source.replace(urlPath, "");
		
		if(!wysiwygEditor.sourceFile.path.match(/\/|\\/)) {
			// Source file path has no slash in it! (some tests doesn't add the root slash)
			if(filePath.charAt(0) == "/" || filePath.charAt(0) == "\\") filePath = filePath.slice(1);
		}
		
		console.log("Error in filePath?=" + filePath);
		
		var file = EDITOR.files[filePath];
		
		if(file) {
			var row = lineno-1;
			if(file.grid.length <= row) throw new Error("row=" + row + " outside the file.grid.length=" + file.grid.length + " for file.path=" + file.path + " source=" + source);
			var col = colno ? colno - file.grid[row].indentationCharacters : 0;
			if(EDITOR.currentFile != file) {
				EDITOR.showFile(file);
			}
			
			file.scrollToLine(lineno);
			
			EDITOR.addInfo(row, col, message, file, 1);
		}
		else { // The file is not opened
			console.log("File is not opened: " + filePath);
			
			// Try higher up the stack
			var errorStack = errorEvent.error.stack;
			if(errorStack) {
				var reFileFromStackTrace = new RegExp("\\(?(.*):(\\d*):(\\d*)\\)?", "g");
				var match;
				var fileStackLength = 0;
				var stackPath;
				whileLoop: while ((match = reFileFromStackTrace.exec(errorStack)) !== null && fileStackLength < 100) {
					console.log("match: ", match);
					fileStackLength++;
					// Is it opened ?
					stackPath = match[1];
					for(var filePath in EDITOR.files) {
						console.log("stackPath=" + stackPath + " in filePath=" + filePath + " ?");
						if(filePath.indexOf(stackPath) != -1) {
							console.log("yes!");
							var file = EDITOR.files[filePath];
							var row = match[2];
							var col = match[3];
							break whileLoop;
						}
						else console.log("nope");
					}
				}
				
				if(file && row) {
					EDITOR.addInfo(row, col, message, file, 1);
					return;
				}
				
			}
			
			var sourceLink = 'Detected error in: <a href="JavaScript: EDITOR.openFile(\'' + filePath + '\', undefined, function(err, file) {\
			if(err) alertBox(err.message); else file.gotoLine(' + lineno + ');\
			EDITOR.renderNeeded();})">' + filePath + ":" + lineno + "</a>";
			alertBox(sourceLink + "\n\n" + message + "");
		}
	}
	
	WysiwygEditor.prototype.autoComplete = function autoComplete(file, word, wordLength, gotOptions) {
		/*
			Autocomplete global variables from the window in preview
		*/
		
		var wysiwygEditor = this;
		
		var theWindow = wysiwygEditor.previewWin;
		
		console.log("WysiwygEditor.autoComplete: word=" + word + " theWindow?" + (!!theWindow) + " wordLength=" + wordLength);
		
		if(!theWindow) throw new Error("The preview window has been closed!?"); // Sanity check
		
		if(wordLength == 0) return;
		
		if(file != wysiwygEditor.sourceFile) {
			// Check if file has anything to do with the web page in preview (eg a script)
			var related = false;
			var fileName = UTIL.getFilenameFromPath(file.path);
			var scripts = theWindow.document.getElementsByTagName('script');
			for (var i=0; i<scripts.length; i++) {
				//console.log(scripts[i].src);
				if(scripts[i].src.indexOf(fileName) != -1) {
					related = true;
					break;
				}
			}
			if(!related) return;
		}
		
		var options = [];
		
		console.log("dingdong");
		
		var words = word.split(".");
		var obj = theWindow;
		var before = "";
		for (var i=0; i<words.length-1; i++) {
			before += words[i] + ".";
			console.log("before=" + before);
			if(words[i].match(/\(|\)|\[|\]/)) {
				// It calls a function or access's a property
				// so it needs to be evaulated
				// this could have some interesting side effects :P
				obj = theWindow.eval(  before.slice(0,-1)  );
				console.log("Evaulated: " + before.slice(0,-1) + " = " + obj);
			}
			else obj = obj[words[i]];
			if(!obj) {
				console.log("Object does not exist: " + before.slice(0,-1) + " (" + words[i] + ")");
				return;
			}
		}
		
		console.log(obj);
		
		if(obj == null) {
			console.warn("Unable to get window object. Has the window been closed!?");
			return;
		}
		
		var names = [];
		
		var beforeNoDot = before.slice(0,-1);
		
		if(typeof Object.getOwnPropertyNames != "undefined") {
			console.log("Object.getOwnPropertyNames(" + beforeNoDot + ")");
			addNamesFromArray(Object.getOwnPropertyNames(obj));
		} else console.warn("Object.getOwnPropertyNames not supported by your browser!");
		
		if(typeof Object.keys == "undefined") console.warn("Object.keys not supported by your browser!");
		else if(typeof obj.__proto__ == "undefined") console.warn("obj.__proto__ not supported by your browser!");
		else {
			console.log("Object.keys(" + beforeNoDot + ".__proto__)");
			addNamesFromArray(Object.keys(obj.__proto__));
		}
		
		if(typeof Object.getPrototypeOf != "undefined") {
			console.log("Object.getPrototypeOf(" + beforeNoDot + "))");
			addNamesFromObject(Object.getPrototypeOf(obj));
			
			if(typeof obj.__proto__ == "undefined") console.warn("obj.__proto__ not supported by your browser!");
			else {
				console.log("Object.getPrototypeOf(" + beforeNoDot + ".__proto__)");
				addNamesFromObject(Object.getPrototypeOf(obj.__proto__));
			}
		} else console.warn("Object.getPrototypeOf not supported by your browser!");
		
		
		var nameLength = wordLength - before.length;
		var lookFor = word.slice(before.length);
		for(var i=0, short; i<names.length; i++) {
			short = names[i].slice(0,nameLength);
			console.log(short + "=" + lookFor + " ? " + (short==lookFor) + " name=" + names[i]);
			if(short == lookFor) {
				if(typeof obj[names[i]] == "function") options.push([before + names[i] + "()", 1, args(obj[names[i]])]);
				else options.push(before + names[i]);
			}
		}
		
		console.log("Found " + options.length + " results: " + JSON.stringify(options));
		
		return options;
		
		function addNamesFromArray(arr) {
			var dup = 0;
			for (var i=0; i<arr.length; i++) {
				if(names.indexOf(arr[i]) == -1) names.push(arr[i]);
				else dup++;
			}
			console.log("Added " + (arr.length-dup) + " of " + arr.length + " properties");
		}
		
		function addNamesFromObject(obj) {
			var dup = 0;
			var tot = 0;
			for (var name in obj) {
				tot++;
				if(names.indexOf(name) == -1) names.push(name);
				else dup++;
			}
			console.log("Added " + (tot-dup) + " of " + tot + " properties");
		}
		
		
		function args(func) {
			return (func + '')
			.replace(/[/][/].*$/mg,'') // strip single-line comments
			.replace(/\s+/g, '') // strip white space
			.replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments
			.split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters
			.replace(/=[^,]+/g, '') // strip any ES6 defaults
			.split(',').filter(Boolean); // split & filter [""]
		}
		
	}
	
	WysiwygEditor.prototype.setContentEditableBody = function setContentEditableBody(srcBodyHtml) {
		// Updates the content of the content-editable element
		
		var wysiwygEditor = this;
		
		var win = wysiwygEditor.previewWin;
		var doc = win.window.document;
		var body = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
		
		if(!body) throw new Error("Unable to find bodyTagPreview=" + wysiwygEditor.bodyTagPreview + " element!");
		
		console.log("Setting content editable body ( " + srcBodyHtml.length + " characters)");
		
		body.innerHTML = srcBodyHtml;
		// note: after HTML have been reset, variable body points to the *old* body. So we need to re-reference the body variable to the *new* body!
		
		/*
			var parser=new DOMParser();
			var htmlDoc=parser.parseFromString(srcBodyHtml, "text/html");
			while (body.firstChild) body.removeChild(body.firstChild); // Clear content
			while (htmlDoc.firstChild) body.appendChild(htmlDoc.firstChild); // Add new content
		*/
		
		//var body = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
		//if(!body) throw new Error("Unable to find bodyTagPreview=" + wysiwygEditor.bodyTagPreview + " element!");
		
		// Do not need to pad the code with line breaks!
		// Only the source code need to have line breaks before body tags!
		// The diff campares innerHTML with source code without the source code's line-breaks after <body> and before </body>
		
		//body.innerHTML = lb + srcBodyHtml + lb;
		
	}
	
	function attachFileChangeListener(wysiwygEditor) {
		// fileChange wants an uniqe function name ...
		var name = "wysiwygEditorFileChange" + wysiwygEditor.id;
		console.log("Unique function name for fileChange event: " + name);
		var customAction = function(file, type, characters, caretIndex, row, col) {
			wysiwygEditor.sourceFileChange(file, type, characters, caretIndex, row, col);
		}
		var func = new Function("action" + name, "return function " + name + "(file, type, characters, caretIndex, row, col){ action" + name + "(file, type, characters, caretIndex, row, col) };")(customAction);
		
		if(wysiwygEditor.fileChangeEventListener) EDITOR.removeEvent("fileChange", wysiwygEditor.fileChangeEventListener);
		
		EDITOR.on("fileChange", func);
		
		wysiwygEditor.fileChangeEventListener = func;
		
		wysiwygEditor.ignoreSourceFileChange = false;
	}
	
	function attachFileSaveListener(wysiwygEditor) {
		// All EDITOR events wants an uniqe function name ...
		var name = "wysiwygEditorFileSave" + wysiwygEditor.id;
		console.log("Unique function name for afterSave event: " + name);
		var customAction = function(file, saveCallback) {
			wysiwygEditor.anyFileSaved(file, saveCallback);
		}
		var func = new Function("action" + name, "return function " + name + "(file, saveCallback){ return action" + name + "(file, saveCallback) };")(customAction);
		
		if(wysiwygEditor.afterFileSaveEventListener) EDITOR.removeEvent("afterSave", wysiwygEditor.afterFileSaveEventListener);
		
		EDITOR.on("afterSave", func);
		
		wysiwygEditor.afterFileSaveEventListener = func;
		
	}
	
	function attachAutoCompleteListener(wysiwygEditor) {
		// All EDITOR events wants an uniqe function name ...
		var name = "wysiwygEditorAutoComplete" + wysiwygEditor.id;
		console.log("Unique function name for autoComplete event: " + name);
		var customAction = function(file, word, wordLength, gotOptions) {
			return wysiwygEditor.autoComplete(file, word, wordLength, gotOptions);
		}
		var func = new Function("action" + name, "return function " + name + "(file, word, wordLength, gotOptions){ return action" + name + "(file, word, wordLength, gotOptions) };")(customAction);
		
		if(wysiwygEditor.autoCompleteListener) EDITOR.removeEvent("autoComplete", wysiwygEditor.autoCompleteListener);
		
		var order = 1;
		EDITOR.on("autoComplete", func, order);
		
		wysiwygEditor.autoCompleteListener = func;
	}
	
	function changeCodeInBody(newBodyCode, html, bodyTag, lineBreak) {
		
		// There need to be a line break directly after <body> and before </body> !
		// This is to prevent having the body tags included in text diff
		
		var regCheck = regexBody(bodyTag, lineBreak);
		
		if(html.match(regCheck) === null) throw new Error("Unable to find bodyTag=" + bodyTag + " element when setting the code body.\n\
		html=" + UTIL.lbChars(html));
		
		// 1. body attributes
		// 2. line break character(s) after body tag
		// 3. body content
		// 4. White-space (including line breaks) before body end  
		
		// /<body(.*)>(\n|\r\n)([\s\S]*)([\n|\r\n]\s*)<\/body>/i
		
		var regReplace = new RegExp("<" + bodyTag + "(.*)>(\\n|\\r\\n)([\\s\\S]*)([\\n|\\r\\n]\\s*)<\/" + bodyTag + ">", "i"); 
		
		html = html.replace(regReplace, "<" + bodyTag + "$1>$2" + newBodyCode + "$4</" + bodyTag + ">");
		
		// The white space before </body> is preserved to keep source file indentation characters
		
		// Sanity check!
		if(html.match(regCheck) === null) throw new Error("We are not sane!\n html=" + UTIL.lbChars(html));
		
		return html;
	}
	
	
	
	
	
	function removeHeadWhiteSpace(text, LB) {
		if(!LB) throw new Error("Need to specify line-break character to use! LB=" + LB)
		return text.replace(/^\s*/, LB);
	}
	
	function removeTailWhiteSpace(text, LB) {
		if(!LB) throw new Error("Need to specify line-break character to use! LB=" + LB)
		return text.replace(/\s*$/, LB);
	}
	
	function removeHeadWhiteSpaceAndAddLineBreak(text, LB) {
		if(!LB) throw new Error("Need to specify line-break character to use! LB=" + LB)
		return text.replace(/^\s*/, LB);
	}
	
	function removeTailWhiteSpaceAndAddLineBreak(text, LB) {
		if(!LB) throw new Error("Need to specify line-break character to use! LB=" + LB)
		return text.replace(/\s*$/, LB);
	}
	
	
	function sanitizeOfficeDoc(html) {
		
		console.log("Before sanitizeOfficeDoc:" + html);
		
		html = html.replace(/\n|\r\n/ig, " "); // Prevent line breaks in the middle of html tag
		
		// Remove <o:p></o:p>
		html = html.replace(/<o:p>/ig, "");
		html = html.replace(/<\/o:p>/ig, "");
		
		// Remove style attributes
		html = html.replace(/ style="[^"]+"/ig, "");
		
		// Remove class attributes
		html = html.replace(/ class="[^"]+"/ig, "");
		
		// Remove onmouseover and onmouseout attributes
		
		
		// Get rid of span elements
		html = html.replace(/<span>/ig, "");
		html = html.replace(/<\/span>/ig, "");
		
		// Remove emty p elements
		html = html.replace(/<p>\s*<\/p>/gi, "");
		
		// Remove space between tags
		html = html.replace(/>\s*</gi, "><");
		
		// Remove space before tags
		html = html.replace(/\s*</gi, "<");
		
		// Remove all attributes from td elements
		html = html.replace(/<td[^>]*>/ig, "<td>");
		
		// Remove all attributes from p elements
		html = html.replace(/<p[^>]*>/ig, "<p>");
		
		// Remove p inside td
		html = html.replace(/<td><p>(.*?)<\/p><\/td>/gi, "<td>$1</td>");
		
		// Remove br inside td
		html = html.replace(/<td><br><\/td>/gi, "<td></td>");
		
		// Fix multible spaces
		html = html.replace(/\s\s+/g, " ");
		
		// Remove emty html elements
		html = html.replace(/<(.*?)><\/\1>/g, "");
		
		// Remove <del> elements
		html = html.replace(/<del[^>]*>.*?<\/del>/g, "");
		
		
		//console.log("After sanitizeOfficeDoc:" + html);
		
		return html;
	}
	
	function sanitize(html, LB) {
		// Can not change the file in a fileChange event or it would create an endless loop
		// Witch means we can not sanitize on source code changes,
		// witch also means we can not sanitize on content-editable canges! WHY??!! It should work!
		// Also note that the location of the node the caret/cursor is in needs to be at the same place! Or it will not be able to replace the caret after the sanitiazion!
		
		html = insertLineBreaks(html, LB);
		
		return html;
	}
	
	function insertLineBreaks2(html, LB) {
		/*
			The goal of this function is to insert white space to make the HTML easier to read.
			And to keep the position of the elements the same
			
		*/
		
		// Make sure there are at least two line breaks between each p-tag <p>foo</p><p>bar</p>
		
		if(LB != "\n") throw new Error("Line break convention now supported: " + UTIL.lbChars(LB));
		
		html = html.replace(/<\/p><p/gi, "</p>" + LB + LB + "<p");
		
		//html = html.replace(/<\/tr><tr/gi, "</tr>" + LB + "<tr");
		//html = html.replace(/<\/td><td/gi, "</td>" + LB + "<td");
		//html = html.replace(/<\/th><th/gi, "</th>" + LB + "<th");
		
		return html;
	}
	
	function insertLineBreaks(html, LB) {
		
		if(LB == undefined) throw new Error("Please specify line break character(s) to use!");
		
		// Add line breaks so the source code gets easier to read
		
		// Make sure the line breaks at the beginning stays there, or there will be errors in the text transformation!
		
		
		var lbBefore = checkStartingLineBreaks();
		
		
		console.log("inserting (sanitizing) line breaks. LB=" + UTIL.lbChars(LB));
		
		console.time("insertLineBreaks");
		
		// Remove space between tags
		html = html.replace(/>\s*</gi, "><");
		
		// Remove space before tags
		// problem: Some browsers (Firefox) adds a <br> when pusing space ... <p>abc <br> ... witch we dont want to trim
		//html = html.replace(/\s*</gi, "<");
		
		
		// Line breaks between p tags
		html = html.replace(/>\s*<p/gi, ">" + LB + LB + "<p");
		html = html.replace(/<\/p>\s*</gi, "</p>" + LB + LB + "<");
		
		// Line breaks between h# tags
		html = html.replace(/>\s*<h/gi, ">" + LB + LB + "<h");
		html = html.replace(/<\/h(.)>\s*</gi, "</h$1>" + LB + LB + "<");
		
		// Line breaks between div tags
		html = html.replace(/>\s*<div/gi, ">" + LB + LB + "<div");
		html = html.replace(/<\/div>\s*</gi, "</div>" + LB + LB + "<");
		
		
		// Add Line break before ending div tags
		html = html.replace(/<\/div>/gi, LB + "</div>");
		
		// Then remove line breaks for divs that did not have a line breaks inside
		html = html.replace(/<div(.*)>([^\n]+)\n<\/div>/gi, "<div$1>$2</div>");
		
		// Also remove the line break from divs that where emty
		html = html.replace(/<div(.*)>([^\n]?)\n<\/div>/gi, "<div$1>$2</div>");
		
		// And remove double line breaks before </div> ending tag
		html = html.replace(/\n\n<\/div>/gi, LB + "</div>");
		
		
		
		// Line breaks between tbody
		html = html.replace(/>\s*<tbody/gi, ">" + LB + "<tbody");
		html = html.replace(/<\/tbody>\s*</gi, "</tbody>" + LB + "<");
		
		// Line breaks between tr
		html = html.replace(/>\s*<tr/gi, ">" + LB + "<tr");
		html = html.replace(/<\/tr>\s*</gi, "</tr>" + LB + "<");
		
		// Line breaks between td
		html = html.replace(/>\s*<td/gi, ">" + LB + "<td");
		html = html.replace(/<\/td>\s*</gi, "</td>" + LB + "<");
		
		// Line breaks between th
		html = html.replace(/>\s*<th/gi, ">" + LB + "<th");
		html = html.replace(/<\/th>\s*</gi, "</th>" + LB + "<");
		
		
		// Line breaks between li
		html = html.replace(/>\s*<li/gi, ">" + LB + "<li");
		html = html.replace(/<\/li>\s*</gi, "</li>" + LB + "<");
		
		// Line breaks between ul and ol
		html = html.replace(/>\s*<ul/gi, ">" + LB + "<ul");
		html = html.replace(/<\/ul>\s*</gi, "</ul>" + LB + "<");
		
		html = html.replace(/>\s*<ol/gi, ">" + LB + "<ol");
		html = html.replace(/<\/ol>\s*</gi, "</ol>" + LB + "<");
		
		
		// Word-wrap p elements
		//html = html.replace(/<p.*>(.*)<\/p>/ig, "<p>" + wordWrapText("$1") + "</p>");
		
		var lbAfter = checkStartingLineBreaks();
		
		console.log("lbBefore=" + lbBefore + " lbAfter=" + lbAfter);
		
		if(lbBefore > lbAfter) {
			var add = lbBefore - lbAfter;
			console.log("Gonna add=" + add + " line breaks ...");
			for(var i=0; i<add; i++) {
				html = LB + html;
				console.log("line break added");
			}
		}
		else if(lbBefore < lbAfter) {
			var remove = lbAfter - lbBefore;
			console.log("Gonna remove=" + remove + " line breaks ...");
			var start = 0;
			for(var i=0; i<remove; i++) {
				start = html.indexOf(LB, start) + 1;
			}
			var removed = html.substr(0, start-1);
			html = html.substr(start);
			
			console.log("Removed " + occurencies(removed, LB) + " line breaks");
		}
		
		console.timeEnd("insertLineBreaks");
		
		return html;
		
		function checkStartingLineBreaks() {
			var lookForCharacter = "\n"; // Works both for LF and CRLF
			var lbCount = 0;
			var char = "";
			for(var i=0; i < html.length; i++) {
				char = html.charAt(i);
				if(char == lookForCharacter) lbCount++;
				else if(char != "\r" && char != "\n" && char != "\t" && char != " ") break; // Not a white space
			}
			return lbCount;
		}
		
	}
	
	
	function fixMessups(html) {
		// Fix messed up headings: <h1><span style="font-size: 3em;">Fakta om APL</span><br></h1>
		html = html.replace(/<h1><span style="font-size: 3em;">(.*)<\/span><br><\/h1>/ig, "<h1>$1</h1>");
		// Maybe this should be done before ? when detected ?
		
		return html;
		
	}
	
	function getElementContent(fileText, bodyTag, lineBreak) {
		
		if(fileText == undefined) throw new Error("Need fileText");
		if(bodyTag == undefined) {
			bodyTag = "body";
			console.warn("Using bodyTag=" + bodyTag);
		}
		if(lineBreak == undefined) lineBreak = UTIL.determineLineBreakCharacters(fileText);
		
		// In order for the diff to work, we can not start and end on the same row as the <body> or </body> tags
		// so there needs to be a line-break after <body> and before </body>
		
		var srcMatchBody = fileText.match(regexBody(bodyTag, lineBreak));
		
		if(srcMatchBody == null) {
			console.log(fileText);
			throw new Error("Can not find bodyTag=" + bodyTag + " with a line break after it!" + 
			" There need to be a line break after the opening and before the closing of the " + bodyTag + " element!");
		}
		
		if(srcMatchBody.length != 2) throw new Error("Unexpeced match: srcMatchBody=" + JSON.stringify(srcMatchBody));
		
		var bodyHtml = srcMatchBody[1];
		console.log("srcMatchBody=" + JSON.stringify(srcMatchBody));
		
		
		//bodyHtml = removeHeadWhiteSpace(bodyHtml, lineBreak);
		//bodyHtml = removeTailWhiteSpace(bodyHtml, lineBreak);
		
		return bodyHtml;
		
	}
	
	function regexBody(bodyTag, lineBreak) {
		if(bodyTag == undefined) throw new Error("No bodyTag=" + bodyTag + " defined!")
		console.log("Returning regexp for bodyTag=" + bodyTag);
		
		if(lineBreak == "\r\n") {
			return new RegExp("<" + bodyTag + "[^>]*>[\\t ]*\\r\\n([\\s\\S]*)\\r\\n[\\t ]*<\\/" + bodyTag + ">", "i");
		}
		else {
			return new RegExp("<" + bodyTag + "[^>]*>[\\t ]*\\n([\\s\\S]*)\\n[\\t ]*<\\/" + bodyTag + ">", "i");
		}
		
		//return new RegExp("<" + bodyTag + "[^>]*>\\s*[\\n|\\r\\n]([\\s\\S]*)[\\n|\\r\\n]\\s*<\\/" + bodyTag + ">", "i");
		
		/*
			* = Matches the preceding expression 0 or more times
		*/
		
	}
	
	
	
	
	
	// ### Test(s)
	
	EDITOR.addTest(function testInsertLineBreaks(callback) {
		// bug: Adding a space in the content-editable moved it's cursor to the top
		var str1 = "\n<p>abc <br></p>\n";
		
		var str2 = insertLineBreaks(str1, "\n");
		
		if(str1 != str2) throw new Error("Trimmed white space where it should not!\nstr1=" + UTIL.lbChars(str1) + "\nstr2=" + UTIL.lbChars(str2));
		
		callback(true);
		
	});
	
	EDITOR.addTest(function testStartRowN(callback) {
		var html = '<html>\n<body>\nHello\nWorld\n</body>\n</html>';
		EDITOR.openFile("wysiwygEditorTestStartRowN.htm", html, function(err, file) {
			var wysiwygEditor = {
				lineBreak: "\n",
				bodyTagSource: "body",
				sourceFile: file
			};
			wysiwygEditor.getSourceCodeBody = WysiwygEditor.prototype.getSourceCodeBody;
			
			WysiwygEditor.prototype.setStartRow.call(wysiwygEditor);
			if(wysiwygEditor.startRow != 2) throw new Error("Expected wysiwygEditor.startRow=" + wysiwygEditor.startRow + " to be 2");
			
			var sourceBodyHtml = WysiwygEditor.prototype.getSourceCodeBody.call(wysiwygEditor);
			var sourceBodyHtmlRows = sourceBodyHtml.split(/\n/);
			if(sourceBodyHtmlRows.length != 2) {
				console.log("testStartRowN sourceBodyHtml:");
				console.log(sourceBodyHtml);
				throw new Error("Expected sourceBodyHtmlRows.length=" + sourceBodyHtmlRows.length + " to be 2");
			}
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function testStartRowNN(callback) {
		var html = '<html>\n<body>\n\nHello\nWorld\n\n</body>\n</html>';
		EDITOR.openFile("wysiwygEditorTestStartRowNN.htm", html, function(err, file) {
			var wysiwygEditor = {
				lineBreak: "\n",
				bodyTagSource: "body",
				sourceFile: file
			};
			
			if(file.text != html) {
				console.log("file.text=" + UTIL.lbChars(file.text) + "");
				console.log("html=" + UTIL.lbChars(html));
				throw new Error("file.text (length=" + file.text.length + ") does not match html (length=" + html.length + ")");
			}
			
			wysiwygEditor.getSourceCodeBody = WysiwygEditor.prototype.getSourceCodeBody;
			
			WysiwygEditor.prototype.setStartRow.call(wysiwygEditor);
			if(wysiwygEditor.startRow != 2) throw new Error("Expected wysiwygEditor.startRow=" + wysiwygEditor.startRow + " to be 2");
			
			var sourceBodyHtml = WysiwygEditor.prototype.getSourceCodeBody.call(wysiwygEditor);
			var sourceBodyHtmlRows = sourceBodyHtml.split(/\n/);
			if(sourceBodyHtmlRows.length != 4) {
				console.log("testStartRowNN sourceBodyHtml:");
				console.log(sourceBodyHtml);
				console.log("EDITOR.files=" + JSON.stringify(Object.keys(EDITOR.files)));
				throw new Error("Expected sourceBodyHtmlRows.length=" + sourceBodyHtmlRows.length + " to be 4.");
			}
			
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function testStartRowRN(callback) {
		var html = '<html><body>\r\nHello\r\nWorld\r\n</body></html>';
		EDITOR.openFile("wysiwygEditorTestStartRowRN.htm", html, function(err, file) {
			var wysiwygEditor = {
				lineBreak: "\r\n",
				bodyTagSource: "body",
				sourceFile: file
			};
			wysiwygEditor.getSourceCodeBody = WysiwygEditor.prototype.getSourceCodeBody;
			
			WysiwygEditor.prototype.setStartRow.call(wysiwygEditor);
			if(wysiwygEditor.startRow != 1) throw new Error("Expected wysiwygEditor.startRow=" + wysiwygEditor.startRow + " to be 1");
			
			EDITOR.closeFile(file.path);
			callback(true);
		});
	});
	
	EDITOR.addTest(function testWysiwygEditorDontBreakLineBreaks(callback) {
		
		// Make sure we can't break line-breaks in half eg: RN -> R...N'
		
		var html = '<html><body>\r\nHello\r\nWorld\r\n</body></html>';
		
		
		EDITOR.openFile("wysiwygEditorDontBreakLineBreaks.htm", html, function(err, file) {
			
			//var wysiwygEditor = new WysiwygEditor(file, "body", false, undefined, undefined, undefined, html, "body");
			
			var wysiwygEditor = {
				lineBreak: "\r\n",
				bodyTagSource: "body",
				sourceFile: file
			};
			wysiwygEditor.getSourceCodeBody = WysiwygEditor.prototype.getSourceCodeBody;
			
			var source = WysiwygEditor.prototype.getSourceCodeBody.call(wysiwygEditor);
			console.log("source=" + UTIL.lbChars(source));
			
			// Throw !?!?!
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
		
	});
	
	
	
})();
