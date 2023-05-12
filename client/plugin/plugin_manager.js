/*

	We have trouble loading the editor on less powerful devices such as feature phones... (KaiOS)


*/

(function() {

	// Place optional plugins here:
	var opt = [
		"/plugin/opt/chatgpt.js",
		"/plugin/opt/txt_calc.js",
		"/plugin/opt/animate_delete_letter.js",
		"/plugin/opt/bigger_text.js",
		"/plugin/opt/coffee_break.js",
		"/plugin/opt/emoji_modifier.js"
	];

	// Place the plugin you are currently working on ontop!
	var dev = [ 
		"/plugin/dev/t9_prediction.js",
		"/plugin/dev/chromiumBrowserVnc.js",
		"/plugin/dev/debug_keypresses.js",
		"/plugin/dev/dictate.js",
		"/plugin/dev/lsp.js",
		"/plugin/dev/qml.js",
		"/plugin/dev/test_dialog.js",
		"/plugin/dev/treesitter.js"
	];

	var tests = [
		"/tests/autocomplete_js.js",
		"/tests/js_parser.js",
		"/tests/scroll_nope_del_selection.js",
		"/tests/textDiff.js",
		"/tests/core_tests.js",
		"/tests/no_render.js",
		"/tests/server.js",
		"/tests/vb_script.js",
		"/tests/getFolders.js",
		"/tests/test_file.js",
		"/tests/testWysiwygEditor.js",
		"/tests/mercurial.js",
		"/tests/connections.js",
		"/tests/readLines.js",
		"/tests/testEditor.js",
		"/tests/jsx.js",
		"/tests/ssg.js"
	];

	var menuLoadTests;

	EDITOR.plugin({
		desc: "Plugin manager",
		load: function loadPluginManager() {
			
			if(EDITOR.settings.devMode) {
				setTimeout(loadDev, 0);
				if(!LOW_RAM) {
					setTimeout(loadOpt, 1000);
					setTimeout(loadTests, 2000);
				}
				else {
					menuLoadTests = EDITOR.windowMenu.add("Load tests", [S("Editor"), 5000], loadTests);
				}
			}
			else {
				console.log("plugin_manager: Not loading plugins in /plugin/dev/ because EDITOR.settings.devMode=" + EDITOR.settings.devMode);

				setTimeout(loadOptBundle, 2000);

			}

			console.log("plugin_manager: Loaded the plugin manager!");

		},
		unload: function unloadPluginManager() {

			EDITOR.windowMenu.remove(menuLoadTests);

		},
		order: "999999" // Make sure it's loaded last
	});

	function loadTests() {
		console.log("plugin_manager: Loading tests...");
		tests.forEach(EDITOR.loadScript);

	}

	function loadOpt() {
		console.log("plugin_manager: Loading optional plugins...");
		opt.forEach(EDITOR.loadScript);
	}

	function loadOptBundle() {
		EDITOR.loadScript("/plugin/opt.bundle.js");
	}

	function loadDev() {
		console.log("plugin_manager: Loading development plugins...");
		if(LOW_RAM) {
			// Only load the first listed
			EDITOR.loadScript(dev[0]);
			return;
		}
		dev.forEach(EDITOR.loadScript);
	}


})();
