/*
	
	Every character is a box!

	Lives in global scope so that your plugin's can patch it.

*/

function Box(char, index) {
	
	var box = this;
	
	if(index == undefined) index = -1;
	if(char == undefined) {
		console.error(new Error("No character!"));
	}
	
	box.char = char;
	box.index = index;
	box.color = global.settings.style.textColor;
	box.selected = false;
	box.highlighted = false;
	box.hasCharacter = (char != undefined);
	box.decoration = {
		redWave: false
	};
	
}

Box.prototype.clone = function() {
	var box = this,
		newBox = new Box(box.char, box.index);
		
	newBox.color = box.color;
	
	return newBox;		
}