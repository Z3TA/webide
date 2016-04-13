/*
	This file will overload the settings.js
	
	(You might want to add it to .hgignore .gitignore or equivalent)
	
	{}
	
	
*/

editor.settings.style.xmlTagColor = "rgb(255,0,0)";

if(process.platform == "linux") {
	
	/*
		
	Tested fonts: 
	* Inconsolata
	* Ubuntu Mono
	* Nimbus Mono L
	* Droid Sans Mono
	* Source Code Pro
	* Liberation Mono
	
	Ended up using Liberation Mono and the following font settings (Linux, Ubuntu) 
	Font manager (sudo apt-get install font-manager): (aB icon) "Set font preferences" --> Advanced settings
	* Antialias: Yes
	* Auto-Hint: No
	* Hinting: Medium
	* LCD Filter: Default
	
*/


/*
	editor.settings.sub_pixel_antialias = false;
	editor.settings.gridHeight = 17;
editor.settings.gridWidth = 8;
editor.settings.leftMargin = 30;
editor.settings.style.fontSize = 12;
editor.settings.style.font = "Liberation Mono";
editor.settings.style.highlightMatchFont = "bold 12px Liberation Mono";
*/


editor.settings.sub_pixel_antialias = false;
editor.settings.style.font = "DejaVu Sans Mono";
editor.settings.style.highlightMatchFont = "bold 13px DejaVu Sans Mono";
editor.settings.style.fontSize = 13;
editor.settings.gridHeight = 22;
editor.settings.gridWidth = 7.8;

}
