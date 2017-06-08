function pwHash(pw) {
	
	var crypto = require('crypto');
	var salt = "confuse";
	var hash = "";
	var temp = "";
	
	for(var i=0; i<100; i++) {
		for(var j=0; j<10000; j++) {
			temp = temp + pw + salt + pw + hash + pw;
		}
		hash = crypto.createHash('md5').update(temp).digest("hex");
		temp = "";
	}
	
	return hash;
}
module.exports = pwHash;
