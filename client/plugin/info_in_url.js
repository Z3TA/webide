(function() {
	/*

		todo: Load file in the hash when editor starts!


	*/
	EDITOR.plugin({
		desc: "Show file info in URL",
		load: function loadUrlFile() {

			EDITOR.on("fileShow", showInfoInUrl);

		},
		unload: function unloadUrlFile() {
			EDITOR.removeEvent("fileShow", showInfoInUrl);
		}
	});

	function showInfoInUrl(file) {
		if(!file) return;

		var urlPath = window.location.search + "#" + file.path;

		window.history.pushState({"filePath": file.path}, file.path, urlPath);

	}

	window.onpopstate = function browserNavigation(ev){
		console.log("info_in_url: browserNavigation: ev=", ev);
		if(ev.state) {
			console.log("info_in_url:browserNavigation: ev.state=", ev.state);
		
			// todo: Switch to the file in the adress hash!

		}
	};

})();
