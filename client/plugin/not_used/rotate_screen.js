/*
	For devices that can't rotate the screen. Allmost all devices can rotate the screen though, so there is no use of this plugin

	Note: we should fall back to css rotate

*/
(function() {

	var menuRotate;

	EDITOR.plugin({
		desc: "Take a break from work",
		load: function loadCoffeeBreak() {
			menuRotate = EDITOR.windowMenu.add("Rotate screen", [S("View"), 1], rotateScreen);
		},
		unload: function unloadCoffeeBreak() {
			EDITOR.windowMenu.remove(menuRotate);
		}
	});

	function rotateScreen() {

		console.log("rotate_screen:rotateScreen: Attempting to rorate the screen...");
		document.body.requestFullscreen().then(function(resp) {
			console.log("rotate_screen:rotateScreen: requestFullscreen: resp=" + resp);

			return screen.orientation.lock('landscape');

		}).then(function(resp) {
			console.log("rotate_screen:rotateScreen: orientation lock: resp=" + resp);

		}).catch(function(err) {

			alertBox("Failed to rotate the screen! " + err.message);
		});

	}


})();
