(function() {

"use strict";

EDITOR.plugin({
		desc: "Preview SVG images",
		load: function loadSvgPreview() {
			
			EDITOR.on("previewTool", previewSvg);
			
}
unload: function unloadSvgPreview() {
			
			EDITOR.removeEvent("previewTool", previewSvg);
			
}
});

	function previewSvg(file) {
		
		if(UTIL.getFileExtension(file.path) != "png") return false;
		
		var folder = UTIL.getDirectoryFromPath(file.path);
		var fileName = UTIL.getFilenameFromPath(file.path);
		
		CLIENT.cmd("serve", {folder: folder}, function httpServerStarted(err, json) {
			if(err) return alertBox(err.message);
			
			var urlPath = json.url;
			
			var url = UTIL.joinPaths(urlPath, fileName);
			
			
			
			
		});
		
		
		return true;
	}

})();
