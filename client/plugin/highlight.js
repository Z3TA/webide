/*

	Code high-lightning for plain text mode (no parser)

*/

(function() {
	"use strict";
	
	var initiated = false;
	var worker;
	var html;
	var fileColors = {};

var styleWebide = {
		"hljs-tag": {color: EDITOR.settings.style.xmlTagColor},
		"hljs-comment": {color: EDITOR.settings.style.commentColor},
		"hljs-quote": {color: EDITOR.settings.style.quoteColor},

		"hljs-keyword": {color: "#008"},
		"hljs-selector-tag": {color: "#008"},
		"hljs-section": {color: "#008"},
		"hljs-title": {color: "#008"},
		"hljs-name": {color: "#008"},

		"hljs-variable": {color: "#660"},
		"hljs-template-variable": {color: "#660"},

		"hljs-string": {color: EDITOR.settings.style.quoteColor},
		"hljs-selector-attr": {color: "#080"},
		"hljs-selector-pseudo": {color: "#080"},
		"hljs-regexp": {color: "#080"},

		"hljs-literal": {color: "#066"},
		"hljs-symbol": {color: "#066"},
		"hljs-bullet": {color: "#066"},
		"hljs-meta": {color: "#066"},
		"hljs-number": {color: "#066"},
		"hljs-link": {color: "#066"},

		"hljs-title": {color: "#606"},
		"hljs-doctag": {color: "#606"},
		"hljs-type": {color: "#606"},
		"hljs-attr": {color: "#606"},
		"hljs-built_in": {color: "#606"},
		"hljs-builtin-name": {color: "#606"},
		"hljs-params": {color: "#606"},

		"hljs-attribute": {color: "#000"},
		"hljs-subst": {color: "#000"},

		"hljs-formula": {bgColor: "#eee", italic: true},

		"hljs-selector-id": {color: "#9B703F"},
		"hljs-selector-class": {color: "#9B703F"},

		"hljs-addition": {bgColor: "#baeeba", color: EDITOR.settings.style.textColor},

		"hljs-deletion": {bgColor: "#ffc8bd", color: EDITOR.settings.style.textColor},

		"hljs-doctag": {bold: true},
		"hljs-strong": {bold: true},

		"hljs-emphasis": {italic: true}

	};
	

	var theme =styleWebide;


	EDITOR.plugin({
		desc: "Code highlightning",
		load: function loadHighlight() {
			
			EDITOR.on("fileOpen", highlightLazyLoad);
			
		},
		unload: function unloadHighlight() {
			
			if(initiated) {
				EDITOR.removeEvent("fileChange", highlightChangedFile);
				
				EDITOR.removePreRender(highlightPreRender);
			}
			
		}
	});
	
	function highlightLazyLoad(file) {
		
		console.log("highlight: highlightLazyLoad! file.path=" + file.path + " file.disableParsing=" + file.disableParsing + " initiated=" + initiated);
		
		if(!file.disableParsing && !file.fullAutoIndentation && file.fileExtension != "txt") {
			if(!initiated) init();
			
			worker.postMessage({text: file.text, path: file.path});
		}
		
	}
	
	function init() {
		console.log("highlight: init!");
		
		if(initiated) throw new Error("highlight: Already initiated!");
		
		if(window.Worker) {
			worker = new Worker('/plugin/highlightjs_worker.js');
			
			worker.onmessage = highlightWorkerMessage;
			
			EDITOR.addPreRender(highlightPreRender);
			
			EDITOR.on("fileChange", highlightChangedFile);
			
			initiated = true;
			
		}
		else {
			console.warn("highlight: window.Worker=" + window.Worker + " not available!");
		}
	}
	
	function highlightChangedFile(file) {
		
		console.log("highlight: highlightChangedFile: file.path=" + file.path);
		
		worker.postMessage({text: file.text, path: file.path});
	}
	
	function highlightWorkerMessage(ev) {
		var obj = ev.data;
		
		console.log("highlight: obj=", obj);
		
		fileColors[obj.path] = obj.colors;
		
		if(EDITOR.currentFile && obj.path == EDITOR.currentFile.path) EDITOR.renderNeeded();
	}

	function highlightPreRender(buffer, file, bufferStartRow, maxColumns) {
		
		if(file.parsed) return buffer; // We only use the highlighter for languages that do not have built-in support
		
		var colors = fileColors[file.path];
		
		//console.log("highlight: highlightPreRender! bufferStartRow=" + bufferStartRow + " buffer.length=" + buffer.length + " colors.length=" + (colors && colors.length));

		if(colors == undefined) return buffer;


		rowLoop: for (var i=0, row, style; i<colors.length; i++) {
			//console.log("highlight:highlightPreRender: rowLoop: i=" + i + " colors[" + i + "].row=" + colors[i].row );
			if( colors[i].row < bufferStartRow) continue rowLoop;
			if( colors[i].row > bufferStartRow + buffer.length) break rowLoop;

			row = buffer[col=colors[i].row - bufferStartRow];

			if(row == undefined) continue;

			colLoop: for(var col=colors[i].col; col < colors[i].col+colors[i].len && col < row.length; col++) {

				//console.log("highlight:highlightPreRender: colLoop: col=" + col + " colors[" + i + "].col=" + colors[i].col + " colors[" + i + "].len=" + colors[i].len);

				styleLoop: for(var k=0; k<colors[i].styles.length; k++) {

					//console.log("highlight:highlightPreRender: styleLoop: k=" + k + " ");

					style = theme[ colors[i].styles[k] ];

					for(var prop in style) {
						if( row[col].hasOwnProperty(prop) ) row[col][prop] = style[prop];
					}

				}
			}
		}

		return buffer;
	}


})();
