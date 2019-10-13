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
			
			for(var filePath in filesInPreviw) {
				if(filesInPreviw[filePath].previewWin) {
filesInPreviw[filePath].previewWin.close();
				}
			}
			
		}
	});
	
	function buildSvgPreviewWidget() {
		/*
			A range slider for zooming in out which will resize the preview window
		*/
		
		var wrap = document.createElement("div");
		wrap.classList.add("svgZoomSliderWrap");
		
		var label = document.createElement("label")
		label.setAttribute("for", "svgZoomSlider");
		label.classList.add("svgZoomSliderLabel");
		label.innerText = "SVG Zoom: "
		wrap.appendChild(label);
		
		var svgZoomSliderHolder = document.createElement("div")
		svgZoomSliderHolder.classList.add("svgZoomSliderHolder");
		wrap.appendChild(svgZoomSliderHolder);
		
		zoomSlider = document.createElement("input");
		zoomSlider.setAttribute("id", "svgZoomSlider");
		zoomSlider.classList.add("svgZoomSlider");
		zoomSlider.setAttribute("type", "range");
		zoomSlider.setAttribute("min", 10);
		zoomSlider.setAttribute("max", 1000);
		zoomSlider.setAttribute("value", 100);
		onRangeChange(zoomSlider, zoomSliderChange);
		svgZoomSliderHolder.appendChild(zoomSlider);
		
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
		
		var orgWidth = x2-x1;
		var orgHeight = y2-y1;
		var widthScale = width/height;
		
		var width = Math.ceil(orgWidth * currentValue / 100);
		var height = Math.ceil(orgHeight * currentValue / 100);
		
		console.log("zoom: width=" + width + " height=" + height + " orgWidth=" + orgWidth + " orgHeight=" + orgHeight + " x1=" + x1 + " x2=" + x2 + " y1=" + y1 + " y2=" + y2 + " ");
		
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
		
			
			filesInPreviw[file.path] = {
			file: file
			};
			
			if(!EDITOR.hasEvent("fileChange", previewSvgFileChanged)) {
EDITOR.on("fileChange", previewSvgFileChanged);
		}
		
		var info = filesInPreviw[file.path];
		// , waitUntilLoaded: true
		EDITOR.createWindow({url: "about:blank"}, function windowCreated(err, previewWin) {
			if(err) return alertBox(err.message);
			
			info.previewWin = previewWin;
			
			focusEditor(previewWin);
			
			// The onload event is not called in Chrome!?
			
				alertBox("previewWin loaded!");
				
				widget.show();
				if(typeof zoomSlider != undefined) zoom(info, zoomSlider.value);
				
				refresh(filesInPreviw[file.path]);
				
				focusEditor(previewWin);
				
			
			
			previewWin.window.onbeforeunload = function onbeforeunload() {
				// User closed the preview window
				delete filesInPreviw[info.file.path];
				
				if(Object.keys(filesInPreviw).length == 0) EDITOR.removeEvent("fileChange", previewSvgFileChanged);
				
				widget.hide();
			};
			
		});
		
		return true;
	}
	
	function previewSvgFileChanged(file) {
		if(!filesInPreviw.hasOwnProperty(file.path)) return;
		
		refresh(filesInPreviw[file.path]);
	}
	
	function refresh(info) {
		var previewWin = info.previewWin;
		
		if(previewWin == undefined) throw new Error("previewWin=" + previewWin);
		
		var doc = previewWin.document;
		
		if(doc == undefined) throw new Error("doc=" + doc);
		
		doc.body.innerHTML = info.file.text;
		
		doc.body.style.margin = "0px";
		
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
	
})();
