/*
	
	Handle server messages about nodejs modules
	
*/

(function() {
	"use strict";
	
EDITOR.plugin({
		desc: "Handle server messages about nodejs modules",
		load: loadNpm,
		unload: unloadNpm
	});

	function loadNpm() {
		
		CLIENT.on("node_module", handleModule);
		CLIENT.on("package_json", handlePackageJsonRequest);
		
	}
	
	function unloadNpm() {
		
	}
	
	function handleModule(m) {
		
		
		
	}
	
	function handlePackageJsonRequest() {
		
	}
	
	
})();