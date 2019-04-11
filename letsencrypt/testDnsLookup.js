/*
	
	test:
	
	sudo node letsEncryptDns.js
	
	(Replace zetafiles.org below with your master DNS server)
	
	curl "https://zetafiles.org/DNS/txt?stage=before&name=xn--zta-qla.com&value=testvaluexyz&secret=changeme"
	curl "https://zetafiles.org/DNS/txt?stage=before&name=www.xn--zta-qla.com&value=testvaluxyze2&secret=changeme"
	
	curl "https://zetafiles.org/DNS/txt?stage=after&name=xn--zta-qla.com&value=testvaluexyz&secret=changeme"
	curl "https://zetafiles.org/DNS/txt?stage=after&name=www.xn--zta-qla.com&value=testvaluxyze2&secret=changeme"
	
	named-checkconf -z
	
*/

var dns = require('dns');
var resolver = new dns.Resolver();

var nameServer = '127.0.0.1'
resolver.setServers([nameServer]);

var name = "xn--zta-qla.com";

resolver.resolveTxt("_acme-challenge." + name, function(err, results) {
var correctValue = false;

if(err) {
if(err.code == "ENOTFOUND") {
console.log(nameServer + " can not find TXT record for _acme-challenge." + name + "");
}
else {
			console.log("Something went wrong making dns query to " + nameServer + ": " + err.message);
}
}

if(!err) {
		console.log("dns results=" + JSON.stringify(results));
}
});

