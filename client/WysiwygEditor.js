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
	var diff = UTIL.textDiff(srcHTML, main.innerHTML);
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
	
	WysiwygEditor = function WysiwygEditor(options) {
		var wysiwygEditor = this;
		
		if(arguments.length != 1) throw new Error("Expected only one argument (options object)");
		
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
		
		
		
		if(!sourceFile) throw new Error("Expected sourceFile when calling WysiwygEditor");
		
		console.log("new WysiwygEditor! onlyPreview=" + onlyPreview + " sourceFile.path=" + sourceFile.path + " url=" + url + 
		" top=" + top + " left=" + left + " width=" + width + " height=" + height);
		
		if(wysiwygEditor == undefined || wysiwygEditor == window) throw new Error("Call WysiwygEditor with the new keyword! Example: var foo = new WysiwygEditor()");
		
		if(!sourceFile) throw new Error("sourceFile=" + sourceFile);
		wysiwygEditor.sourceFile = sourceFile;
		if(!wysiwygEditor.sourceFile) throw new Error("wysiwygEditor.sourceFile=" + wysiwygEditor.sourceFile);
		
		if(sourceFile.text.indexOf("<?JS") != -1) throw new Error("Source file contains dynamic script tags. Ignore/transform filter not yet implemented.");
		
		if(!newWindow) {
			
			console.warn("Creating a new window ...");
			
			// We need to create the window right away to prevent it being blocked ...
			var newWindow = EDITOR.createWindow({url: url});
			
			if(!newWindow) throw new Error("The new window was blocked! Use EDITOR.createWindow() and pass it as the fourth parameter!")
		}
		wysiwygEditor.previewWin = newWindow;
		
		wysiwygEditor.url = url;
		wysiwygEditor.bodyTagSource = bodyTagSource || "body";
		wysiwygEditor.bodyTagPreview = bodyTagPreview || "body";
		wysiwygEditor.onlyPreview = (onlyPreview == true);
		wysiwygEditor.whenLoaded = whenLoaded;
		
		wysiwygEditor.ignoreSourceFileChange = true;
		
		wysiwygEditor.lineBreak = UTIL.determineLineBreakCharacters(sourceFile.text); // lineBreak convention will change once the WYSIWYG editor has danced / reloaded !
		
		wysiwygEditor.isCompiled = false;
		
		wysiwygEditor.onErrorEvent = options.onErrorEvent;
		
		if(compiledSource) {
			
			wysiwygEditor.isCompiled = true;
			
			var srcHTML = wysiwygEditor.getSourceCodeBody();
			var rawMainHtml = getSourceCodeBody(compiledSource, wysiwygEditor.bodyTagPreview);
			
			var lbSrc = UTIL.determineLineBreakCharacters(srcHTML);
			var lbMain = UTIL.determineLineBreakCharacters(rawMainHtml);
			
			if(wysiwygEditor.lineBreak != lbSrc) throw new Error("lbSrc=" + UTIL.lbChars(lbSrc) + " wysiwygEditor.lineBreak=" + UTIL.lbChars(wysiwygEditor.lineBreak));
			
			
			var lbCountSrcBeforeDiff = UTIL.occurrences(srcHTML, lbSrc);
			var lbCountMainBeforeDiff = UTIL.occurrences(rawMainHtml, lbMain);
			
			wysiwygEditor.ignoreTransform = UTIL.textDiff(srcHTML, rawMainHtml);
			
			// Make sure there are no errors
			
			
			
			var lbCountSrc = UTIL.occurrences(srcHTML, lbSrc);
			var lbCountMain = UTIL.occurrences(rawMainHtml, lbMain);
			
			var removed = wysiwygEditor.ignoreTransform.removed.length;
			var inserted = wysiwygEditor.ignoreTransform.inserted.length;
			
			if( (lbCountSrc - removed) != (lbCountMain - inserted) ) {
				console.log("lbCountSrcBeforeDiff=" + lbCountSrcBeforeDiff);
				console.log("lbCountMainBeforeDiff=" + lbCountMainBeforeDiff);
				
				console.log("wysiwygEditor.lineBreak=" + UTIL.lbChars(wysiwygEditor.lineBreak));
				
				console.log("srcHTML=" + UTIL.lbChars(srcHTML));
				console.log("rawMainHtml=" + UTIL.lbChars(rawMainHtml));
				throw new Error("Not same amount of rows! lbCountSrc=" + lbCountSrc + " (" + UTIL.lbChars(lbSrc) + ") lbCountMain=" + lbCountMain + " (" + UTIL.lbChars(lbMain) + ") removed=" + removed + " inserted=" + inserted + "  diff=" + JSON.stringify(wysiwygEditor.ignoreTransform, null, 2));
			}
			
			console.log("wysiwygEditor.ignoreTransform=" + JSON.stringify(wysiwygEditor.ignoreTransform, null, 2));
			
			wysiwygEditor.setStartRow();
			
			
			if(wysiwygEditor.ignoreTransform.inserted.length > 0) {
				var msg = "Can not edit the page in WYSIWYG mode because of:\n";
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
		else wysiwygEditor.ignoreTransform = null;
		
		wysiwygEditorCounter++;
		
		
		if(!wysiwygEditor.bodyExistInSource()) {
			console.warn("bodyTag=" + wysiwygEditor.bodyTagSource + " does not exist in source code!");
			wysiwygEditor.close();
			return;
		}
		
		wysiwygEditor.setStartRow();
		
		var dance = true;
		
		if(onlyPreview) dance = false;
		
		wysiwygEditor.reload(dance, function firstLoad(err) {
			if(err) {
				if(whenLoaded) return whenLoaded(err);
				else throw err;
			}
			wysiwygEditor.positionate(top, left, width, height);
		});
		
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
	}
	
	WysiwygEditor.prototype.positionate = function positionate(top, left, width, height) {
		var wysiwygEditor = this;
		
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
			
			previewWin.moveTo(posX, posY);
			previewWin.resizeTo(previeWidth, previewHeight);
			
			/*
				wysiwygEditor.screenX = previewWin.screenX || previewWin.screenLeft;
			wysiwygEditor.screenY = previewWin.screenY || previewWin.screenTop;
			wysiwygEditor.innerWidth = previewWin.innerWidth;
			wysiwygEditor.innerHeight = previewWin.innerHeight;
			*/
			
			// Resize the editor
			var editorCodeWindow = window; // gui.Window.get();
			
			editorCodeWindow.moveTo(0, 0);
			editorCodeWindow.resizeTo(screen.width - previeWidth - windowPadding * 2 - unityLeftThingy, screen.height);
		}
		else console.warn("previewWin not available when positionateing!")
	}
	
	
	WysiwygEditor.prototype.getCaretPosition = function getCaretPosition() {
		var wysiwygEditor = this;
		
		// Returns the (parent) element center x,y coordinate and position in the text node
		
		
		var previewWin = wysiwygEditor.previewWin;
		
		var doc = previewWin.window.document;
		
		var selection = doc.getSelection();
		if(selection) {
			/*
				anchorNode/baseNode: Where selection starts
				focusNode/extentNode: Where selection ends
			*/
			
			var baseNode = selection.baseNode ? selection.baseNode : selection.anchorNode
			
			console.log("selection:");
			console.log(selection);
			
			if(baseNode) {
				
				if(baseNode.nodeType == Node.TEXT_NODE) {
					// Measure the parent node (can't measure text nodes)
					var parentNode = baseNode.parentNode; // The basenode is a text node, select the parent node
					var pos = parentNode.getBoundingClientRect();
					console.log("parentNode:");
					console.log(parentNode);
					console.log("parentNode nodeType=" + parentNode.nodeType);
				}
				else if(baseNode.nodeType == Node.ELEMENT_NODE) {
					// The node probably don't have any text yet
					var pos = baseNode.getBoundingClientRect();
					console.log("baseNode:");
					console.log(baseNode);
				}
				else {
					console.log(baseNode);
					throw new Error("Unexpected baseNode nodeType=" + baseNode.nodeType);
				}
				
				if (selection.rangeCount) {
					var selRange = selection.getRangeAt(0);
					var testRange = selRange.cloneRange();
					
					testRange.selectNodeContents(baseNode);
					testRange.setEnd(selRange.startContainer, selRange.startOffset);
					var caretPos = testRange.toString().length;
					
				} else throw new Error("no selection.rangeCount");
				
				// Use top left corner + 1. just in case the node contains child elements (centering could target a child element)
				return {x: Math.round(pos.left + 1), y: Math.round(pos.top + 1), char: caretPos, text: parentNode ? parentNode.innerText : baseNode.innerText };
				
			}
			else throw new Error("no baseNode");
		}
		else throw new Error("Unable to get selection");
		
	}
	
	WysiwygEditor.prototype.placeCaretInSourceCode = function placeCaretInSourceCode(elementFromContentEditable) {
		var wysiwygEditor = this;
		
		// Attempt to place the caret in the source code
		
		var sourceFile = wysiwygEditor.sourceFile;
		
		var innerText = elementFromContentEditable.innerText;
		if(innerText.length == 0) console.log("Element in content-editable does not contain text.");
		else {
			
			var caretPos = wysiwygEditor.getCaretPosition();
			
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
		var previewWin = wysiwygEditor.previewWin;
		
		var doc = previewWin.window.document;
		var element = doc.elementFromPoint(x, y);
		
		if(element == null) {
			alertBox("Unable to get element on x=" + x + " y=" + y);
			return false;
		}
		else {
		var childNode = element.childNodes[0]; // The text node
		
		return wysiwygEditor.placeCaretOnTextNode(childNode, charPos);
		}
	}
	
	WysiwygEditor.prototype.placeCaretOnTextNode = function placeCaretOnTextNode(node, charPos) {
		var wysiwygEditor = this;
		var previewWin = wysiwygEditor.previewWin;
		
		console.log("placing caret on index " + charPos + " on:");
		console.log(node);
		
		var doc = previewWin.window.document;
		var win = previewWin.window;
		
		var range = doc.createRange();
		var sel = win.getSelection();
		
		try {
			range.setStart(node, charPos);
		}
		catch(e) {
			console.warn(e.message);
			return false;
		}
		
		range.collapse(true);
		sel.removeAllRanges();
		sel.addRange(range);
		
		return true;
		
	}
	
	WysiwygEditor.prototype.sourceFileChange = function sourceFileChange(file, type, characters, caretIndex, row, col) {
		var wysiwygEditor = this;
		
		console.log("WysiwygEditor.sourceFileChange type=" + type + " ignoreSourceFileChange=" + wysiwygEditor.ignoreSourceFileChange + " row=" + row + " wysiwygEditor.startRow=" + wysiwygEditor.startRow);
		
		if(wysiwygEditor.ignoreSourceFileChange) return true;
		
		if(!wysiwygEditor.sourceFile) throw new Error("wysiwygEditor.sourceFile=" + wysiwygEditor.sourceFile);
		
		var sourceFile = wysiwygEditor.sourceFile;
		
		if(!file) throw new Error("file=" + file);
		if(!sourceFile) throw new Error("sourceFile=" + sourceFile);
		
		if(file != sourceFile) return true;
		
		if(type == "reload" && wysiwygEditor.isCompiled) return wysiwygEditor.close();
		
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
			
			var dance = false;
			wysiwygEditor.reload(dance);
			return;
		}
		
		console.log("Update wysiwyg for file.path=" + file.path);
		
		// if type=reload need to redo dance
		
		//if(updatePreviewOnChange) clearTimeout(updatePreviewOnChange);
		
		// Delay updating so that we do not render broken tags etc and save some battery
		//updatePreviewOnChange = setTimeout(function() {
		
		
		var body = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
		
		if(!body) throw new Error("Unable to find bodyTagPreview=" + wysiwygEditor.bodyTagPreview + " element!");
		
		var srcHTML = wysiwygEditor.getSourceCodeBody();
		
		// Can not change the file in a fileChange event or it would create an endless loop
		// Witch means we can not sanitize on source code changes,
		// witch also means we can not sanitize on content-editable changes!
		
		setContentEditableBody(body, srcHTML, wysiwygEditor.lineBreak);
		
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
	
	
	WysiwygEditor.prototype.previewKeyup = function previewKeyup(keyUpEvent) {
		var wysiwygEditor = this;
		console.log("previewKeyup! EDITOR.input=" + EDITOR.input);
		
		//keyUpEvent = keyUpEvent || window.event;
		
		var key_S = 83;
		
		// Do not place caret in source code now if text was inserted (we'll do that later)
		// Only place caret if keyboard arrow keys was used to move the caret
		console.log("(keyUpEvent.keyCode=" + keyUpEvent.keyCode);
		if(!EDITOR.input && (keyUpEvent.keyCode == 37 || keyUpEvent.keyCode == 38 || keyUpEvent.keyCode == 39 || keyUpEvent.keyCode == 40)) {
			wysiwygEditor.placeCaretInSourceCode(keyUpEvent.target);
		}
		else if(!EDITOR.input && keyUpEvent.keyCode == key_S && keyUpEvent.ctrlKey) {
			// The user hit Ctrl+S while in the preview window
			EDITOR.saveFile(wysiwygEditor.sourceFile);
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
		
		if(!EDITOR.input && file == wysiwygEditor.sourceFile) wysiwygEditor.placeCaretInSourceCode(e.target);
		
		if(file.path.slice(-3) == "css") {
			console.log("Current file is a CSS file!");
			var fileName = UTIL.getFilenameFromPath(file.path);
			var reStyle = new RegExp('<link.*href=.*' + fileName, "i");
			var win = wysiwygEditor.previewWin.window;
			var doc = win.document;
			var styleSheets = doc.styleSheets;
			var styleSheetFound = false;
			
			for (var i=0; i<styleSheets.length; i++) {
				if(styleSheets[i].href.indexOf(fileName) != -1) {
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
	
	WysiwygEditor.prototype.previewInput = function previewInput(e) {
		console.timeEnd("contentEdit");
		var wysiwygEditor = this;
		
		// Called every time the contenteditable is updated
		// If nothing happends, check the debug/console for the wysiwyg window! (set "toolbar": true, in package.json)
		
		console.log("previewInput!");
		
		
		previewInputFired = true;
		
		var sourceFile = wysiwygEditor.sourceFile;
		var previewWin = wysiwygEditor.previewWin;
		var ignoreTransform = wysiwygEditor.ignoreTransform;
		
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
			
			var srcHTML = wysiwygEditor.getSourceCodeBody();
			
			var body = previewWin.window.document.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
			var prewBodyHtml = wysiwygEditor.getContentEditableCode();
			
			/*
				
				problem 1: Contenteditable produce mangled/garbled HTML code. 
				Contenteditbale change stuff all over the place, for example inserts <tbody> in tables
				
				solution: Beautify the code!
				
				problem 2: The beautifier touches even more stuff, amplifying the nr 1 problem
				solution 2: insert stuff like <tbody> *before* going into WYSIWYG mode
				
			*/
			
			var sanitized = sanitize(prewBodyHtml, wysiwygEditor.lineBreak);
			
			if(sanitized == prewBodyHtml) console.log("No white space sanitiaztion needed"); 
			else {
				
				console.log("prewBodyHtml=\n" + UTIL.debugWhiteSpace(prewBodyHtml) + "\n");
				
				console.log("sanitized=\n" + UTIL.debugWhiteSpace(sanitized) + "\n");
				
				/*
					Problem: contenteditable will lose the caret when the html is updated, 
					this is verry annoying when typing as the cursor jumps
					
					solution: Set the caret again using the selection API 
				*/
				
				var caretPosition = wysiwygEditor.getCaretPosition();
				
				setContentEditableBody(body, sanitized);
				
				prewBodyHtml = wysiwygEditor.getContentEditableCode();
				
				console.log("caretPosition: " + JSON.stringify(caretPosition));
				
				wysiwygEditor.placeCaret(caretPosition.x, caretPosition.y, caretPosition.char);
				
				console.log("Sanitized garbage from WYSIWYG");
				
			}
			
			//console.log("srcHTML=" + UTIL.lbChars(srcHTML));
			//console.log("prewBodyHtml=" + UTIL.lbChars(prewBodyHtml));
			
			// Compare the source with the editable preview
			var diff = UTIL.textDiff(srcHTML, prewBodyHtml);
			
			/*
				Problem: When ignoreTransform removes a diff ...
				
			*/
			
			var ignored = 0;
			if(!ignoreTransform) console.log("Nothing in ignoreTransform");
			else {
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
			
			console.log("diff.removed=" + JSON.stringify(diff.removed, null, 2));
			console.log("diff.inserted=" + JSON.stringify(diff.inserted, null, 2));
			
			// Apply the transformation to the source code ...
			var removedText = "";
			for(var i=0; i<diff.removed.length; i++) {
				console.log("i=" + i + " diff.removed.length=" + diff.removed.length);
				// Remove the text on the line, but do not remove the line (yet)
				row = diff.removed[i].row + startRow;
				
				if(row >= sourceFile.grid.length) throw new Error("row=" + row + " sourceFile.grid.length=" + sourceFile.grid.length + " diff.removed=" + JSON.stringify(diff.removed, null, 2));
				
				if(sourceFile.rowText(row).trim() != diff.removed[i].text.trim()) {
					
					// startRow wrong !?
					console.log("startRow=" + startRow);
					
					for(var j = 0; j<sourceFile.grid.length; j++) console.log(j + ": " + sourceFile.rowText(j));
					
					console.log("source (row=" + row + ")=" + sourceFile.rowText(row).trim());
					console.log("remove=" + diff.removed[i].text.trim());
					console.log("srcHTML=" + UTIL.lbChars(srcHTML))
					console.log("prewBodyHtml=" + UTIL.lbChars(prewBodyHtml));
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
				
				console.log("i=" + i + " diff.removed.length=" + diff.removed.length);
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
		
		// Focus the content-edit window
		wysiwygEditor.previewWin.focus();
		EDITOR.input = false;
		
		console.timeEnd("contentEdit");
		
		sourceFile.checkGrid();
		
	}
	
	
	
	WysiwygEditor.prototype.close = function close() {
		// Clean up and close the window ...
		
		var wysiwygEditor = this;
		
		console.warn("Closing preview window!");
		
		if(wysiwygEditor.fileChangeEventListener) EDITOR.removeEvent("fileChange", wysiwygEditor.fileChangeEventListener);
		
		/*
			body.onmouseup = null;
			body.onkeyup = null;
			body.onselectionchange = null;
			body.onpaste = null;
			body.oninput = null;
		*/
		
		wysiwygEditor.ignoreSourceFileChange = true;
		
		if(wysiwygEditor.previewWin) wysiwygEditor.previewWin.close();
		
		if(wysiwygEditor.onClose) wysiwygEditor.onClose();
		
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
		
		if(document.documentElement) doc = document.documentElement;
		
		return doc.innerHTML;
	}
	
	WysiwygEditor.prototype.getContentEditableCode = function getContentEditableCode() {
		// Returns the innerHTML of body, where the first line break is removed, and also the last line break if there's any
		// The line-breaks needs to be trimmed for the diff to work (see function getSourceCodeBody)
		
		var wysiwygEditor = this;
		
		var win = wysiwygEditor.previewWin.window;
		var doc = win.document; // previewWin.document is not available in nw.js gui
		var body = doc.getElementsByTagName(wysiwygEditor.bodyTagPreview)[0];
		
		var prewHTML = body.innerHTML;
		
		//prewHTML = removeHeadLineBreak(prewHTML);
		
		prewHTML = removeHeadWhiteSpaceAndAddLineBreak(prewHTML, wysiwygEditor.lineBreak);
		prewHTML = removeTailWhiteSpaceAndAddLineBreak(prewHTML, wysiwygEditor.lineBreak);
		
		
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
	
	WysiwygEditor.prototype.getSourceCodeBody = function getSourceCodeBody(sourceFile) {
		// Returns the body of the source HTML code
		
		// In order for the diff to work, we can not start and end on the sam row as the <body> or </body> tags
		// so there needs to be a line-break after <body> and before </body>
		
		
		var wysiwygEditor = this;
		
		var sourceFile = wysiwygEditor.sourceFile;
		
		var srcMatchBody = sourceFile.text.match(regexBody(wysiwygEditor.bodyTagSource));
		
		var srcHTML;
		
		if(srcMatchBody == null) {
			//alertBox("Can not find body-tags with line breaks!");
			
			// just warn, then stop where getSourceCodeBody() is called, and try to fix the problem !?
			
			console.log("sourceFile.text=" + UTIL.lbChars(sourceFile.text));
			throw new Error("Could not find wysiwygEditor.bodyTagSource=" + wysiwygEditor.bodyTagSource + " element in source file:\n" + sourceFile.path + "");
		}
		
		srcHTML = srcMatchBody[1];
		
		srcHTML = removeHeadWhiteSpaceAndAddLineBreak(srcHTML, wysiwygEditor.lineBreak);
		srcHTML = removeTailWhiteSpaceAndAddLineBreak(srcHTML, wysiwygEditor.lineBreak);
		
		
		return srcHTML;
		
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
	
	WysiwygEditor.prototype.reload = function reload(dance, reloadCallback) {
		var wysiwygEditor = this;
		
		console.warn("(re)loading preview window ... dance=" + dance);
		
		if(dance == undefined) throw new Error("Shall we WYSIWYG dance ? First argument in WysiwygEditor.reload()");
		// dance=true means the source code will be updated with the code we'll get after loading the contenteditable.
		// it will for example insert <tbody> elements and possibly more depending on browser
		
		if(wysiwygEditor.isCompiled && wysiwygEditor.hasLoaded) throw new Error("Can not reload a second time if the source code have been compiled");
		
		
		// Reload with new HTML ...
		
		wysiwygEditor.ignoreSourceFileChange = true;
		
		var previewWin = wysiwygEditor.previewWin;
		var gotError = false;
		
		try {
			previewWin.blur();
		}
		catch(err) {
			wysiwygEditor.close();
			if(reloadCallback) reloadCallback(err);
			else alertBox("Unable to blur the window. Has it been cloed !? " + err.message);
			return;
			}
		
		
		// Adding DOMContentLoaded event and onreadystatechange event seems to slow down the load time enough to capture early errors !? Nope
		
		previewWin.document.addEventListener('DOMContentLoaded', function(ev) {
			console.log("DOMContentLoaded:");
			console.log(ev);
		});
		
		previewWin.onreadystatechange = function(readystatechangeEvent) {
			console.log("readystatechangeEvent:");
			console.log(readystatechangeEvent);
			if (previewWin.document.readyState === 'complete') {
				//dom is ready, window.onload fires later
				alertBox("document complete!");
			}
		};
		
		
		var sourceFile = wysiwygEditor.sourceFile;
		var html = sourceFile.text;
		
		//previewWin.onload = previewWindowLoaded;
		
		var checkLocationMaxTries = 100;
		var checkLocationTries = 0;
		
		if(wysiwygEditor.url && previewWin.location.href != wysiwygEditor.url) {
			
			//console.log(previewWin);
			//console.log(previewWin.window);
			//console.log(previewWin.document);
			
			console.log("Setting window url to wysiwygEditor.url=" + wysiwygEditor.url +
			" because wysiwygEditor.url=" + wysiwygEditor.url + " is not the same as previewWin.location.href=" + previewWin.location.href);
			
			//console.log("previewWin.window.location.href=" + previewWin.window.location.href);
			//console.log("previewWin.location.href=" + previewWin.location.href);
			
			
			// Can't seem to be able to set a onload event listener ...
			// problem: We wont be able to capture early event! (like errors before we have attacked the error event listener)
			// solution: none :(
			var checkLocationIntervalTime = 100;
			setTimeout(checkLocation, checkLocationIntervalTime);
			
			/*
				
			
			previewWin.addEventListener("load", function(ev) {
				alert("previewWin load event!");
			});
			
			previewWin.window.addEventListener("load", function(ev) {
				alert("previewWin window load event!");
			});
			*/
			
			//var oldWindow = previewWin.window;
			//while(oldWindow == previewWin.window) console.log("waiting ....");
			
			previewWin.location.href = wysiwygEditor.url;
			
		}
		else if(wysiwygEditor.url && previewWin.location.href == wysiwygEditor.url) {
			console.log("Reloading the window!");
			wysiwygEditor.isReloading = true;
			previewWin.location.reload();
			
			var checkLocationIntervalTime = 100;
			setTimeout(checkLocation, checkLocationIntervalTime);
		}
		else if(!wysiwygEditor.url) {
			
			//previewWin.location.href = "about:blank";
			// Write the html to the content-editable
			console.log("Writing html=" + UTIL.lbChars(html));
			
			previewWin.document.open();
			previewWin.document.write(html);
			previewWin.document.close();
			
			previewWindowLoaded();
		}
		else {
			throw new Error("What to do ? wysiwygEditor.url=" + wysiwygEditor.url + " previewWin.location.href=" + previewWin.location.href);
		}
		
		function checkLocation() {
			
			console.log("reload:checkLocation");
			
			/*
				previewWin.location.href=http://127.0.0.1:8080/testpage.htm
				wysiwygEditor.url=http://b9u41v9BFM:123@127.0.0.1:8080/testpage.htm
			*/
			
			checkLocationTries++;
			
			var url = wysiwygEditor.url;
			
			var matchAuth = url.match(/^http(s)?:\/\/(.*:.*@)/);
			if(matchAuth) url = url.replace(matchAuth[2], "");
			
			try {
				var test = previewWin.location.href;
			}
			catch(err) {
				var myError = new Error("Unable to access: " + url + "!\n" + err.message);
				if(reloadCallback) reloadCallback(myError);
				else alertBox(myError.message);
				wysiwygEditor.close();
				return;
			}
			
			if(previewWin.location.href == url) {
previewWindowLoaded();
			}
			else if(previewWin.location.href) {
				console.log("previewWin.location.href=" + previewWin.location.href + " wysiwygEditor.url=" + wysiwygEditor.url + " url=" + url);
				
				if(checkLocationTries > checkLocationMaxTries) {
					var err = new Error("Failed to get location from preview window after reload! (Did you close it ?) URL=" + url);
					
					if(reloadCallback) reloadCallback(err);
					else alertBox(err.message);
				}
				else setTimeout(checkLocation, checkLocationIntervalTime);
			}
			else {
				console.log(previewWin);
				var err = new Error("Unable to get location from previewWin. Did the window close !?");
				
				if(reloadCallback) reloadCallback(err);
				else alertBox(err.message);
				
				wysiwygEditor.close();
				}
		}
		
		
		function previewWindowLoaded(retries) {
			
			if(retries == undefined) retries = 0;
			
			console.log("Preview window loaded!");
			
			// Get the doc again after location reload
			var doc = previewWin.document;
			var win = previewWin.window;
			
			if(!doc.documentElement) {
				if(retries < 5) {
					console.log("Unable to get doc.documentElement. The document might not be fully loaded. Retrying ...");
					return setTimeout(function() {
						previewWindowLoaded(++retries);
					}, 150);
				}
				else {
					console.log(doc);
					console.log(win);
					throw new Error("Failed to get doc.documentElement after " + retries + " retries.");
				}
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
			
			if(bodyTags.length === 0) {
				// The user probably have an open html tag above the body element
				// or the document is not yet fully loaded !?
				console.warn("previewWin dont have a body tag!");
				
				if(retries < 10) {
					console.log("The document might not be fully loaded. Retrying ...");
					return setTimeout(function() {
					previewWindowLoaded(++retries);
					}, 150);
				}
				else if(wysiwygEditor.isCompiled) {
					var err = new Error("Unable to find wysiwygEditor.bodyTagPreview=" + wysiwygEditor.bodyTagPreview + " in preview window! doc.documentElement.innerHTML=" + doc.documentElement.innerHTML);
					
					if(reloadCallback) reloadCallback(err);
					else throw err;
				}
				
				attachFileChangeListener(wysiwygEditor);
				
				return done();
			}
			
			var body = bodyTags[0];
			
			if(dance) {
				// We need to dance to make sure source code and content-editable code is the same ...
				
				var srcHtmlBeforeDance = wysiwygEditor.getSourceCodeBody();
				
				// Need to know line break convention before getting the content-editable code!
				console.log("WYSIWYG determine line break convention:");
				wysiwygEditor.lineBreak = UTIL.determineLineBreakCharacters(body.innerHTML); 
				
				// Get the html from content-editable, (tbody, and other html "fixes" might have been inserted)
				var prewBodyHtml = wysiwygEditor.getContentEditableCode();
				console.log("(after write) prewBodyHtml=" + UTIL.lbChars(prewBodyHtml));
				
				// Sanitize (add line break etc) to the content-editable code
				var sanitazed = sanitize(prewBodyHtml, wysiwygEditor.lineBreak);
				
				if(sanitazed != prewBodyHtml) {
					setContentEditableBody(body, sanitazed);
					prewBodyHtml = wysiwygEditor.getContentEditableCode();
					console.log("(after sanitation) prewBodyHtml=" + UTIL.lbChars(prewBodyHtml));
				}
				
				// Use the contenteditable line break convention in the source file to make life easier
				if(wysiwygEditor.lineBreak != sourceFile.lineBreak) {
					var regCurrentLineBreaks = new RegExp(sourceFile.lineBreak, "g");
					html = html.replace(regCurrentLineBreaks, wysiwygEditor.lineBreak);
					console.log("Replaced line breaks in source code: html=" + UTIL.lbChars(html));
				}
				
				// Replace the the content of the body element with the content-editable code
				html = changeCodeInBody(prewBodyHtml, html, wysiwygEditor.bodyTagSource);
				
				console.log("(after setting) html=" + UTIL.lbChars(html));
				
				sourceFile.reload(html);
				
				// Finally make the body of the source file the body of the content-editable
				var srcHTML = wysiwygEditor.getSourceCodeBody();
				setContentEditableBody(body, srcHTML, wysiwygEditor.lineBreak);
				
				
				// The source code and content-editable should now have the same line breaks!
				
				console.log("(after) srcHTML=" + UTIL.lbChars(srcHTML));
				
				// The source code and content editable code should now be the same!
				if(wysiwygEditor.getContentEditableCode() != srcHTML) {
					throw new Error("Source code does not match!\n \
					wysiwygEditor.getContentEditableCode()=" + UTIL.lbChars(wysiwygEditor.getContentEditableCode()) + "\n\n\
					srcHTML=" + UTIL.lbChars(srcHTML) + "\n\n\
					diff=" + JSON.stringify(UTIL.textDiff(wysiwygEditor.getContentEditableCode(), srcHTML, null, 2)));
				}
				
				sourceFile.checkGrid();
				
				// Problem: The source code and a "compiled" page might diff a lot
				// Solution: .... ???
				
				var danceDiff = UTIL.textDiff(srcHtmlBeforeDance, srcHTML);
				console.log("danceDiff=" + JSON.stringify(danceDiff, null, 2));
				
				// It's ok to add new lines, but not OK to add new content
				
				// Only index and xml pages can contain server code! So we do not need to worry about that
				
			}
			
			body.onmouseup = function(e) {wysiwygEditor.previewMouseup(e);}
			
			if(!wysiwygEditor.onlyPreview) {
				// Make body editable and attatch event listeners
				
				body.setAttribute("contenteditable", "true");
				
				body.onkeyup = function(e) {wysiwygEditor.previewKeyup(e)};
				body.onselectionchange = function(e) {wysiwygEditor.previewSelectionchange(e)};
				body.onpaste = function(e) {wysiwygEditor.previewPaste(e, doc)};
				
				// body.input doesn't work on nw.js gui, has to use window instead
				//body.input = function(e) {wysiwygEditor.previewInput(e)};
				body.oninput = function(e) {wysiwygEditor.previewInput(e)};
				//win.addEventListener("input", function(e) {wysiwygEditor.previewInput(e)});
			}
			else console.log("wysiwygEditor.onlyPreview=" + wysiwygEditor.onlyPreview);
			
			// Capture F5 and make a soft reload
			previewWin.window.onkeydown = function keyDown(keyDownEvent) {
				//console.log("previewWin.window.onkeydown:", keyDownEvent);
				var keyF5 = 116;
				if(keyDownEvent.keyCode == keyF5) {
					keyDownEvent.preventDefault();
					wysiwygEditor.reload(dance);
					return false;
				}
				else return true;
			};
			
			
			attachFileChangeListener(wysiwygEditor);
			
			// Remove the fileChange event listener when closing the content-editable window
			previewWin.window.onbeforeunload = function() {
				if(wysiwygEditor.isReloading) wysiwygEditor.isReloading = false;
				else wysiwygEditor.close();
				//return true; // Shows a "are you sure" message
			};
			
			// Capture errors on the content-editable so that they do not go by unoticed
			previewWin.window.addEventListener("error", function(errorEvent) {
				// https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent
				if(wysiwygEditor.onErrorEvent) wysiwygEditor.onErrorEvent(errorEvent);
				else {
					var message = errorEvent.message;
					alertBox(message ? message : "There was an error in the WYSIWYG editor!\nCheck the developer console for the WYSIWYG window for error details ...");
					console.error(errorEvent.error);
				}
			});
			
			done();
			
			function done() {
				wysiwygEditor.hasLoaded = true;
					
				if(wysiwygEditor.whenLoaded) wysiwygEditor.whenLoaded(null, wysiwygEditor.sourceFile, wysiwygEditor.previewWin);
					wysiwygEditor.whenLoaded = null;
					
					console.log("Done (re)loading preview window");
					
				if(reloadCallback) reloadCallback(null);
					
					if(wysiwygEditor.onLoad) wysiwygEditor.onLoad();
				
				wysiwygEditor.ignoreSourceFileChange = false;
				
			}
				
			}
		
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
	
	
	function attachFileChangeListener(wysiwygEditor) {
		// fileChange wants an uniqe function name ...
		console.log("Unique function name for fileChange event:");
		var name = "wysiwygEditor" + wysiwygEditorCounter;
		var customAction = function(file, type, characters, caretIndex, row, col) {
			wysiwygEditor.sourceFileChange(file, type, characters, caretIndex, row, col);
		}
		var func = new Function("action", "return function " + name + "(file, type, characters, caretIndex, row, col){ action(file, type, characters, caretIndex, row, col) };")(customAction);
		
		if(wysiwygEditor.fileChangeEventListener) EDITOR.removeEvent("fileChange", wysiwygEditor.fileChangeEventListener);
		
		EDITOR.on("fileChange", func);
		
		wysiwygEditor.fileChangeEventListener = func;
		
		wysiwygEditor.ignoreSourceFileChange = false;
	}
	
	
	function changeCodeInBody(newBodyCode, html, bodyTag) {
		
		// There need to be a line break directly after <body> and before </body> !
		// This is to prevent having the body tags included in text diff
		
		var regCheck = regexBody(bodyTag);
		
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
		if(html.match(regCheck) === null) throw new Error("We are not sane!\n\
		html=" + UTIL.lbChars(html));
		
		return html;
	}
	
	
	
	function setContentEditableBody(body, srcHTML, lb) {
		
		body.innerHTML = srcHTML;
		
		// Do not need to pad the code with line breaks! 
		// Only the source code need to have line breaks before body tags!
		// The diff campares innerHTML with source code without the lines of the body elements
		
		//body.innerHTML = lb + srcHTML + lb;
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
		
		html = insertLineBreaks(html, LB)
		
		return html;
	}
	
	EDITOR.addTest(function testInsertLineBreaks(callback) {
		// bug: Adding a space in the content-editable moves it cursor to the top
		var str1 = "\n<p>abc <br></p>\n";
		
		var str2 = insertLineBreaks(str1, "\n");
		
		if(str1 != str2) throw new Error("Trimmed white space where it should not!\nstr1=" + UTIL.lbChars(str1) + "\nstr2=" + UTIL.lbChars(str2));
		
		callback(true);
		
	});
	
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
	
	function getSourceCodeBody(fileText, bodyTag, lineBreak) {
		
		if(fileText == undefined) throw new Error("Need fileText");
		if(bodyTag == undefined) {
			bodyTag = "body";
			console.warn("Using bodyTag=" + bodyTag);
		}
		if(lineBreak == undefined) lineBreak = UTIL.determineLineBreakCharacters(fileText);
		
		// In order for the diff to work, we can not start and end on the sam row as the <body> or </body> tags
		// so there needs to be a line-break after <body> and before </body>
		
		var srcMatchBody = fileText.match(regexBody(bodyTag));
		
		if(srcMatchBody == null) {
			console.log(fileText);
			throw new Error("Can not find bodyTag=" + bodyTag + " with line breaks!");
		}
		
		var bodyHtml = srcMatchBody[1];
		
		bodyHtml = removeHeadWhiteSpaceAndAddLineBreak(bodyHtml, lineBreak);
		bodyHtml = removeTailWhiteSpaceAndAddLineBreak(bodyHtml, lineBreak);
		
		return bodyHtml;
		
	}
	
	function regexBody(bodyTag) {
		//var body = /<body[^>]*>\s*[\n|\r\n]([\s\S]*)[\n|\r\n]\s*<\/body>/i;
		
		if(bodyTag == undefined) throw new Error("No bodyTag=" + bodyTag + " defined!")
		
		console.log("Returning regexp for bodyTag=" + bodyTag);
		
		return new RegExp("<" + bodyTag + "[^>]*>\\s*[\\n|\\r\n]([\\s\\S]*)[\\n|\\r\\n]\\s*<\\/" + bodyTag + ">", "i");
		
	}
	
	
	// ### Test(s)
	
	
	EDITOR.addTest(function testStartRowN(callback) {
		var html = '<html><body>\nHello\nWorld\n</body></html>';
		EDITOR.openFile("wysiwygEditorTestStartRowN.htm", html, function(err, file) {
			var wysiwygEditor = {
				lineBreak: "\n",
				bodyTagSource: "body",
				sourceFile: file
			};
			WysiwygEditor.prototype.setStartRow.call(wysiwygEditor);
			
			if(wysiwygEditor.startRow != 1) throw new Error("Expected wysiwygEditor.startRow=" + wysiwygEditor.startRow + " to be 1");
			
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
			
			var source = WysiwygEditor.prototype.getSourceCodeBody.call(wysiwygEditor);
			
			console.log("source=" + UTIL.lbChars(source));
			
			EDITOR.closeFile(file.path);
			
			callback(true);
		});
		
	});
	
	
	
})();
