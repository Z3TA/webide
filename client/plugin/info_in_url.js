(function() {

	EDITOR.plugin({
		desc: "Show file path in URL",
		load: function loadUrlFile() {

			EDITOR.bindKey({desc: "teeest", key: "tab", combo: SHIFT, fun: teest});

		},
		unload: function unloadUrlFile() {

		}
	});


	function teest() {
		alert("test!");

		return PREVENT_DEFAULT;
	}

})();
