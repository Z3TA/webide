(function() {
	"use strict";

	var winMenu;
	
	EDITOR.plugin({
		desc: "Take a break from work",
		load: function loadCoffeeBreak() {

			winMenu = EDITOR.windowMenu.add(S("min10"), ["Node.js", S("coffee_break"), 40], makeTakeBreak(10));

		},
		unload: function unloadCoffeeBreak() {

			EDITOR.windowMenu.remove(winMenu);

		}
	});

	function makeTakeBreak(minutes) {
		
		function takeBreak() {

			alertBox('<center><b>Compiling...</b><br><br><progress id="coffeeBreakProgress" value="0" max="' + (minutes*60*1000) + ' width="100%" height="40">');

			setTimeout(waitForAlert, 1000); 

			function waitForAlert() {
				var progress = document.getElementById("coffeeBreakProgress");
				var interval = setInterval(tick, 100);

				progress.style.display = 'block'; // Reset display:none

				function tick() {
					progress.value = (parseInt(progress.value) + 10);
					console.log(progress.value, parseInt(progress.value), parseInt(progress.value) + 10, progress);
				}
			
			}

		}

		return UTIL.nameFunction(takeBreak, "takeBreak" + minutes);

	}


})();



