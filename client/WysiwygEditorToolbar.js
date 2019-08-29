
(function() {
	
	// Tried to style svg using CSS but it didn't work :(
	var icons = {
	}
	
	// Assume the window have already loaded, so window.addEventListener("load") wont fire ...
	main();
	
	
	function main() {
		
		var toolbar = createToolbar();
		
		document.documentElement.appendChild(toolbar);
		
		window.addEventListener("touchstart", preventZoom, false);
		window.addEventListener("touchend", preventZoom, false);
		window.addEventListener("touchmove", preventZoom, false);
		
	}
	
	function preventZoom(e) {
		//e.preventDefault();
	}
	
	function createToolbar() {
		
		var wrap = document.createElement("div");
		wrap.classList.add("wysiwygEditorToolbar");
		
		buttonWithIcon("bold.svg", "Bold text", function() {
			document.execCommand("bold");
			document.body.focus();
		});
		
		buttonWithIcon("italic.svg", "Italic text", function() {
			document.execCommand("italic");
		});
		
		buttonWithIcon("h1.svg", "Header 1", function() {
			document.execCommand('formatBlock', false, '<h1>');
		});
		
		buttonWithIcon("h2.svg", "Header 2", function() {
			document.execCommand('formatBlock', false, '<h2>');
		});
		
		buttonWithIcon("quote.svg", "Blockquote", function() {
			document.execCommand('formatBlock', false, '<blockquote>');
		});
		
		
		
		buttonWithIcon("link.svg", "Make a link", function() {
			var url = prompt("Address (URL) to link to:");
			document.execCommand("createLink", false, url);
		});
		
		buttonWithIcon("hr.svg", "Horizontal rule", function() {
			document.execCommand("inserthorizontalrule");
		});
		
		buttonWithIcon("img.svg", "Insert image", function() {
			var url = prompt("Address (URL) to image:");
			document.execCommand("insertimage", false, url);
		});
		
		buttonWithIcon("ol.svg", "Ordered list", function() {
			document.execCommand('insertorderedlist');
		});
		
		buttonWithIcon("ul.svg", "Unordered list", function() {
			document.execCommand('insertunorderedlist');
		});
		
		buttonWithIcon("outdent.svg", "outdent", function() {
			document.execCommand("outdent");
		});
		
		buttonWithIcon("paragraph.svg", "Insert paragraph", function() {
			document.execCommand("insertparagraph");
		});
		
		
		buttonWithIcon("left.svg", "left", function() {
			document.execCommand("justifyleft");
		});
		
		buttonWithIcon("center.svg", "center", function() {
			document.execCommand("justifycenter");
		});
		
		buttonWithIcon("right.svg", "right", function() {
			document.execCommand("justifyright");
		});
		
		
		buttonWithIcon("undo.svg", "undo", function() {
			document.execCommand("undo");
		});
		
		buttonWithIcon("redo.svg", "redo", function() {
			document.execCommand("redo");
		});
		
		buttonWithIcon("strikethrough.svg", "strikethrough", function() {
			document.execCommand("strikethrough");
		});
		
		buttonWithIcon("subscript.svg", "subscript", function() {
			document.execCommand("subscript");
		});
		
		buttonWithIcon("superscript.svg", "superscript", function() {
			document.execCommand("superscript");
		});
		
		buttonWithIcon("underline.svg", "underline", function() {
			document.execCommand("underline");
		});
		
		
		buttonWithIcon("unlink.svg", "unlink", function() {
			document.execCommand("unlink");
		});
		
		buttonWithIcon("zoomin.svg", "Zoom in", function() {
			var currentZoom = parseFloat(document.body.style.zoom) || 1;
			document.body.style.zoom= currentZoom*1.25;
		});
		
		buttonWithIcon("zoomout.svg", "Zoom out", function() {
			var currentZoom = parseFloat(document.body.style.zoom) || 1;
			document.body.style.zoom= currentZoom * .8;
		});
		
		
		return wrap;
		
		function buttonWithIcon(icon, alt, click) {
			var button = document.createElement("button");
			button.classList.add("wysiwygEditorToolbarButton");
			button.setAttribute("title", alt);
			
			if(icons.hasOwnProperty(icon)) {
				var parser = new DOMParser();
				var doc = parser.parseFromString(icons[icon], "image/svg+xml");
				var img = doc.documentElement;
				//var img = document.createElementNS('http://www.w3.org/2000/svg','svg');
				
				
			}
			else {
				var img = document.createElement("img");
				img.setAttribute("src", "/gfx/icon/" + icon);
				img.setAttribute("alt", alt);
			}
			
			button.appendChild(img);
			
			button.onclick = click;
			
			wrap.appendChild(button);
		}
		
		
		function textButton(text, alt, click) {
			
			var button = document.createElement("button");
			button.classList.add("wysiwygEditorToolbarButton");
			button.setAttribute("title", alt);
			
			button.innerText = text;
			button.onclick = click;
			
			wrap.appendChild(button);
		}
		
	}
	
	
	function pasteHtmlAtCaret(html, selectPastedContent) {
		var sel, range;
		if (window.getSelection) {
			// IE9 and non-IE
			sel = window.getSelection();
			if (sel.getRangeAt && sel.rangeCount) {
				range = sel.getRangeAt(0);
				range.deleteContents();
				
				// Range.createContextualFragment() would be useful here but is
				// only relatively recently standardized and is not supported in
				// some browsers (IE9, for one)
				var el = document.createElement("div");
				el.innerHTML = html;
				var frag = document.createDocumentFragment(), node, lastNode;
				while ( (node = el.firstChild) ) {
					lastNode = frag.appendChild(node);
				}
				var firstNode = frag.firstChild;
				range.insertNode(frag);
				
				WysiwygEditorUpdate();
				
				
				setTimeout(function() {
					
					window.documentElement.focus();
					
					// Preserve the selection
					if (lastNode) {
						range = range.cloneRange();
						range.setStartAfter(lastNode);
						if (selectPastedContent) {
							range.setStartBefore(firstNode);
						} else {
							range.collapse(true);
						}
						sel.removeAllRanges();
						sel.addRange(range);
					}
				}, 1000);
				
			}
		} else if ( (sel = document.selection) && sel.type != "Control") {
			// IE < 9
			var originalRange = sel.createRange();
			originalRange.collapse(true);
			sel.createRange().pasteHTML(html);
			
			WysiwygEditorUpdate();
			
			var range = sel.createRange();
			range.setEndPoint("StartToStart", originalRange);
			range.select();
		}
	}
	
	
})();