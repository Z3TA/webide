
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
			
			menuItem = EDITOR.addMenuItem("Print to PDF", print2pdf, 1);
			
		},
		unload: function() {
			
			EDITOR.removeMenuItem(menuItem);
			
		}
	});
	
	function print2pdf() {
		loadDependencies(function(err) {
			// Errors returned by script.onerror is not normal errors (they have no message property), nor a call stack (at least not in Chrome)
			if(err) return alertBox( "Problem loading jsPDF dependencies. Make sure the following files exist in client/jsPDF/\n" +  jsPdfDependencies.join("\n") );
			
			var pdf = new jsPDF({
				orientation: "portrait",
				format: "A4",
				unit: "pt" // For the context2d to work unit need to be in pt
			});
			
			var file = EDITOR.currentFile;
			
			var pageHeight = pdf.internal.pageSize.getHeight();
			var pageWidth = pdf.internal.pageSize.getWidth();
			console.log("print2pdf: pageHeight=" + pageHeight + " pageWidth=" + pageWidth);
			
			// Switch to a font that is included in PDF reader
			EDITOR.settings.style.font = "Courier New, Courier, monospace";
			EDITOR.settings.style.highlightMatchFont = "bold 15px Courier New, Courier, monospace";
			EDITOR.settings.style.fontSize = 10;
			EDITOR.settings.gridHeight = 12;
			EDITOR.settings.gridWidth = 6;
			
			//EDITOR.resize(true);
			
			if(file.mode == "text") {
				// Increase top/bottom margin
				var rowsPerPage = Math.floor(pageHeight / EDITOR.settings.gridHeight) - 4;
				
				var disablePlugins = [
					"Render line numbers",
					"Highlight current line"
				];
				
				for (var i=0; i<disablePlugins.length; i++) EDITOR.disablePlugin(disablePlugins[i]);
				
			}
			else {
				var rowsPerPage = Math.floor(pageHeight / EDITOR.settings.gridHeight);
			}
			
			var margin = pageHeight - rowsPerPage * EDITOR.settings.gridHeight;
			
			// Adjust margins
			console.log("print2pdf: rowsPerPage=" + rowsPerPage + " margin=" + margin);
			
			var topMargin = margin/2 - 0.01;
			var bottomMargin = margin/2 - 0.01;
			
			console.log("print2pdf: Adjusting EDITOR.settings.topMargin=" + EDITOR.settings.topMargin + " to " + topMargin);
			console.log("print2pdf: Adjusting EDITOR.settings.bottomMargin=" + EDITOR.settings.bottomMargin + " to " + bottomMargin);
			
			EDITOR.settings.topMargin = topMargin;
			EDITOR.settings.bottomMargin = bottomMargin;
			
			//EDITOR.settings.leftMargin = 0;
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
			ctx.textBaseline = "top";
			
			for (var page=0; page<totalPages; page++) {
				fileStartRow = page * rowsPerPage;
				fileEndRow = Math.min(fileStartRow + rowsPerPage - 1, file.grid.length-1);
				console.log("print2pdf: Render fileStartRow=" + fileStartRow + " fileEndRow=" + fileEndRow);
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

