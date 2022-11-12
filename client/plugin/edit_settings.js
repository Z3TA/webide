/*

	For when you want to manually edit a settings variable, which is most of the time a JSON object

*/

(function() {
	"use strict";

	var editSettingsMenu;
	var protocol = "settings";
	var protocolPrefix = protocol + "://";

	EDITOR.plugin({
		desc: "Edit settings",
		load: function loadEditSettings() {
			
			// label, where, whenClicked, separator, keyComboFunction

			editSettingsMenu = EDITOR.windowMenu.add("Edit settings", [S("Editor"), 1500], editSettings);

			EDITOR.addProtocol(protocol, {
				list: listSettings,
				read: readSetting,
				write: writeSetting,
				hash: hashSettings,
				size: sizeOfSetting,
				del: delSetting,
				findFiles: findInSettings,
				findReplace: replaceInSettings
			});
			
		},
		unload: function unloadEditSettings() {
			EDITOR.windowMenu.remove(editSettingsMenu);
			
		}
	});

	function editSettings() {
		EDITOR.windowMenu.hide();

		promptBox("Which setting do you want to edit ?", function(answer) {
			if(answer==null) return;
			EDITOR.openFile(protocolPrefix + answer);
		});
	}

	function listSettings(pathToFolder, callback) {
		callback( new Error("Not yet implemented") );
	}

	function findInSettings(options) {
		throw new Error("Not yet implemented");
	}

	function replaceInSettings(options) {
		throw new Error("Not yet implemented");
	}


	function delSetting(path, callback) {
		var settingName = path.slice(protocolPrefix.length);
		try {
			EDITOR.deleteSettings(settingName);
		}
		catch(err) {
			return callback(err);
		}
		callback(null);
	}

	function sizeOfSetting(path, callback) {
		readSetting(path, function(err, text) {
			if(err) return callback(err);

			var size = UTIL.byteSize(text);
			callback(null, size);
		});
	}

	function hashSettings(path, callback) {
		readSetting(path, function(err, path, text, hash) {
			if(err) return callback(err);

			callback(null, hash);
		});
	}

	function readSetting(path, returnBuffer, encoding, callback) {
		if(typeof returnBuffer == "function") callback = returnBuffer;
		if(typeof encoding == "function") callback = encoding;

		var settingName = path.slice(protocolPrefix.length);

		EDITOR.loadSettings(settingName, function settingLoaded(setting) {

			if(setting === null) {
				var error = new Error("Setting for " + settingName + " can not be found!");
				error.code = "ENOENT";
				return callback(error);
			}

			var str = JSON.stringify(setting, null, 2);

			UTIL.hash(str, function(err, hash) {
				if(err) return callback(err);

				callback(null, path, str, hash);
			});
		});

	}

	function writeSetting(path, text, inputBuffer, encoding, timeout, callback) {
		if(typeof inputBuffer == "function") callback = inputBuffer;
		if(typeof encoding == "function") callback = encoding;
		if(typeof timeout == "function") callback = timeout;

		var settingName = path.slice(protocolPrefix.length);

		try {
			var json = JSON.parse(text);
		}
		catch(err) {
			return callback(new Error(settingName + " can't be converted to JSON! Error: " + err.message));
		}

		EDITOR.saveSettings(settingName, json);

		UTIL.hash(text, function(err, hash) {
			if(err) {
				console.error(err);
			}
			callback(null, path, hash);
		});
	}



})();
