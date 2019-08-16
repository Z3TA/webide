(function() {

/*

navigator.canShare && navigator.canShare

*/

	var windowMenu;
	
EDITOR.plugin({
desc: "Allow sharing stuff with other apps",
		load:function loadShare() {

			windowMenu = EDITOR.windowMenu.add("Share", ["Edit", 10], shareSomething);

			console.log("typeof navigator.share=" + typeof navigator.share);

},
		unload: function unloadShare() {

EDITOR.windowMenu.remove(windowMenu);
			
}
});
	
	
	function shareSomething() {
		
		var filesArray = [
			//???
		];
		
		if (navigator.canShare && navigator.canShare( { files: filesArray } )) {
			navigator.share({
				files: filesArray,
				title: 'Vacation Pictures',
				text: 'Barb\nHere are the pictures from our vacation.\n\nJoe',
			})
			.then(shareSuccessful)
			.catch(shareError);
		} else {
			alertBox("Your device/browser doesn't support sharing files.");
		}
		
		
		function shareSuccessful() {
			console.log('Share was successful.')
		}
		
		function shareError(err) {
			console.error(err);
		}
		
	}


})();