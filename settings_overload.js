/*
	This file will overload the settings.js
	
	(You might want to add it to .hgignore .gitignore or equivalent)
	
*/

//editor.settings.style.xmlTagColor = "rgb(255,0,0)";

// 1l0Oo[]{}.,

console.log("process.platform=" + process.platform);
console.log("runtime=" + runtime);

if(runtime=="browser") {
	// We better use a web safe font ...
	
	editor.settings.sub_pixel_antialias = true;
	editor.settings.style.font = "Courier New";
	editor.settings.style.highlightMatchFont = "bold 15px Courier New";
	editor.settings.style.fontSize = 15;
	editor.settings.gridHeight = 23;
	editor.settings.gridWidth = 9;
	
}
else if(process.platform == "windows") {

/*
	Windows with "Smooth edges of screen fonts" turned off.
	These font's look good:
	
	* DejaVu Sans Mono 14px
	* ProggyCleanTT <=16px (very small)
	* Ubuntu Mono (many sizes look good!)
	* Luculent 14px (many sizes look good!)
	* Lucida Console 13px
	* Courier New 16-17px
	* Liberation Mono 12px
	
		otherwise Consolas is the best ;)
		
*/
	
	editor.settings.sub_pixel_antialias = true;
	editor.settings.style.font = "Consolas";
	editor.settings.style.highlightMatchFont = "bold 15px Consolas";
	editor.settings.style.fontSize = 15;
	editor.settings.gridHeight = 23;
	editor.settings.gridWidth = 8.25;
	
}
else if(process.platform == "linux") {
	
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
	editor.settings.style.highlightMatchFont = "bold 14px DejaVu Sans Mono";
	editor.settings.style.fontSize = 13;
	editor.settings.gridHeight = 22;
	editor.settings.gridWidth = 7.83;
	
}

