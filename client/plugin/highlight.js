/*

	Code high-lightning for plain text mode (no parser)

*/

(function() {
	"use strict";
	
	var initiated = false;
	var worker;
	var html;
	var fileColors = {};

	function getThemeColors() {

		return {
			"hljs-tag": {color: EDITOR.settings.style.xmlTagColor},
			"hljs-comment": {color: EDITOR.settings.style.commentColor},
			"hljs-quote": {color: EDITOR.settings.style.quoteColor},

			"hljs-keyword": {color: EDITOR.settings.style.colorBlue},
			"hljs-selector-tag": {color: EDITOR.settings.style.colorBlue},
			"hljs-section": {color: EDITOR.settings.style.colorBlue},
			"hljs-title": {color: EDITOR.settings.style.colorBlue},
			"hljs-name": {color: EDITOR.settings.style.colorBlue},

			"hljs-variable": {color: EDITOR.settings.style.colorYellow},
			"hljs-template-variable": {color: EDITOR.settings.style.colorYellow},

			"hljs-string": {color: EDITOR.settings.style.quoteColor},
			"hljs-selector-attr": {color: EDITOR.settings.style.colorGreen},
			"hljs-selector-pseudo": {color: EDITOR.settings.style.colorGreen},
			"hljs-regexp": {color: EDITOR.settings.style.colorGreen},

			"hljs-literal": {color: EDITOR.settings.style.colorCyan},
			"hljs-symbol": {color: EDITOR.settings.style.colorCyan},
			"hljs-bullet": {color: EDITOR.settings.style.colorCyan},
			"hljs-meta": {color: EDITOR.settings.style.colorCyan},
			"hljs-number": {color: EDITOR.settings.style.colorCyan},
			"hljs-link": {color: EDITOR.settings.style.colorCyan},

			"hljs-doctag": {color: EDITOR.settings.style.colorPurple, bold: true},
			"hljs-type": {color: EDITOR.settings.style.colorPurple},
			"hljs-attr": {color: EDITOR.settings.style.colorPurple},
			"hljs-built_in": {color: EDITOR.settings.style.colorPurple},
			"hljs-builtin-name": {color: EDITOR.settings.style.colorPurple},
			"hljs-params": {color: EDITOR.settings.style.colorPurple},

			"hljs-attribute": {color: EDITOR.settings.style.colorBlack},
			"hljs-subst": {color: EDITOR.settings.style.colorBlack},

			"hljs-formula": {bgColor: EDITOR.settings.style.colorGray, italic: true},

			"hljs-selector-id": {color: EDITOR.settings.style.colorOrange},
			"hljs-selector-class": {color: EDITOR.settings.style.colorOrange},

			"hljs-addition": {bgColor: EDITOR.settings.style.colorGreen, color: EDITOR.settings.style.textColor},

			"hljs-deletion": {bgColor: EDITOR.settings.style.colorRed, color: EDITOR.settings.style.textColor},

			"hljs-strong": {bold: true},

			"hljs-emphasis": {italic: true}

		};
	}
	

	var theme = getThemeColors();


	EDITOR.plugin({
		desc: "Code highlightning",
		load: function loadHighlight() {
			
			theme = getThemeColors();
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
		
		//console.log("highlight: highlightLazyLoad! file.path=" + file.path + " file.disableParsing=" + file.disableParsing + " initiated=" + initiated);
		
		if(!(file instanceof File)) return; // Can also be ImageFile

		if(!file.disableParsing && !file.fullAutoIndentation && file.fileExtension != "txt") {
			if(!initiated) init();
			
			worker.postMessage({text: file.text, path: file.path});
		}
		
	}
	
	function init() {
		//console.log("highlight: init!");
		
		if(initiated) throw new Error("highlight: Already initiated!");
		
		if(window.Worker) {
			worker = new Worker('/plugin/highlightjs_worker.js');
			
			worker.onmessage = highlightWorkerMessage;
			
			EDITOR.addPreRender(highlightPreRender);
			
			EDITOR.on("fileChange", highlightChangedFile);
			
			initiated = true;
			
		}
		else {console.warn("highlight: window.Worker=" + window.Worker + " not available!");}

	}
	
	function highlightChangedFile(file) {
		
		//console.log("highlight: highlightChangedFile: file.path=" + file.path);
		
		worker.postMessage({text: file.text, path: file.path});
	}
	
	function highlightWorkerMessage(ev) {
		var obj = ev.data;
		
		//console.log("highlight: obj=", obj);
		
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
