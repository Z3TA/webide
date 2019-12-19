(function() {
	/*
		Open the welcome file
		
	*/
	"use strict";
	
	var windowMenFeedbackPositive, windowMenFeedbackNegative;
	var alreadySentFeedback = false;

	EDITOR.plugin({
		desc: "Get user feedback",
		load: function loadUserFeedback() {

			windowMenFeedbackPositive = EDITOR.windowMenu.add("☺", ["☺", 1], positive);
			windowMenFeedbackNegative = EDITOR.windowMenu.add("☹", ["☺", 2], negative);
			
			windowMenFeedbackPositive.parentMenu.parentMenu.domElement.getElementsByTagName("a")[0]
			
			var rootMenuItem = windowMenFeedbackPositive.parentMenu.parentMenuItem;
			var label = rootMenuItem.domElement.getElementsByTagName("a")[0];
			label.setAttribute("title", "Send feedback");
			
			console.log("userFeedback: rootMenuItem=", rootMenuItem, " label=", label);
			
			if(QUERY_STRING["embed"]) return;
			
			CLIENT.on("loginSuccess", expectations, 2000);
			
		},
		unload: function unloadUserFeedback() {
			
		}
	});
	
	function positive() {
		EDITOR.stat("happy_smile");
		
		askForFeedback("What did you like? Leave feedback in the box below: ", {rows: 5, placeholder: "I like... It would also be cool if..."}, "Feedback, happy smile");
	}
	
	function negative() {
		EDITOR.stat("sad_face");
		
		askForFeedback("I'm so sorry! What happaned? ", {rows: 5, placeholder: "This happened... I was expecting... #$@&%*!?"}, "Feedback, sad face");
	}
	
	
	function expectations(login) {
		
		if(window.location.search) {
			console.log("Not asking for feedback because window.location.search=" + window.location.search);
			return;
		}
		
		if(EDITOR.startedCounter && EDITOR.startedCounter > 2) return;
		
if(alreadySentFeedback) return;

		// 99% of new users close down the editor/IDE after 3 seconds, try get get some feedback
		// Tried before to ask users to write feedback in the welcome.htm file, but no one did.
		
		askForFeedback("Hi!\n" +
		"Help keep the editor free from \"telemetry\" by leaving feeback! " +
		'Many of the editor features are work-in-progress. What should be priotized?\n' +
		'Leave feedback via the smilie-face menu or send an e-mail to <a href="mailto:editor@webtigerteam.com">editor@webtigerteam.com</a>.\n' +
		'Before trying the editor/IDE, what are your expectations?' + 
		'\n', {rows: 5, placeholder: "The features you would like to have in a code editor/IDE or why you are already reaching for the close tab button ..."}, "WebIDE: New user expectations")
		
	}
	
	function askForFeedback(msg, options, subject) {
		promptBox(msg, options, function(feedback) {
			if(feedback) {
				EDITOR.sendFeedback(feedback, subject);
				alreadySentFeedback = true;
			}
		});
	}
	
	
})();
