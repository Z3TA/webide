function copyFileSync( source, target ) {
	
	var fs = require('fs');
	var path = require('path');
	
	var targetFile = target;
	
	//if target is a directory a new file with the same name will be created
	if ( fs.existsSync( target ) ) {
		if ( fs.lstatSync( target ).isDirectory() ) {
			targetFile = path.join( target, path.basename( source ) );
		}
	}
	
	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

module.exports = copyFileSync;
