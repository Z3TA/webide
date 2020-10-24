(function() {
	/*

		Goal of this plugin:
		* Autocomplete CSS rules
		* Show invalid CSS rules
		* Show/goto rules that override current value


	*/

	EDITOR.plugin({
		desc: "CSS intellisense",
		load: function loadCssIntellisense() {


			EDITOR.on("autoComplete", autoCompleteCssRules);

		},
		unload: function unloadCssIntellisense() {

			EDITOR.removeEvent("autoComplete", autoCompleteCssRules);

		}
	});


	function autoCompleteCssRules(file, word, wordLength, gotOptions) {

	}

	var cssRule = [
		""
	]


})();