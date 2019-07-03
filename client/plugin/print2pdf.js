/*
	
	Idea: Show a vertical line for when you should break the text for it to not go outside the paper when printed
	
	Idea: Able to select which renders to use via check boxes
	
*/

(function() {
	"use strict";
	
	var menuItem;
	var dependenciesLoaded = false;
	var jsPdfDependencies = [
		"../jsPDF/src/jspdf.js",
		"../jsPDF/src/libs/rgbcolor.js",
		"../jsPDF/src/libs/FileSaver.js",
		"../jsPDF/src/modules/cell.js",
		"../jsPDF/src/modules/standard_fonts_metrics.js",
		"../jsPDF/src/modules/split_text_to_size.js",
		"../jsPDF/src/modules/context2d.js",
		"../jsPDF/src/modules/canvas.js",
		"../jsPDF/src/modules/addimage.js",
		"../jsPDF/src/modules/jpeg_support.js",
		"../jsPDF/src/modules/ttfsupport.js"
	];
	
	EDITOR.plugin({
		desc: "Print to PDF",
		load: function() {
			
			menuItem = EDITOR.ctxMenu.add("Print to PDF", print2pdf, 3);
			
			EDITOR.registerAltKey({char: ")", alt:3, label: "Print", fun: print2pdf});
			
		},
		unload: function() {
			
			EDITOR.ctxMenu.remove(menuItem);
			
			EDITOR.unregisterAltKey(print2pdf);
			
		}
	});
	
	function print2pdf() {
		EDITOR.ctxMenu.hide();
		loadDependencies(function(err) {
			// Errors returned by script.onerror is not normal errors (they have no message property), nor a call stack (at least not in Chrome)
			if(err) return alertBox( "Problem loading jsPDF dependencies. Make sure the following files exist in client/jsPDF/\n" +  jsPdfDependencies.join("\n") );
			
			var pdf = new window.jsPDF({
				orientation: "portrait",
				format: "A4",
				unit: "pt" // For the context2d to work unit need to be in pt
			});
			
			var file = EDITOR.currentFile;
			
			var pageHeight = pdf.internal.pageSize.getHeight();
			var pageWidth = pdf.internal.pageSize.getWidth();
			console.log("print2pdf: pageHeight=" + pageHeight + " pageWidth=" + pageWidth);
			
			// Switch to a font that is included in PDF reader
			
			var settings = {
				font: EDITOR.settings.style.font,
				highlightMatchFont: EDITOR.settings.style.highlightMatchFont,
				fontSize: EDITOR.settings.style.fontSize,
				gridHeight: EDITOR.settings.gridHeight,
				gridWidth: EDITOR.settings.gridWidth,
				topMargin: EDITOR.settings.topMargin,
				bottomMargin: EDITOR.settings.bottomMargin,
				leftMargin: EDITOR.settings.leftMargin,
				rightMargin: EDITOR.settings.rightMargin
			}
			
			EDITOR.settings.style.font = "Courier New, Courier, monospace";
			EDITOR.settings.style.highlightMatchFont = "bold 15px Courier New, Courier, monospace";
			EDITOR.settings.style.fontSize = 10;
			EDITOR.settings.gridHeight = 12;
			EDITOR.settings.gridWidth = 6;
			
			//EDITOR.resize(true);
			
			if(file.mode == "text") {
				// Increase top/bottom margin
				var rowsPerPage = Math.floor(pageHeight / EDITOR.settings.gridHeight) - 7;
				
				var disablePlugins = [
					"Render line numbers",
					"Highlight current line"
				];
				
				for (var i=0; i<disablePlugins.length; i++) EDITOR.disablePlugin(disablePlugins[i]);
				
				var leftMargin = 48; // Bigger margin for text
				
			}
			else {
				var rowsPerPage = Math.floor(pageHeight / EDITOR.settings.gridHeight);
				var leftMargin = 30; // Want as much code as possible to fit on the page
			}
			
			var margin = pageHeight - rowsPerPage * EDITOR.settings.gridHeight;
			
			// Adjust margins
			console.log("print2pdf: rowsPerPage=" + rowsPerPage + " margin=" + margin);
			
			// If margins are too large we will get an extra page
			var topMargin = Math.floor(margin/2 - 0.01); // Make top margin an integer to prevent sub pixel rendering
			var bottomMargin = margin - topMargin; // Fill out the remaining space
			
			console.log("print2pdf: Adjusting EDITOR.settings.topMargin=" + EDITOR.settings.topMargin + " to " + topMargin);
			console.log("print2pdf: Adjusting EDITOR.settings.bottomMargin=" + EDITOR.settings.bottomMargin + " to " + bottomMargin);
			console.log("print2pdf: Adjusting EDITOR.settings.leftMargin=" + EDITOR.settings.leftMargin + " to " + leftMargin);
			
			EDITOR.settings.topMargin = topMargin;
			EDITOR.settings.bottomMargin = bottomMargin;
			
			EDITOR.settings.leftMargin = leftMargin;
			EDITOR.settings.rightMargin = 0;
			
			EDITOR.view.canvasHeight = pageHeight;
			EDITOR.view.canvasWidth = pageWidth;
			
			EDITOR.view.visibleColumns = 999; // Print all text, even if it doesn't fit
			EDITOR.view.visibleRows = rowsPerPage;
			
			// Some renders access EDITOR.canvas
			var editorCanvasOriginal = EDITOR.canvas;
			var canvas = {
				width: EDITOR.view.canvasWidth,
				height: EDITOR.view.canvasHeight
			}
			EDITOR.canvas = canvas;
			
			// Some renders need to recalculate
			console.log("print2pdf: Calling afterResize listeners (" + EDITOR.eventListeners.afterResize.length + ") ...");
			for(var i=0; i<EDITOR.eventListeners.afterResize.length; i++) {
				EDITOR.eventListeners.afterResize[i].fun(EDITOR.currentFile, pageWidth, pageHeight);
			}
			
			
			var totalPages = Math.ceil(file.grid.length / rowsPerPage);
			var fileStartRow = 0;
			var fileEndRow = rowsPerPage;
			var screenStartRow = 0; // Always zero
			var ctx = pdf.context2d;
			var renderOverride = true;
			
			ctx.fillStyle = EDITOR.settings.style.textColor;
			
			ctx.font=EDITOR.settings.style.fontSize + "px " + EDITOR.settings.style.font;
			ctx.textBaseline = "middle";
			
			
			// We don't have to add a first page, or it would be blank
			
			EDITOR.shouldResize = false; // Prevent EDITOR.render from doing a resize which could mess things up 
			
			for (var page=0; page<totalPages; page++) {
				fileStartRow = page * rowsPerPage;
				fileEndRow = Math.min(fileStartRow + rowsPerPage - 1, file.grid.length-1);
				console.log("print2pdf: page=" + page + " Render fileStartRow=" + fileStartRow + " fileEndRow=" + fileEndRow);
				EDITOR.render(file, fileStartRow, fileEndRow, screenStartRow, canvas, ctx, renderOverride);
				
				if(page < totalPages-1) {
					console.log("print2pdf: Adding page! page=" + page + " totalPages=" + totalPages);
					pdf.addPage();
				}
			}
			
			var fileName = UTIL.getFilenameFromPath(file.path) + ".pdf";
			
			pdf.save(fileName);
			
			
			// Restore
			EDITOR.canvas = editorCanvasOriginal;
			
			EDITOR.settings.style.font = settings.font;
			EDITOR.settings.style.highlightMatchFont =settings.highlightMatchFont;
			EDITOR.settings.style.fontSize = settings.fontSize;
			EDITOR.settings.gridHeight = settings.gridHeight;
			EDITOR.settings.gridWidth = settings.gridWidth;
			EDITOR.settings.topMargin = settings.topMargin;
			EDITOR.settings.bottomMargin = settings.bottomMargin;
			EDITOR.settings.leftMargin = settings.leftMargin;
			EDITOR.settings.rightMargin = settings.rightMargin;
			
			if(disablePlugins) {
				for (var i=0; i<disablePlugins.length; i++) {
					EDITOR.enablePlugin(disablePlugins[i]);
				}
			}
			
			EDITOR.resize(true);
			
			
			console.log("print2pdf: Finished print2pdf");
			
		});
	}
	
	function loadDependencies(callback) {
		// Make sure jsPDF dependencies are loaded
		
		if(dependenciesLoaded) return callback(null);
		
		var fontLoaded = true;
		var abort = false;
		
		// Load the main script first
		var counter = 1;
		var scriptsToLoad = jsPdfDependencies.slice(); // Copy array values
		EDITOR.loadScript(jsPdfDependencies[0], function(err) {
			if(err) return callback(err);
			
			scriptsToLoad.splice(scriptsToLoad.indexOf(jsPdfDependencies[0]), 1);
			
			// Load the rest
			for (var i=1; i<jsPdfDependencies.length; i++) {
				loadDep(jsPdfDependencies[i]);
			}
			
		});
		
		function doneMaybe() {
			if(counter == jsPdfDependencies.length && fontLoaded) {
				console.log("print2pdf: All dependencies loaded!");
				dependenciesLoaded = true;
				callback(null);
				callback = null; // throw error if it's called again
			}
			else {
				console.log("print2pdf: Loaded " + counter + " of " + jsPdfDependencies.length + " dependencies. Waiting for " + JSON.stringify(scriptsToLoad) + " fontLoaded=" + fontLoaded);
			}
		}
		
		function loadDep(src) {
			if(abort) return;
			
			EDITOR.loadScript(src, depLoaded);
			
			function depLoaded(err) {
				if(abort) return;
				
				counter++;
				if(err) {
					var error = new Error("Unable to load dependency: " + src)
					return callback(error);
				}
				
				console.log("print2pdf: Loaded " + src);
				
				scriptsToLoad.splice(scriptsToLoad.indexOf(src), 1);
				
				doneMaybe();
				
			}
		}
	}
	
})();

