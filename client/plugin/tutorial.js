(function() {
"use strict";

	var achievements = {};
	var experience = 0; // todo
	
	var isInWebAppiOS = (window.navigator.standalone == true);
	var isInWebAppChrome = (window.matchMedia('(display-mode: standalone)').matches);
	
	var tutorialMessageInterval;
	var tutorialMessages = {};
	
	EDITOR.plugin({
		desc: "Tutorial: Show friendly help messages",
		load: loadTutorial,
		unload: unloadTutorial,
	});

	function loadTutorial() {
		EDITOR.on("storageReady", loadAchievements);
		EDITOR.on("fileSave", achiveSaveFile);
		EDITOR.on("fileChange", achiveFileChange);
		
		
		if(isChrome() && !(isInWebAppiOS || isInWebAppChrome)) {
			tutorialMessages.appMode = function() {
			alertBox("Run (install) the editor in application mode in Chrome menu (upper right corner): More Tools => Add to desktop (or home screen)");
				delete tutorialMessages.appMode;
		}
		} else console.log("isChrome=" + isChrome() + " isInWebAppiOS=" + isInWebAppiOS + " isInWebAppChrome=" + isInWebAppChrome + "");
		
		// Show a friendly "message" every second (messages should remove themselves once they have executed)
		tutorialMessageInterval = setInterval(showTotorialMessage, 60000);
		
		}
	
	function unloadTutorial() {
		EDITOR.removeEvent("storageReady", loadAchievements);
		EDITOR.removeEvent("fileSave", achiveSaveFile);
		EDITOR.removeEvent("fileChange", achiveFileChange);
	
		clearInterval(tutorialMessageInterval);
	}
	
	function showTotorialMessage() {
		
		var msg = Object.keys(tutorialMessages);
		
		if(msg.length == 0) return clearInterval(tutorialMessageInterval);
		
		var random = Math.floor(Math.random() * msg.length);
		
		tutorialMessages[msg[random]]();
		
		}
	
	function achiveFileChange(file) {
		if(!achievements.fileSave) setTimeout(function() {
			if(file.changed) {
				if(EDITOR.hasKeyboard) alertBox('Press Ctrl + S to save changes!');
				else alertBox('Use long touch-down to show the menu and select "Save file" to save!');
				EDITOR.removeEvent("fileChange", achiveFileChange);
			}
			}, 500);
		
		//achived("fileChange");
		}
	
	function achiveSaveFile(file) {
		achived("saveFile");
		EDITOR.removeEvent("fileSave", achiveSaveFile);
	}
	
	
	function loadAchievements() {
		
		var achievementsString = EDITOR.storage.getItem("tutorialAchievements");
		
		if(achievementsString) {
			try {
				achievements = JSON.parse(achievementsString);
			}
			catch(err) {
				throw new Error("Unable to parse achievements: " + err.message);
			}
		}
	}
	
	function achived(goal) {
		experience++;
		var alreadyAchived = achievements[goal];
		achievements[goal] = true;
		if(!alreadyAchived) {
EDITOR.storage.setItem("tutorialAchievements", JSON.stringify(achievements));
		}
	}
	
	
	function isChrome() {
		var isChromium = window.chrome,
		winNav = window.navigator,
		vendorName = winNav.vendor,
		isOpera = winNav.userAgent.indexOf("OPR") > -1,
		isIEedge = winNav.userAgent.indexOf("Edge") > -1,
		isIOSChrome = winNav.userAgent.match("CriOS");
		
		if (isIOSChrome) {
			return true;
		} else if (
		isChromium !== null &&
		typeof isChromium !== "undefined" &&
		vendorName === "Google Inc." &&
		isOpera === false &&
		isIEedge === false
		) {
			return true;
		} else {
			return false;
		}
	}
	
})();
