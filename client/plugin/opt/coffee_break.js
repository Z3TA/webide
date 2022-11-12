(function() {
	"use strict";

	var winMenu = [];
	var interval;

	EDITOR.plugin({
		desc: "Take a break from work",
		load: function loadCoffeeBreak() {

			winMenu[0] = EDITOR.windowMenu.add(S("min10"), ["Node.js", S("coffee_break"), 1], makeTakeBreak(10));
			winMenu[1] = EDITOR.windowMenu.add(S("min15"), ["Node.js", S("coffee_break"), 2], makeTakeBreak(15));
			winMenu[2] = EDITOR.windowMenu.add(S("min20"), ["Node.js", S("coffee_break"), 3], makeTakeBreak(20));


		},
		unload: function unloadCoffeeBreak() {

			winMenu.forEach(function(menu) {
				EDITOR.windowMenu.remove(menu);
			});

		}
	});

	function makeTakeBreak(minutes) {
		
		function takeBreak() {
			var progress = document.getElementById("coffeeBreakProgress");
			if(progress) {
				clearInterval(interval);
				progress.max = (minutes*60*1000);
				waitForAlert();
				return;
			}

			alertBox('<center><b>Compiling...</b></center><br><br><progress class="progress" id="coffeeBreakProgress" value="0" min="0" max="' + (minutes*60*1000) + '" style="height:20px">hello</progress><br><span id="coffeeBreakText"></span>');

			setTimeout(waitForAlert, 1000);

			function waitForAlert() {
				var progress = document.getElementById("coffeeBreakProgress");
				var text = document.getElementById("coffeeBreakText");
				var counter = 0;
				var fileIndex = 0;

				// todo: show files in folder and subfolders...

				interval = setInterval(tick, 100);

				progress.style.display = 'block'; // Reset display:none

				function tick() {
					counter = counter + Math.floor(Math.random() * 201);
					progress.value = counter;
					//console.log(progress.value, parseInt(progress.value), parseInt(progress.value) + 10, progress);
				}
			
			}

		}

		return UTIL.nameFunction(takeBreak, "takeBreak" + minutes);

	}


})();



