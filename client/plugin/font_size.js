
(function() {

	var winMenu = {};
	var originalFont, originalHighlightMatchFont, originalFontSize, originalGridHeight, originalGridWidth, originalLeftMargin, originalTabSpace;
	
	EDITOR.plugin({
		desc: "Change font size",
		load: function loadFontSizePlugin() {
			
			originalFont = EDITOR.settings.style.font;
			originalHighlightMatchFont = EDITOR.settings.style.highlightMatchFont;
			originalFontSize = EDITOR.settings.style.fontSize;
			originalGridHeight = EDITOR.settings.gridHeight;
			originalGridWidth = EDITOR.settings.gridWidth;
			originalLeftMargin = EDITOR.settings.leftMargin;
			originalTabSpace = EDITOR.settings.tabSpace;
			
			var order = 0;
			for(var font in load) {
				winMenu[font] = EDITOR.windowMenu.add(font, [S("View"), S("font"), ++order], load[font]);
			}
			
			EDITOR.loadSettings("preferred_font", "default", function(savedFont) {
				if(savedFont && savedFont != "default") {
					load[savedFont]();
				}
			});
		},
		unload: function unloadFontSizePlugin() {
			for(var menu in winMenu) {
				EDITOR.windowMenu.remove(winMenu[menu]);
			}
		}
	});
	
	function save(fontName) {
		EDITOR.saveSettings("preferred_font", fontName);
	}
	
	var load = {
		ubuntu10: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 10px ubuntu";
			EDITOR.settings.style.fontSize = 10;
			EDITOR.settings.gridHeight = 12;
			EDITOR.settings.gridWidth = 5;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu10");
		},
		ubuntu11: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 11px ubuntu";
			EDITOR.settings.style.fontSize = 11;
			EDITOR.settings.gridHeight = 12;
			EDITOR.settings.gridWidth = 5.5;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu11");
		},
		ubuntu12: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 12px ubuntu";
			EDITOR.settings.style.fontSize = 12;
			EDITOR.settings.gridHeight = 16;
			EDITOR.settings.gridWidth = 6;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu12");
		},
		ubuntu13: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 13px ubuntu";
			EDITOR.settings.style.fontSize = 13;
			EDITOR.settings.gridHeight = 16;
			EDITOR.settings.gridWidth = 6.5;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu13");
		},
		ubuntu14: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 14px ubuntu";
			EDITOR.settings.style.fontSize = 14;
			EDITOR.settings.gridHeight = 17;
			EDITOR.settings.gridWidth = 7;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu14");
		},
		ubuntu15: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 15px ubuntu";
			EDITOR.settings.style.fontSize = 15;
			EDITOR.settings.gridHeight = 22;
			EDITOR.settings.gridWidth = 7.5;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu15");
		},
		ubuntu16: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 16px ubuntu";
			EDITOR.settings.style.fontSize = 16;
			EDITOR.settings.gridHeight = 23;
			EDITOR.settings.gridWidth = 8;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu16");
		},
		ubuntu17: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 17px ubuntu";
			EDITOR.settings.style.fontSize = 17;
			EDITOR.settings.gridHeight = 23;
			EDITOR.settings.gridWidth = 8.5;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu17");
		},
		ubuntu18: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 18px ubuntu";
			EDITOR.settings.style.fontSize = 18;
			EDITOR.settings.gridHeight = 23;
			EDITOR.settings.gridWidth = 9;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu18");
		},
		ubuntu19: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 19px ubuntu";
			EDITOR.settings.style.fontSize = 19;
			EDITOR.settings.gridHeight = 23;
			EDITOR.settings.gridWidth = 9.5;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu19");
		},
		ubuntu20: function() {
			EDITOR.settings.style.font = "ubuntu";
			EDITOR.settings.style.highlightMatchFont = "bold 20px ubuntu";
			EDITOR.settings.style.fontSize = 20;
			EDITOR.settings.gridHeight = 23;
			EDITOR.settings.gridWidth = 10;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("ubuntu20");
		},
		default: function() {
			EDITOR.settings.style.font = originalFont;
			EDITOR.settings.style.highlightMatchFont = originalHighlightMatchFont;
			EDITOR.settings.style.fontSize = originalFontSize;
			EDITOR.settings.gridHeight = originalGridHeight;
			EDITOR.settings.gridWidth = originalGridWidth;
			EDITOR.settings.leftMargin = originalLeftMargin;
			EDITOR.settings.tabSpace = originalTabSpace;
			activateMenu("default");
		}
	};
	
	function activateMenu(item) {
		EDITOR.resize(true); // Sets the new font
		
		for(var menu in winMenu) {
			winMenu[menu].deactivate();
		}
		
		winMenu[item].activate();
		
		save(item);
		
	}
	
})();
