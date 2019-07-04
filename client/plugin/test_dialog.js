(function() {
	
	// !DO:NOT:BUNDLE!
	
// This file can be deleted

//EDITOR.on("start", mock);

	// Add plugin to editor
	EDITOR.plugin({
		desc: "Test stuff",
		load: function() {
			var charCode_D = 68;

EDITOR.bindKey({desc: "Show a dialog window", charCode: charCode_D, combo: CTRL + SHIFT, fun: testDialogs});
			
		},
		unload: function() {
		
			EDITOR.unbindKey(testDialogs);
			
		},
	});
	
	
	
	
	function mock() {
		
		EDITOR.mock("keydown", {charCode: charCode_D, target: "canvas", shiftKey: true, ctrlKey: true});
	
}

function testDialogs() {
		
	alertBox("This is a dialog window with a warning triangle", "TEST", "warning");
	
	//alertBox("Anim cupidatat consectetur non ut id est irure excepteur laboris pariatur magna enim ut duis aute sint cillum.<br>Tempor reprehenderit ex ea mollit Lorem duis ut laboris occaecat voluptate et irure tempor incididunt in ipsum exercitation consequat ipsum cillum eiusmod dolore labore qui.", "error");
	
	//alertBox("<h1>OMG</h1><p>This is crazy</p>");
	
	//alert("dude");
	
	//confirmBox("Are you sure you want eat this?", ["Yes!", "Erm, why are you asking?", "Another anwser1", "Another anwser2", "Another anwser3", "Another anwser4"], function(answer) {alert(answer);});
	
	//confirm("Are you sure you want eat this?");
	
		//promptBox("What is your name?", false, undefined, function(answer) {alert(answer);});
	
	//var q = prompt("What is your name?");
	
	//alert(q);
	
	return false;
	}
	
})();
