function pwHash(pw) {
	
	var crypto = require('crypto');
	var salt = "confuse";
	var hash = "";
	var temp = "";
	
	/*
		Do many hashes and string concatenations to make it harder to brute force the passwords.
		Although we don't want it to take too long time or it could be used as a DOS-attack on the server.
		We should limit login attempts to one per second or less.
	*/
	
	for(var i=0; i<100; i++) {
		for(var j=0; j<1000; j++) {
			temp = temp + pw + salt + pw + hash + pw;
		}
		hash = crypto.createHash('md5').update(temp).digest("hex");
		temp = "";
	}
	
	return hash;
}
module.exports = pwHash;
