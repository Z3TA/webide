(function() {
	/*
		Open the welcome file
		
	*/
	"use strict";
	
	if(QUERY_STRING["embed"]) return;
	
	// The file is not available until the user has logged in
	// (we could cheat and serve it with the editor itself)
	
	CLIENT.on("loginSuccess", askForFeedback, 2000);
	
	function askForFeedback(login) {
		
		if(window.location.search) {
			console.log("Not asking for feedback because window.location.search=" + window.location.search);
			return;
		}
		
		if(EDITOR.startedCounter && EDITOR.startedCounter > 2) return;
		
		// 99% of new users close down the editor/IDE after 3 seconds, try get get some feedback
		// Tried before to ask users to write feedback in the welcome.htm file, but no one did.
		promptBox("Hi!\nBefore trying the editor/IDE, please write what you would like to find:", {rows: 5, placeholder: "The features you would like to have in a code editor/IDE or why you are already reaching for the close tab button ..."}, function(feedback) {
			if(feedback) {
				UTIL.httpPost("https://www.webtigerteam.com/mailform.nodejs", { meddelande: feedback, namn: 'WebIDE', subject: "WebIDE: New user expectations" }, function (err, respStr) {
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
