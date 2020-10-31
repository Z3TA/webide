/*

	Tests for the static site generator

*/

EDITOR.addTest(function ssgCompileEmptyFile(callback) {
	var testFolder = EDITOR.user.homeDir + "tmp/ssg-test/";
	var srcDir = testFolder + "src/";
	var previewDir = testFolder + "preview/";
	EDITOR.createPath(srcDir, function(err) {
		if(err) throw err;
		EDITOR.saveToDisk(srcDir + "empty.htm", "", function(err) {
			if(err) throw err;

			var opt = {source: srcDir, destination: previewDir, publish: false};

			var timeout = 2000; // ms
			CLIENT.cmd("SSG.compile", opt, timeout, function(err, json) {
				if(err) throw err;

				// Cleanup
				CLIENT.cmd("deleteDirectory", {directory: testFolder, recursive: true}, function(err, json) {
					if(err) throw err
					callback(true);
				});
			});
		});
	});
});


