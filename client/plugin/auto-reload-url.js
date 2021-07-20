
(function() {
	"use strict";

	var windowMenu;
	var oldURL;
	var saveEventListenerAdded = false;
	var watch = []; // {url, win}
	var intervalTime = 30000;

	EDITOR.plugin({
		desc: "Auto reload URL when content changes",
		load: function autoReloadLoad() {
			windowMenu = EDITOR.windowMenu.add(S("auto_reload_url"), [S("Tools"), 20], startAutoReload);
		},
		unload: function autoReloadUnload() {
			if(windowMenu) EDITOR.windowMenu.remove(windowMenu);

			watch.forEach(unload);

			if(saveEventListenerAdded) EDITOR.removeEventListener("afterSave", reloadAfterSave);
		}
	});

	function unload(watcher) {
		console.log("auto-reload-url: unload: url=" + watcher.url);
		clearTimeout(watcher.timer);
		watcher.win.close();
		var index = watch.indexOf(watcher);
		if(index == -1) throw new Error("watcher=", watcher, " not found in watch=", watch);
		watch.splice(index, 1);
	}
		
	function startAutoReload() {
		var msg = "Open the following URL in a new window ... And automatically reload when the page source changes:";
		var options = {
			placeholder: "http://www"
		};

		if(oldURL) options.defaultValue = oldURL;

		promptBox(msg, options, function(url) {
			if(!url) return;

			oldURL = url;

			EDITOR.createWindow(cacheBust(url), function(err, win) {
				var oldSource;

				var watcher = {
					url: url,
					win: win,
					oldHash: "",
					interval: undefined
				};

				watch.push(watcher);

				makeTimer(watcher);

				if(!saveEventListenerAdded) {
					EDITOR.on("afterSave", reloadAfterSave);
					saveEventListenerAdded = true;
				}
			});
					
		});
	}

	function makeTimer(watcher) {
		watcher.timer = setTimeout(function checkAgain() {
			checkURL(watcher, function() {
				setTimeout(checkAgain, intervalTime);
			});
		}, intervalTime);
	}

	function reloadAfterSave(file) {
		console.log("auto-reload-url: reloadAfterSave: watch.length=" + watch.length);
		watch.forEach(function (watcher) {
			clearTimeout(watcher.timer);
			checkURL(watcher, function() {
				makeTimer(watcher);
			});
		});

		return ALLOW_DEFAULT;
	}

	function cacheBust(url) {
		return url + (url.indexOf("?") == -1 ? "?" : "&") + "cachebust=" + UTIL.randomNumbers(8);
	}

	function checkURL(watcher, callback) {
		console.log("auto-reload-url: checkURL: intervalTime=" + intervalTime + " url=" + watcher.url);

		if(!watcher.win || watcher.win.closed) {
			console.error("watcher.win=", watcher.win);
			unload(watcher);
			return;
		}

		// Server side httpGet don't have a cache so no cacheBust needed here
		CLIENT.cmd("httpGet", {url: watcher.url, onlyHash: true}, function(err, resp) {
			if(err) {
				alertBox("Auto-reload-url plugin was unable to retreive page/url=" + watcher.url + " Error given: " + err.message);
				unload(watcher);
			}
			else {

				var hash = resp.hash;

				console.log("auto-reload-url: checkURL: oldHash=" + watcher.oldHash + " hash=" + hash);

				if(watcher.oldHash == "") {
					watcher.oldHash = hash;
				}
				else if(watcher.oldHash != hash) {
					console.log("auto-reload-url: checkURL: Source has been updated!");
					//win.location.reload(); // Permission denied to access property "reload" on cross-origin object (code=18)
					watcher.win.location = cacheBust(watcher.url);

					watcher.oldHash = hash;
				}
			}
			
			if(callback) callback();
		
		});
	}

})();
