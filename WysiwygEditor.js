var WysiwygEditor;

(function() {
	"use strict";

	WysiwygEditor = function WysiwygEditor(file, bodyTag) {
	var wysiwygEditor = this;
	
		wysiwygEditor.bodyTag = bodyTag || "body";
		
	// Make sure file is a HTML file
	if(!isHTML(file)) throw new Error("file (" + getFilenameFromPath(file.path) + ") is not a HTML file!");
	
	var previewWin = window.open("", "previewWin", "width=350,height=150");
	//previewWin.document.write("Here's your popup!");
	
		
		// previewWin.document.innerHTML dont work!
		previewWin.document.write(file.text);
		
		var body = previewWin.document.body;
		
		// Make sure the source code body and the pewview body is the same (tbody etc will be insterd!)
		console.log("body.innerHTML=" + body.innerHTML);
		
		var text = file.text.replace(/<body(.*)>([\s\S]*)<\/body>/i, "<body$1>" + body.innerHTML + "</body>");
		
		console.log("text=" + text);
		
		file.reload(text);
		
		
		editor.on("fileChange", wysiwygEditor.sourceFileChange);
		
		
	body.setAttribute("contenteditable", "true");
	
		body.onmousedown = wysiwygEditor.previewMousedown;
		body.onkeyup = wysiwygEditor.previewKeyup;
		body.onselectionchange = wysiwygEditor.previewSelectionchange;
		
	// Decide window width, height and placement ...
	var windowPadding = 0;
	var unityLeftThingy = 10;
	var previeWidth = Math.round(screen.width / 3.5) - windowPadding * 2;
	var previewHeight = screen.height - windowPadding * 2;
	var posX = screen.width - previeWidth - windowPadding;
	var posY = windowPadding;
	
	previewWin.moveTo(posX, posY);
	previewWin.resizeTo(previeWidth, previewHeight);
	
	
	
	// Resize the editor
	var mainWindow = window; // gui.Window.get();
	
	mainWindow.moveTo(0, 0);
	mainWindow.resizeTo(screen.width - previeWidth - windowPadding * 2 - unityLeftThingy, screen.height);
	
	
	wysiwygEditor.previewWin = previewWin;
	wysiwygEditor.sourceFile = file;
	
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
	
WysiwygEditor.prototype.placeCaret = function placeCaret(previewWin, x, y, charPos) {
	var wysiwygEditor = this;
	var previewWin = wysiwygEditor.previewWin;
	
		var doc = previewWin.window.document;
		var element = doc.elementFromPoint(x, y);
		var childNode = element.childNodes[0]; // The text node
		
		return placeCaretOnTextNode(childNode, charPos);
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
		
		var sourceFile = wysiwygEditor.sourceFile;
		
		if(file == sourceFile) {
			
			//if(updatePreviewOnChange) clearTimeout(updatePreviewOnChange);
			
			// Delay updating so that we do not render broken tags etc and save some battery
			//updatePreviewOnChange = setTimeout(function() {
			
			var previewWin = wysiwygEditor.previewWin;
			
			var doc = previewWin.window.document;
			
			var body = doc.getElementsByTagName(wysiwygEditor.bodyTag)[0];
			
			//var prewHTML = body.innerHTML;
			var srcHTML = getSourceCodeBody(sourceFile);
			
			body.innerHTML = srcHTML;
			
			// Using innerHTML makes the caret dissappear. Place it again ...
			// Find out the tag and if we are near text, find the tag in wysiwyg
			
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
	
	
	function getSourceCodeBody(sourceFile) {
		// Returns the body of the source HTML code
		var srcMatchBody = sourceFile.text.match(/<body.*>([\s\S]*)<\/body>/i);
		
		if(srcMatchBody == null) {
			console.warn("Could not find &lt;body element in source file<br>" + sourceFile.path);
			return sourceFile.text;
		}
		else return srcMatchBody[1];
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
	
	
})();