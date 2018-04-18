(function() {
	"use strict";
	
	if(window.location.href.indexOf("tutorial") == -1) return;
	
	var achievements = null; // Wait for storage!
	var experience = 0; // todo
	
	var isInWebAppiOS = (window.navigator.standalone == true);
	var isInWebAppChrome = (window.matchMedia('(display-mode: standalone)').matches);
	
	var tutorialMessageInterval;
	var tutorialMessages = {};
	
	var achiveFileChangeTimeout;
	var firstTimeLoadAchievements = true;
	
	EDITOR.plugin({
		desc: "Tutorial: Show friendly help messages",
		load: loadTutorial,
		unload: unloadTutorial,
	});
	
	function loadTutorial() {
		EDITOR.on("storageReady", loadAchievements);
		
		if(isChrome() && !(isInWebAppiOS || isInWebAppChrome) && RUNTIME == "browser") {
			tutorialMessages.appMode = function() {
				alertBox("<i>Friendly tip:</i><br>Run (install) the editor in application mode in Chrome menu (upper right corner): More Tools => Add to desktop (or home screen)");
				delete tutorialMessages.appMode;
			}
		} else console.log("isChrome=" + isChrome() + " isInWebAppiOS=" + isInWebAppiOS + " isInWebAppChrome=" + isInWebAppChrome + "");
		
		// Show a friendly "message" every second (messages should remove themselves once they have executed)
		tutorialMessageInterval = setInterval(showTotorialMessage, 60000);
		
	}
	
	function unloadTutorial() {
		EDITOR.removeEvent("storageReady", loadAchievements);
		EDITOR.removeEvent("afterSave", achiveSaveFile);
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
		if(!achievements) return true;
		if(!achievements.fileSave) {
			clearTimeout(achiveFileChangeTimeout);
			achiveFileChangeTimeout = setTimeout(function() {
				if(file.changed) {
					if(EDITOR.hasKeyboard) alertBox('Press Ctrl + S to save changes!');
					else alertBox('Use long touch-down to show the menu and select "Save file" to save! Or if you have a keyboard use Ctrl + S');
					
					EDITOR.removeEvent("fileChange", achiveFileChange);
				}
			}, 500);
		}
		else if(achievements.fileSave) EDITOR.removeEvent("fileChange", achiveFileChange);
		
		//achived("fileChange");
	}
	
	function achiveSaveFile(file) {
		achived("fileSave");
		EDITOR.removeEvent("afterSave", achiveSaveFile);
		return true;
	}
	
	
	function loadAchievements() {
		
		var achievementsString = EDITOR.storage.getItem("tutorialAchievements");
		
		//alertBox(achievementsString);
		
		if(achievementsString) {
			try {
				achievements = JSON.parse(achievementsString);
			}
			catch(err) {
				throw new Error("Unable to parse achievements: " + err.message);
			}
			if(!achievements) achievements = {};
		}
		else achievements = {};
		
		// storageReady gets called every time we are re-connected to the server!
		if(firstTimeLoadAchievements) {
			EDITOR.on("fileSave", achiveSaveFile);
			EDITOR.on("fileChange", achiveFileChange);
		}
		
		firstTimeLoadAchievements = false;
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
