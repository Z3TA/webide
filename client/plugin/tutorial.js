(function() {
"use strict";

	var achievements = {};
	var experience = 0; // todo
	
	EDITOR.plugin({
		desc: "Tutorial: Show friendly help messages",
		load: loadTutorial,
		unload: unloadTutorial,
	});

	function loadTutorial() {
		EDITOR.on("storageReady", loadAchievements);
		EDITOR.on("fileSave", achiveSaveFile);
		EDITOR.on("fileChange", achiveFileChange);
		}
	
	function unloadTutorial() {
		EDITOR.removeEvent("storageReady", loadAchievements);
		EDITOR.removeEvent("fileSave", achiveSaveFile);
		EDITOR.removeEvent("fileChange", achiveFileChange);
	}
	
	
	function achiveFileChange(file) {
		if(!achievements.fileSave) alertBox('Press Ctrl + S to save changes!');
		
		achived("fileChange");
		EDITOR.removeEvent("fileChange", achiveFileChange);
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
	
})();