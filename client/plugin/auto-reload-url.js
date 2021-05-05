
(function() {
	"use strict";

	var windowMenu;
	var oldURL;

	EDITOR.plugin({
		desc: "Auto reload URL when content changes",
		load: function autoReloadLoad() {
			windowMenu = EDITOR.windowMenu.add(S("auto_reload_url"), [S("Tools"), 20], startAutoReload);
		},
		unload: function autoReloadUnload() {
			if(windowMenu) EDITOR.windowMenu.remove(windowMenu);
		}
	});

	function startAutoReload() {
		var msg = "Open the following URL in a new window ... And automatically reload when the page source changes:";
		var options = {
			placeholder: "http://www"
		};

		if(oldURL) options.defaultValue = oldURL;

		promptBox(msg, options, function(url) {
			if(!url) return;

			oldURL = url;

			EDITOR.createWindow(url, function(err, win) {
var oldSource;
				checkURL();

				function checkURL() {
					if(!win || win.closed) return;

					CLIENT.cmd("httpGet", {url: url}, function(err, resp) {

						if(err) alertBox("Unable to retreive page source or url=" + url + " Error given: " + err.message);
						else {

							var source = resp.body;

							//console.log("auto-reload-url: checkURL: oldSource=", oldSource, "\n\nsource=" + source);

							if(oldSource != source) {
								//console.log("auto-reload-url: checkURL: Source has been updated!");
								//win.location.reload(); // Permission denied to access property "reload" on cross-origin object (code=18)
								win.location=url;
								setTimeout(checkURL, 3000);
							}
							else {
								//console.log("auto-reload-url: checkURL: Source not changed!");
								setTimeout(checkURL, 2000);
							}

							oldSource = source;

						}
					});
}
});
});
	}

})();
