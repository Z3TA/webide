(function() {

"use strict";

	var filesInPreviw = {};
	var isReloading = false;
	var zoomSlider;
	var widget;
	
EDITOR.plugin({
		desc: "Preview SVG images",
		load: function loadSvgPreview() {
			
			EDITOR.on("previewTool", previewSvg);
			
			widget = EDITOR.createWidget(buildSvgPreviewWidget);
			
},
unload: function unloadSvgPreview() {
			
			EDITOR.removeEvent("previewTool", previewSvg);
			
}
});

	function buildSvgPreviewWidget() {
		/*
			A range slider for zooming in out which will resize the preview window
		*/
		
		var wrap = document.createElement("div");
		
		var label = document.createElement("label")
		label.setAttribute("for", "svgZoomSlider");
		label.innerText = "SVG Zoom: "
		wrap.appendChild(label);
		
		zoomSlider = document.createElement("input");
		zoomSlider.setAttribute("id", "svgZoomSlider");
		zoomSlider.classList.add("svgZoomSlider");
		zoomSlider.setAttribute("type", "range");
		zoomSlider.setAttribute("min", 10);
		zoomSlider.setAttribute("max", 1000);
		zoomSlider.setAttribute("value", 100);
		onRangeChange(zoomSlider, zoomSliderChange);
		wrap.appendChild(zoomSlider);
		
		return wrap;
		
		function onRangeChange(inputRange, callback) {
			var gotInputEvent = false;
			var currentValue = inputRange.value;
			var oldValue = 0;
			inputRange.addEventListener("input", function(e) {
				currentValue = inputRange.value;
				if(currentValue != oldValue) callback(currentValue, oldValue, e);
				oldValue = currentValue;
				gotInputEvent = true;
			});
			inputRange.addEventListener("change", function(e) {
				if(!gotInputEvent) {
					currentValue = inputRange.value;
					callback(currentValue, oldValue, e);
					oldValue = currentValue;
				}
			});
			inputRange.addEventListener("mousedown", function getOldValue(e) {
				if(!oldValue) oldValue = inputRange.value;
				inputRange.removeEventListener("mousedown", getOldValue);
			});
		}
		
	}
	
	function zoomSliderChange(currentValue, oldValue, e) {
		// Zoom all preview images
		
		for(var filePath in filesInPreviw) zoom(filesInPreviw[filePath], currentValue);
	}
	
	function zoom(info, currentValue) {
		
		// Figure out original size
		
		var reViewBox = /viewBox\s*=\s*" *(\d+) +(\d+) +(\d+) +(\d+)/i;
		var file = info.file;
		var m = file.text.match(reViewBox);
		if(m) {
			var x1 = m[1];
			var y1 = m[2];
			var x2 = m[3];
			var y2 = m[4];
		}
		
		console.log("zoomSliderChange: x1=" + x1 + " x2=" + x2 + " y1=" + y1 + " y2=" + y2 + " ");
		
		var orgWidth = x2-x1;
		var orgHeight = y2-y1;
		var widthScale = width/height;
		
		var width = Math.ceil(orgWidth * currentValue / 100);
		var height = Math.ceil(orgHeight * currentValue / 100);
		
		var previewWin = info.previewWin;
		
		//previewWin.resizeTo(width, height);
		
		// note: We want the content to have the size, not the window
		resizeViewPort(previewWin, width, height);
		
		
		function resizeViewPort(previewWin, width, height) {
			if (previewWin.outerWidth) {
				previewWin.resizeTo(
				width + (previewWin.outerWidth - previewWin.innerWidth),
				height + (previewWin.outerHeight - previewWin.innerHeight)
				);
			}
			else {
				previewWin.resizeTo(500, 500);
				previewWin.resizeTo(
				width + (500 - previewWin.document.body.offsetWidth),
				height + (500 - previewWin.document.body.offsetHeight)
				);
			}
		};
		
	}
	
	function previewSvg(file) {
		
		var ext = UTIL.getFileExtension(file.path);
		if(!ext.match(/svg/i)) {
			console.log("previewSvg: Not a SVG file: " + ext);
			return false;
		}
		
		var folder = UTIL.getDirectoryFromPath(file.path);
		var fileName = UTIL.getFilenameFromPath(file.path);
		
		CLIENT.cmd("serve", {folder: folder}, function httpServerStarted(err, json) {
			if(err) return alertBox(err.message);
			
			var urlPath = json.url;
			
			// HTTP serve gives the URL without protocol !?
			var reHttp = /^http(s?):/i;
			if(!urlPath.match(reHttp)) {
				if(window.location.protocol.match(reHttp)) {
					urlPath = window.location.protocol + "//" + urlPath;
				}
				else urlPath = "http://" + urlPath;
			}
			var fileName = UTIL.getFilenameFromPath(file.path);
			var url = UTIL.joinPaths(urlPath, fileName);
			
			console.log("previewSvg: url=" + url);
			
			// Figure out image width/height
			
			
			
			var windowOptions = {
				url: "about:blank"
			};
			
			filesInPreviw[file.path] = {
				windowOptions: windowOptions,
				file: file
			};
			
			if(!EDITOR.hasEvent("fileChange", previewSvgFileChanged)) EDITOR.on("fileChange", previewSvgFileChanged);
			
			reopen(filesInPreviw[file.path]);
			
			
		});
		
		
		return true;
	}
	
	function previewSvgFileChanged(file) {
		if(!filesInPreviw.hasOwnProperty(file.path)) return;
		
		// note: We can't use location.reload() because we would loose track of the window!
		// instead we need to close and reopen the window
		
		// problem2: The editor loses focus when the new window is opened!
		
		var info = filesInPreviw[file.path];
		
		var previewWin = info.previewWin;
		
		if(previewWin == undefined) throw new Error("previewWin=" + previewWin);
		
		var doc = previewWin.document;
		
		if(doc == undefined) throw new Error("doc=" + doc);
		
		doc.body.innerHTML = file.text;
		
		//reopen(filesInPreviw[file.path]);
	}
	
	function focusEditor(previewWin) {
		
		/*
			previewWin.window.blur();
			
			var e = window;
			while (e.frameElement !== null) {e = e.parent;}
			e.parent.focus();
		*/
		
		
		
		// Give back focus to the editor
		var goBack = previewWin.window.open('', 'editor'); // editor is window.name
		goBack.focus();
		
		EDITOR.canvas.focus();
		
	}
	
	function reopen(info) {
		
		info.isReloading = true;
		
		if(info.previewWin) info.previewWin.close();
		
		
		
		EDITOR.createWindow(info.windowOptions, function windowCreated(err, previewWin) {
			if(err) return alertBox(err.message);
			
			info.previewWin = previewWin;
			
			focusEditor(previewWin);
			
			previewWin.onload = function() {
				info.isReloading = false;
				widget.show();
				if(typeof zoomSlider != undefined) zoom(info, zoomSlider.value);
				
				var body = previewWin.document.body;
				
				if(body == undefined) throw new Error("Opened window has no body!");
				
				body.innerHTML = info.file.text;
				
				body.style.margin = "0px";
				
				focusEditor(previewWin);
				
			}
			
			previewWin.window.onbeforeunload = function onbeforeunload() {
				if(!info.isReloading) {
					
					// User closed the preview window
					
					delete filesInPreviw[info.file.path];
					
					if(Object.keys(filesInPreviw).length == 0) EDITOR.removeEvent("fileChange", previewSvgFileChanged);
					
					widget.hide();
					
				}
			};
			
		});

	}
	
})();
