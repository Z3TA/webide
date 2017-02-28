var WysiwygEditor;

(function() {
	"use strict";

	var wysiwygEditorCounter = 0; // WysiwygEditor instances
	
	WysiwygEditor = function WysiwygEditor(sourceFile, bodyTag) {
	var wysiwygEditor = this;
	
		wysiwygEditorCounter++;
		
		if(!sourceFile) throw new Error("sourceFile=" + sourceFile);
		
		wysiwygEditor.bodyTag = bodyTag || "body";
		
		wysiwygEditor.ignoreTransform = null; // computeIgnoreTransform(srcHTML, rawMainHtml)
		
		wysiwygEditor.sourceFile = sourceFile;
		if(!wysiwygEditor.sourceFile) throw new Error("wysiwygEditor.sourceFile=" + wysiwygEditor.sourceFile);
		
	// Make sure file is a HTML file
		if(!isHTML(sourceFile)) throw new Error("sourceFile (" + getFilenameFromPath(sourceFile.path) + ") is not a HTML file!");
	
		// Decide window width, height and placement ...
		var windowPadding = 0;
		var unityLeftThingy = 10;
		var previeWidth = Math.round(screen.width / 3.5) - windowPadding * 2;
		var previewHeight = screen.height - windowPadding * 2;
		var posX = screen.width - previeWidth - windowPadding;
		var posY = windowPadding;
		
		
		// Can not use require if using window.open! 
		//var previewWin = window.open("", "previewWin", "width=" + previeWidth + ",height=" + previewHeight + "");
		var gui = require('nw.gui'); // nw.js UI library
		var url = "about:blank";
		var previewWin = gui.Window.open(url, {toolbar:true, frame:true, width: previeWidth, height: previewHeight});
		// Show the toolbar so you can see the URL, and open dev tools
		
		// KANSKE INTE BEHÖVER ANV'NDA NW.GUI '
		
		wysiwygEditor.previewWin = previewWin;
		
		// previewWin.document.innerHTML dont work with window.open!
		
		// nw.js gui is async! (can't acess previewWin.window right away)
		previewWin.on("loaded", previewWinLoaded);
		
		
	
		function previewWinLoaded() {
			//var doc = previewWin.document;
			
			var win = previewWin.window;
			var doc = win.document; // previewWin.document is not available in nw.js gui
			
			// We need to dance to make sure source code and content-editable code is the same ...
			
			var text = sourceFile.text;
			
			console.log("(original) text=" + lbChars(text));
			
			// 1. Write the text to the content-editable
			doc.write(text);
			
			// 2. Get the text from content-editable, (tbody, and other html "fixes" might have been inserted)
			var body = doc.getElementsByTagName(wysiwygEditor.bodyTag)[0];
			var prewBodyHtml = body.innerHTML;
			
			console.log("(after write) prewBodyHtml=" + lbChars(prewBodyHtml));
			
			// 3. Use the contenteditable line break convention in the source file to make life easier
			var lineBreak = determineLineBreakCharacters(prewBodyHtml);
			if(lineBreak != sourceFile.lineBreak) {
			var regCurrentLineBreaks = new RegExp(sourceFile.lineBreak, "g");
			text = text.replace(regCurrentLineBreaks, lineBreak);
				}
			
			// 4. Replace the the content of the body element with the content-editable code
			text = setSourceCodeBody(text, prewBodyHtml);
			
			
			sourceFile.reload(text);
			
			// 5. Finally make the body of the source file the body of the content-editable
			var srcHTML = getSourceCodeBody(sourceFile);
			body.innerHTML = srcHTML;
			
			// The source code and content-editable should now have the same line breaks!
			
			console.log("(after) srcHTML=" + lbChars(srcHTML));
			
			// The source code and content editable code should now be the same!
			if(body.innerHTML != srcHTML) {
				throw new Error("Source code does not match!\n \
				body.innerHTML=" + lbChars(body.innerHTML) + "\n\n\
				srcHTML=" + lbChars(srcHTML) + "\n\n\
				diff=" + JSON.stringify(textDiff(body.innerHTML, srcHTML, null, 2)));
			}
			
			sourceFile.checkGrid();
			
			body.setAttribute("contenteditable", "true");
			
			
			body.onmouseup = function(e) {wysiwygEditor.previewMouseup(e);}
			body.onkeyup = function(e) {wysiwygEditor.previewKeyup(e)};
			body.onselectionchange = function(e) {wysiwygEditor.previewSelectionchange(e)};
			body.onpaste = function(e) {wysiwygEditor.previewPase(e)};
			
			// body.input doesn't work on nw.js gui, has to use window instead
			//body.input = function(e) {wysiwygEditor.previewInput(e)};
			body.oninput = function(e) {wysiwygEditor.previewInput(e)};
			//win.addEventListener("input", function(e) {wysiwygEditor.previewInput(e)});
			
			
			// fileChange wants an uniqe function name ...
			console.log("Unique function name for fileChange event:");
			var name = "wysiwygEditor" + wysiwygEditorCounter;
			var customAction = function(file, type, characters, caretIndex, row, col) {
				wysiwygEditor.sourceFileChange(file, type, characters, caretIndex, row, col);
			}
			var func = new Function("action", "return function " + name + "(file, type, characters, caretIndex, row, col){ action(file, type, characters, caretIndex, row, col) };")(customAction);
			editor.on("fileChange", func);
				
			// Remove the fileChange event listener when closing the content-editable window
			previewWin.window.onbeforeunload = function() {
				editor.removeEvent("fileChange", func);
			};
			
				
				previewWin.moveTo(posX, posY);
				previewWin.resizeTo(previeWidth, previewHeight);
				
				
				
				// Resize the editor
				var editorCodeWindow = window; // gui.Window.get();
				
				editorCodeWindow.moveTo(0, 0);
				editorCodeWindow.resizeTo(screen.width - previeWidth - windowPadding * 2 - unityLeftThingy, screen.height);
				
				previewWin.focus();
			}
	
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
			
			var baseNode = doc.getSelection().baseNode
			
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
				return {x: Math.round(pos.left + 1), y: Math.round(pos.top + 1), char: caretPos};
				
			}
			else throw new Error("no baseNode");
		}
		else throw new Error("Unable to get selection");
		
	}
	
	WysiwygEditor.prototype.placeCaret = function placeCaret(x, y, charPos) {
	var wysiwygEditor = this;
	var previewWin = wysiwygEditor.previewWin;
	
		var doc = previewWin.window.document;
		var element = doc.elementFromPoint(x, y);
		var childNode = element.childNodes[0]; // The text node
		
		return wysiwygEditor.placeCaretOnTextNode(childNode, charPos);
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
		
		if(!wysiwygEditor.sourceFile) throw new Error("wysiwygEditor.sourceFile=" + wysiwygEditor.sourceFile);
		
		var sourceFile = wysiwygEditor.sourceFile;
		
		if(!file) throw new Error("file=" + file);
		if(!sourceFile) throw new Error("sourceFile=" + sourceFile);
		
		if(file == sourceFile) {
			
			console.log("Update wysiwyg for file.path=" + file.path);
			
			// if type=reload need to redo dance
			
			//if(updatePreviewOnChange) clearTimeout(updatePreviewOnChange);
			
			// Delay updating so that we do not render broken tags etc and save some battery
			//updatePreviewOnChange = setTimeout(function() {
			
			var previewWin = wysiwygEditor.previewWin;
			
			var doc = previewWin.window.document;
			
			var body = doc.getElementsByTagName(wysiwygEditor.bodyTag)[0];
			
			//var prewBodyHtml = body.innerHTML;
			var srcHTML = getSourceCodeBody(sourceFile);
			
			// Can not change the file in a fileChange event or it would create an endless loop
			// Witch means we can not sanitize on source code changes,
			// witch also means we can not sanitize on content-editable canges!
			
			body.innerHTML = srcHTML;
			
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
		} 
		//else console.log("File is not the source file! sourceFile.path=" + sourceFile.path + " file.path=" + file.path);
		
		//ignoreTransform = textDiff(srcHTML, main.innerHTML);
		
		//}, 3000);
		
		return true;
	}
	
	
	WysiwygEditor.prototype.previewKeyup = function previewKeyup(e) {
		console.log("previewKeyup!");
		console.log(e.target);
	}
	
	WysiwygEditor.prototype.previewMouseup = function previewMouseup(e) {
		console.log("previewMouseup!");
		console.log(e.target);
	}
	
	WysiwygEditor.prototype.previewSelectionchange = function previewSelectionchange(e) {
		console.log("previewSelectionchange!");
		console.log(e.target);
	}
	
	WysiwygEditor.prototype.previewPaste = function previewPaste(e) {
		var wysiwygEditor = this;
		
		console.log("previewPaste!");
		
		var html = e.clipboardData.getData('text/html');
		
		e.preventDefault();
		
		var cleaned = html;
		
		cleaned = sanitizeOfficeDoc(cleaned);
		
		cleaned = sanitize(cleaned, wysiwygEditor.sourceFile.lineBreak);
		
		
		contentEditor.execCommand("insertHTML", aShowDefaultUI, cleaned);
		
	}
	
	WysiwygEditor.prototype.previewInput = function previewInput(e) {
		var wysiwygEditor = this;
		
		// Called every time the contenteditable is updated
		// If nothing happends, check the debug/console for the wysiwyg window! (set "toolbar": true, in package.json)
		
		console.log("previewInput!");
		
		var sourceFile = wysiwygEditor.sourceFile;
		var previewWin = wysiwygEditor.previewWin;
		var ignoreTransform = wysiwygEditor.ignoreTransform;
		
		if(!sourceFile) throw new Error("sourceFile=" + sourceFile)
		else if(!editor.files.hasOwnProperty(sourceFile.path)) alertBox("The source for the file being previewed is not opened!")
		else {
			
			sourceFile.checkGrid();
			
			if(sourceFile != editor.currentFile) {
				// alertBox("The file in the editor is not the same as the file being previewed! sourceFile=" + sourceFile.path + " editor.currentFile=" + editor.currentFile.path)
				editor.showFile(sourceFile, false);
			}
			
			// Compare the source codes
			var srcHTML = getSourceCodeBody(sourceFile);
			
			if(!srcHTML) throw new Error("Unable to get source HTML from sourceFile.path=" + sourceFile.path);
			else {
				
				var body = previewWin.window.document.getElementsByTagName(wysiwygEditor.bodyTag)[0];
				var prewBodyHtml = body.innerHTML; //previewWin.window.document.body.innerHTML;
				
				/*
					problem 1: Contenteditable produce mangled/garbled HTML code.
					Contenteditbale change stuff all over the place, for example inserts <tbody> in tables
					
					solution: Beautify the code!
					
					problem 2: The beautifier touches even more stuff, amplifying the nr 1 problem
					solution 2: insert stuff like <tbody> *before* going into WYSIWYG mode
					
				*/
				
				
				// Compare the source with the editable preview
				var diff = textDiff(srcHTML, prewBodyHtml, ignoreTransform);
				
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
				
				
				var srcStartIndex = sourceFile.text.indexOf(srcHTML);
				
				if(srcStartIndex == -1) throw new Error("The source file doesn't contain the source code ... sourceFile=" + sourceFile.path + " srcHTML=" + srcHTML);
				
				console.log("srcStartIndex=" + srcStartIndex);
				
				var tmpCaret = sourceFile.createCaret(srcStartIndex);
				
				var startRow = tmpCaret.row;
				
				console.log("source startRow=" + startRow);
				
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
					
					if(sourceFile.rowText(row).trim() != diff.removed[i].text.trim()) {
						throw new Error("Text on row=" + row + " doesn't match!\nsource=" + sourceFile.rowText(row).trim() + "\nremove=" + diff.removed[i].text.trim() + "\ndiff=" + JSON.stringify(diff, null, 2) + "\n\nsrcHTML=" + lbChars(srcHTML) + "\n\nprewBodyHtml=" + lbChars(prewBodyHtml));
					}
					
					removedText = sourceFile.removeAllTextOnRow(row);
					
					if(removedText.match(/\n|\r\n/)) throw new Error("Did not expect a new line character to be removed! removedText=" + lbChars(removedText));
					
					if(removedText.trim() != diff.removed[i].text) throw new Error("Text missmatch!\n" + lbChars(removedText) + " = removedText\n" + lbChars(diff.removed[i].text) + " = diff.removed[" + i + "].text");
					
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
							col= textDiffCol(diff.removed[i].text, diff.inserted[j].text);
							
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
				
				// after the transformation: Update what should be ignored again? nope
				//var srcHTML = getSourceCodeBody(sourceFile);
				//var prewBodyHtml = body.innerHTML;
				//ignoreTransform = textDiff(srcHTML, body.innerHTML);
				
				//alert("Transformed source document!");
				
			}
			
		}
		
		console.timeEnd("contentEdit");
		
		
	}
	
	function getSourceCodeBody(sourceFile) {
		// Returns the body of the source HTML code
		var srcMatchBody = sourceFile.text.match(/<body.*>([\s\S]*)<\/body>/i);
		
		if(srcMatchBody == null) {
			console.warn("Could not find &lt;body element in source file<br>" + sourceFile.path);
			return sourceFile.text;
		}
		else return srcMatchBody[1];
	}
	
	function setSourceCodeBody(text, bodyHtml) {
		return text.replace(/<body(.*)>([\s\S]*)<\/body>/i, "<body$1>" + bodyHtml + "</body>");
	}
	
	function isHTML(file) {
		
		var type = getFileExtension(file.path);
		
		if(!file.text.match(/<body.*>([\s\S]*)<\/body>/i)) {
			console.warn("Source document must have a <body> tag!");
			return false;
		}
		
		if(type.match(/htm|html/i)) return true;
		else if(file.text.match(/<DOCTYPE HTML/i)) return true;
		else return false;
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
		// witch also means we can not sanitize on content-editable canges!
		
		html = insertLineBreaks(html, LB)
		
		return html;
	}
	
	function insertLineBreaks(html, LB) {
		
		// Add line breaks so the source code gets easier to read
		
		// Make sure the line breaks at the beginning stays there, or there will be errors in the text transformation!
		
		
		var lbBefore = checkStartingLineBreaks();
		
		
		console.log("inserting (sanitizing) line breaks. LB=" + lbChars(LB));
		
		console.time("insertLineBreaks");
		
		// Remove space between tags
		html = html.replace(/>\s*</gi, "><");
		
		// Remove space before tags
		html = html.replace(/\s*</gi, "<");
		
		
		// Line breaks between p tags
		html = html.replace(/>\s*<p/gi, ">" + LB + LB + "<p");
		html = html.replace(/<\/p>\s*</gi, "</p>" + LB + LB + "<");
		
		// Line breaks between h# tags
		html = html.replace(/>\s*<h/gi, ">" + LB + LB + "<h");
		html = html.replace(/<\/h(.)>\s*</gi, "</h$1>" + LB + LB + "<");
		
		// Line breaks between div tags
		html = html.replace(/>\s*<div/gi, ">" + LB + LB + "<div");
		html = html.replace(/<\/div>\s*</gi, "</div>" + LB + LB + "<");
		
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
	
	function computeIgnoreTransform(srcHTML, rawMainHtml) {
		
		// Make sure they end with a line break
		
		
		
		
		ignoreTransform = textDiff(srcHTML, rawMainHtml);
		
		// Make sure there are no errors
		var lbSrc = occurrences(srcHTML, "\n");
		var lbMain = occurrences(rawMainHtml, "\n");
		var removed = ignoreTransform.removed.length;
		var inserted = ignoreTransform.inserted.length;
		
		if( (lbSrc - removed) != (lbMain - inserted) ) {
			throw new Error("Not same amount of rows! lbSrc=" + lbSrc + " lbMain=" + lbMain + " removed=" + removed + " inserted=" + inserted + "  diff=" + JSON.stringify(ignoreTransform, null, 2));
		}
		
		return ignoreTransform;
	}
	
})();