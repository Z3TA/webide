(function() {
	/*
		Open the welcome file
		
	*/
	"use strict";
	
	var windowMenFeedbackPositive, windowMenFeedbackNegative;
	
	EDITOR.plugin({
		desc: "Get user feedback",
		load: function loadUserFeedback() {

			windowMenFeedbackPositive = EDITOR.windowMenu.add("☺", ["☺", 1], positive);
			windowMenFeedbackNegative = EDITOR.windowMenu.add("☹", ["☺", 2], negative);
			
			if(QUERY_STRING["embed"]) return;
			
			CLIENT.on("loginSuccess", expectations, 2000);
			
		},
		unload: function unloadUserFeedback() {
			
		}
	});
	
	function positive() {
		EDITOR.stat("happy_smile");
		
		askForFeedback("Thank you so much! If you want to give more details do so in the box below: ", {rows: 5, placeholder: "I like... It would also be cool if..."}, "Feedback, happy smile");
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
		
		// 99% of new users close down the editor/IDE after 3 seconds, try get get some feedback
		// Tried before to ask users to write feedback in the welcome.htm file, but no one did.
		
		askForFeedback("Hi!\nBefore trying the editor/IDE, please write what you would like to find:", {rows: 5, placeholder: "The features you would like to have in a code editor/IDE or why you are already reaching for the close tab button ..."}, "WebIDE: New user expectations")
		
	}
	
	function askForFeedback(msg, options, subject) {
		promptBox(msg, options, function(feedback) {
			if(feedback) {
				UTIL.httpPost("https://www.webtigerteam.com/mailform.nodejs", { meddelande: feedback, namn: 'WebIDE', subject: subject ? subject: "WebIDE feedback" }, function (err, respStr) {
					if(err) {
						alertBox("Problem sending feedback:  " + err.message);
						throw err;
					}
					else if(respStr.indexOf("Bad Gateway") != -1 || respStr.indexOf("Meddelande mottaget") == -1) {
						alertBox("Problem sending feedback. Please e-mail it it to editor@webtigerteam.com (" + respStr + ")");
						console.log("respStr=" + respStr);
					}
					else {
						alertBox('Thanks for your invaluable feedback! Dont hesitate to <a href="mailto: editor@webtigerteam.com">contact support</a> if you have more feedback, questions or issues.');
					}
				});
			}
		});
	}
	
	
})();
