/*
	
	This service is meant to run on a DNS server to handle letsencrypt DNS challanges such as:
	
	Please deploy a DNS TXT record under the name
	_acme-challenge.johan.webide.se with the following value:
	
	LJQIGP1nHSfxPHq8_KfhnWWl9gscmT_7yw4GJv7dwdo
	
Note: Certbot currently don't support hooks with automaitcally renwing, so you need to use crontab!

	certbot renew --manual-auth-hook="/srv/jzedit/letsencrypt/certbot-manual-auth-hook.sh" --manual-cleanup-hook="/srv/jzedit/letsencrypt/certbot-manual-cleanup-hook.sh" 

certbot certonly --manual --preferred-challenges dns --agree-tos --email zeta@zetafiles.org -d 'johan.webide.se,*.johan.webide.se'



*/

var IP_OK = ["127.0.0.1", "5.9.139.7"]; // List of trusted IP addresses
var TLDS = ["webide.se"]; // Domains we handle
var HTTP_PORT = "8102";
var HTTP_IP = "127.0.0.1";
var SECRET = "changeme"; // Change this to prevent a malicious user to add custom TXT records to your TLD's!!

const module_http = require("http");
const module_fs = require("fs");
const module_child_process = require('child_process');

var httpServer = module_http.createServer(handleHttpRequest);
httpServer.listen(HTTP_PORT, HTTP_IP);

function handleHttpRequest(req, resp) {
	
	var IP = req.headers["x-real-ip"] || req.connection.remoteAddress;
	
	console.log("Request from " + IP + ": " + req.url);
	
	if(IP_OK.indexOf(IP) == -1) return resp.end("IP not authorized: " + IP);
	
	var match = req.url.match(/\?stage=(before|after)&name=([A-Za-z0-9_.]*)&value=([A-Za-z0-9_.]*)&secret=([A-Za-z0-9_.]*)/);
	
	if(match == null) return resp.end("Malformed request url: " + req.url);
	
	var stage = match[1];
	var name = match[2];
	var value = match[3];
	var secret = match[4];
	
	if(secret != SECRET) return resp.end("Bad secret: " + secret);
	
	var domainParts = name.split(".");
	
	var tld = domainParts[domainParts.length-2] + "." +  domainParts[domainParts.length-1];
	
	if(TLDS.indexOf(tld) == -1) return resp.end("Unknown TLD: " + tld);
	
	var subname =  domainParts[domainParts.length-3];
	
	/*
		Bacause we add a very specific TXT record,
		we must also add specific subdomain and subdomain wildcard
	*/
	
	var paddingStart = "; Start Letsencrypt challange for " + subname + "\n";
	var paddingEnd = "; End Letsencrypt challange for " + subname + "\n\n";
	
	var appendString = paddingStart +
	name + ' IN TXT "' + value + '"\n' +
	"*." + subname + " IN CNAME " + tld + ".\n" +
	subname + " IN CNAME " + tld + ".\n" + paddingEnd;
	
	//console.log(appendString);
	
	var zoneFile = "/etc/bind/zones/db." + tld;
	
	module_fs.readFile(zoneFile, "utf8", function readZoneFile(err, zoneData) {
		if(err) {
resp.end("Error: Problem reading zone file: " + zoneFile);
			console.log(err.message);
			return;
		}
		
		if(stage == "before") {

			zoneData += appendString;
		}
		else if(stage == "after") {
			// Clean up
			var start = zoneData.indexOf(paddingStart);
			var end = zoneData.indexOf(paddingEnd) + paddingEnd.length;
			
			if(start == -1) {
				resp.end("Error: Cannot find start padding for " + subname + " in zone file: " + zoneFile);
				console.error("Error: Unable to find string '" + paddingStart + "' in " + zoneFile);
				return;
			}
			if(start == paddingEnd.length-1) {
				resp.end("Error: Cannot find end padding for " + subname + " in zone file: " + zoneFile);
				console.error("Error: Unable to find string '" + paddingEnd + "' in " + zoneFile);
				return;
			}
			
			zoneData = zoneData.slice(0, start) + zoneData.slice(end);
		}
		else throw new Error("Unknown stage: " + stage);
		
		/*
			Increment serial
			The serial needs to be on it's own line And commented!
			Example:
			@       IN      SOA     ns2.zetafiles.org. zeta.zetafiles.org. (
			24         ; Serial
			10800         ; Refresh (seconds)
			3600         ; Retry
			1296000         ; Expire
			86400 )       ; Negative Cache TTL
			
			Most admins advocate for using a time-stamp as serial, 
			but not us, we'll just increment with one =)
		*/ 
		
		var reSerial = /(\s*)(\d+)(\s*; Serial)/i;
		
		var matchSerial = zoneData.match(reSerial);
		
		if(matchSerial == null) {
			resp.end("Error: Cannot match serial number in zone file: " + zoneFile);
			console.error("Error: Unable to find " + reSerial + " in " + zoneFile);
			return;
		}
		
		var serialNr = parseInt(matchSerial[2]);
		if(isNaN(serialNr)) {
			resp.end("Error: Problems finding serial number in zone file: " + zoneFile);
			console.error("Error: matchSerial=" + JSON.stringify(matchSerial) + ". unable to find serial number in " + zoneFile);
			return;
		}
		
		serialNr++;
		zoneData = zoneData.replace(reSerial, "$1" + serialNr + "$3");
		
		module_fs.writeFile(zoneFile, zoneData, function writeZoneFile(err) {
			if(err) {
resp.end("Problem writing to zone file: " + zoneFile);
				console.log(err.message);
				return;
			}
			
			// Reload bind9/named
			module_child_process.exec("servince bind9 reload", function reloadNS(error, stdout, stderr) {
				
if(error || stderr) {
					resp.end("Error: Failed to reload name servers");
					console.error(error || stderr);
					return;
}

if(stdout) console.log(stdout);

				resp.end("OK");
				
			});
		});
		
	});

}

	
	
	
	
	
