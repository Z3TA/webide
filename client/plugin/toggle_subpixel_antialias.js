(function() {
	"use strict";

	var winMenuItem;
	var defaultSubpixelAntialias = EDITOR.settings.sub_pixel_antialias;
	
	console.log("toggle_subpixel_antialias: defaultSubpixelAntialias=" + defaultSubpixelAntialias);
	
	var defaultFontSmoothing, defaultFontSmooth;
	
EDITOR.plugin({
		desc: "Able to toggle sub pixel antialias",
		load: function loadSubpixelConfig() {
			
			/*
				if(window.devicePixelRatio > 1) {
				console.log("toggle_subpixel_antialias: Not touching sub pixel antialias settings because window.devicePixelRatio=" + window.devicePixelRatio);
				return;
				};
			*/
			 
			var body = document.getElementById("body");
			defaultFontSmoothing = body.style.fontSmoothing || body.style.webkitFontSmoothing || body.style.mozFontSmoothing || body.style.mozOsxFontSmoothing;
			defaultFontSmooth = body.style.fontSmooth; // https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth
			
			console.log("toggle_subpixel_antialias: defaultFontSmoothing=" + defaultFontSmoothing + " defaultFontSmooth=" + defaultFontSmooth);
			
			winMenuItem = EDITOR.windowMenu.add(S("sub_pixel_antialias"), [S("View"), 60], toggleSubpixelAntialias);
			if(EDITOR.settings.sub_pixel_antialias) winMenuItem.activate();
			else winMenuItem.deactivate();
			
			winMenuItem.domElement.oncontextmenu = function contextMenu(ev) {
				EDITOR.localStorage.getItem("sub_pixel_antialias", function whenChecked(err, value) {
					if(err) throw err;
					
					console.log("toggle_subpixel_antialias: logalStorage value=" + value);
					
					if(value == null) return; // No setting saved
					
					EDITOR.ctxMenu.show();
					EDITOR.ctxMenu.addTemp("Forget subpixel-antialas setting", true, function whenClicked() {
						EDITOR.localStorage.removeItem("sub_pixel_antialias", function whenForgotten(err) {
							if(err) throw err;
EDITOR.ctxMenu.hide();

							var restartNow = "Restart now";
							var later = "Later";
							confirmBox("Settings for sup pixel antialas has been forgotten. Default (OS) settings will be used after restarting the editor.", [restartNow, later], function whenAsked(answer) {
								if(!answer) return;
								else if(answer == restartNow) EDITOR.reload();
								else if(answer == later) {
									winMenuItem.domElement.title = "Restart editor to use default";
								}
								else if(answer != later) throw new Error("Unknown answer=" + answer);
							})
						});
					});
				});
			}
			
			console.log("toggle_subpixel_antialias: winMenuItem=", winMenuItem);
			
			EDITOR.localStorage.getItem("sub_pixel_antialias", function (err, value) {
				console.log("toggle_subpixel_antialias: logalStorage value=" + value);
				
				if(value == "true") {
					console.log("toggle_subpixel_antialias: Enable by editor storage");
					setSubpixelAntialias(true);
					winMenuItem.activate();
					winMenuItem.domElement.title = "Saved in settings";
				}
				else if(value == "false") {
					console.log("toggle_subpixel_antialias: Disable by editor storage");
					setSubpixelAntialias(false);
					winMenuItem.deactivate();
					winMenuItem.domElement.title = "Saved in settings";
				}
				else if(value == null) {
					winMenuItem.domElement.title = "Using default";
				}
				else {
					throw new Error("Unknown value=" + value);
				}
			});
			
			
			
		},
		unload: function unloadSubpixelConfig() {
			
			setSubpixelAntialias(defaultSubpixelAntialias, true)
			
			EDITOR.windowMenu.remove(winMenuItem);
			
		}
	});
	
	function setSubpixelAntialias(state, reset) {
		console.warn("toggle_subpixel_antialias: Setting EDITOR.settings.sub_pixel_antialias=" + state);
		EDITOR.settings.sub_pixel_antialias = state;
		
		var body = document.getElementById("body");
		if(reset || state==undefined) {
			body.style.fontSmoothing = "auto";
			body.style.webkitFontSmoothing = "auto"; // auto, none, antialiased, subpixel-antialiased
			body.style.mozFontSmoothing = "auto";
			body.style.mozOsxFontSmoothing = "auto"; // auto or grayscale
			console.log("toggle_subpixel_antialias: Set fontSmoothing to auto");
		}
		else if(state === false) {
			body.style.fontSmoothing = "none";
			body.style.webkitFontSmoothing = "none"; // auto, none, antialiased, subpixel-antialiased
			body.style.mozFontSmoothing = "none";
			body.style.mozOsxFontSmoothing = "none"; // auto or grayscale
			console.log("toggle_subpixel_antialias: Set fontSmoothing to none");
		}
		else if(state === true) {
			body.style.fontSmoothing = "subpixel-antialiased";
			body.style.webkitFontSmoothing = "subpixel-antialiased"; // auto, none, antialiased, subpixel-antialiased
			body.style.mozFontSmoothing = "subpixel-antialiased";
			body.style.mozOsxFontSmoothing = "subpixel-antialiased"; // auto or grayscale
			console.log("toggle_subpixel_antialias: Set fontSmoothing to subpixel-antialiased");
		}
		
		
		// We must re-create the canvas in order to change subpixel antialias!
		var oldCanvas = document.getElementById("editorCanvas");
		var newCanvas = document.createElement("canvas");
		// Get the values from the original canvas
		newCanvas.setAttribute("class", oldCanvas.getAttribute("class"));
		newCanvas.setAttribute("aria-label", oldCanvas.getAttribute("aria-label"));
		newCanvas.setAttribute("role", oldCanvas.getAttribute("role"));
		newCanvas.setAttribute("aria-multiline", oldCanvas.getAttribute("aria-multiline"));
		newCanvas.setAttribute("contenteditable", oldCanvas.getAttribute("contenteditable"));
		
		var content = document.getElementById("content");
		content.insertBefore(newCanvas, oldCanvas);
		content.removeChild(oldCanvas);
		newCanvas.id = "editorCanvas";
		
		EDITOR.canvas = EDITOR.initCanvas(newCanvas);
		EDITOR.getCanvasContext(EDITOR.canvas);
		EDITOR.resize(true);
		
	}
	
	function toggleSubpixelAntialias() {
		
		console.log("toggle_subpixel_antialias: toggleSubpixelAntialias: EDITOR.settings.sub_pixel_antialias=" + EDITOR.settings.sub_pixel_antialias);
		
		if(EDITOR.settings.sub_pixel_antialias) {
			setSubpixelAntialias(false);
			winMenuItem.deactivate();
		}
		else {
			setSubpixelAntialias(true);
			winMenuItem.activate();
		}
		
		// Remember setting (per device, not per account)
		EDITOR.localStorage.setItem("sub_pixel_antialias", EDITOR.settings.sub_pixel_antialias.toString(), function(err) {
			if(err) throw err;
			winMenuItem.domElement.title = "Saved in settings";
		});
		
	}
	
})();
