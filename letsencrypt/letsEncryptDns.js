/*
	
	This service is meant to run on a DNS server to handle letsencrypt DNS challanges such as:
	
	Please deploy a DNS TXT record under the name
	_acme-challenge.johan.webide.se with the following value:
	
	LJQIGP1nHSfxPHq8_KfhnWWl9gscmT_7yw4GJv7dwdo
	
	Note: Certbot currently don't support hooks with automaitcally renewing, so you need to use crontab!

	certbot renew --manual-auth-hook="/srv/jzedit/letsencrypt/certbot-manual-auth-hook.sh" --manual-cleanup-hook="/srv/jzedit/letsencrypt/certbot-manual-cleanup-hook.sh" 

certbot certonly --manual --preferred-challenges dns --agree-tos --email zeta@zetafiles.org -d 'johan.webide.se,*.johan.webide.se'
	certbot certonly --nginx --noninteractive --agree-tos --email zeta@zetafiles.org -d johan.webide.se
	
	certbot certonly --staging --manual --manual-public-ip-logging-ok --preferred-challenges dns --noninteractive --agree-tos --email zeta@zetafiles.org -d 'johan.webide.se,*.johan.webide.se' --manual-auth-hook="/srv/jzedit/letsencrypt/certbot-manual-auth-hook.sh" --manual-cleanup-hook="/srv/jzedit/letsencrypt/certbot-manual-cleanup-hook.sh" 

	
	Problem:
	We need to register two domains *.user.webide.se and user.webide.se and Letsencrypt wants us to add TWO txt records,
	both for user.webide.se
	
	
*/

var IP_OK = ["127.0.0.1", "5.9.139.7"]; // List of trusted IP addresses
var TLDS = ["webide.se"]; // Domains we handle
var HTTP_PORT = "8102";
var HTTP_IP = "127.0.0.1";
var SECRET = "changeme"; // Change this to prevent a malicious user to add custom TXT records to your TLD's!!

var IN_PROGRESS = false; // We can only process one request at a time
var QUEUE = [];

const module_http = require("http");
const module_fs = require("fs");
const module_child_process = require('child_process');

var httpServer = module_http.createServer(handleHttpRequest);
httpServer.listen(HTTP_PORT, HTTP_IP);

function handleHttpRequest(req, resp) {
	
	var IP = req.headers["x-real-ip"] || req.connection.remoteAddress;
	
	console.log("Request from " + IP + ": " + req.url);
	
	if(IP_OK.indexOf(IP) == -1) return resp.end("IP not authorized: " + IP);
	
	var match = req.url.match(/.*\?stage=(before|after)&name=([A-Za-z0-9_.-]*)&value=([A-Za-z0-9_.-]*)&secret=([A-Za-z0-9_.-]*)/);
	
	if(match == null) return resp.end("Malformed request url: " + req.url);
	
	var stage = match[1];
	var name = match[2];
	var value = match[3];
	var secret = match[4];
	
	if(secret != SECRET) return resp.end("Bad secret: " + secret);
	
	var work = {stage: stage, name: name, value: value, resp: resp, time: new Date()};
	
	QUEUE.push(work);
	
	workQueue();
	
}

function workQueue() {
	
	if(IN_PROGRESS) {
		console.log("Work in progress, waiting ... queue=" + QUEUE.length + "");
		setTimeout(workQueue, 1000);
	}
	
	// Sort so that "before" will be precessed first, then so that the oldest will be processed first
	QUEUE.sort(function sortQueue(a, b) {
		if(a.stage == "before" && b.stage == "after") return 1; // B , A
		else if(b.stage == "before" && a.stage == "after") return -1; // A , B
		else if(a.date < b.date) return 1; // B , A
		else if(b.date < a.date) return -1; // A , B
		else return 0;
	});
	var work = QUEUE.pop();
	
	if(!work) throw new Error("No work to do!");
	
	processWork(work);
	
}


function processWork(work) {

	var stage = work.stage;
	var name = work.name;
	var value = work.value;
	var resp = work.resp;
	
	if(IN_PROGRESS) {
		resp.end("We can only process one request at a time. Please try again later!");
		return;
	}
	
	IN_PROGRESS = true;
	
	console.log("Processing: stage=" + stage + " name=" + name + " value=" + value);
	
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
	
	var challangeString = name + '. 60 IN TXT "' + value + '"\n';
	var specificString = "*." + subname + " IN CNAME " + tld + ".\n" + subname + " IN CNAME " + tld + ".\n";
	
	//console.log(appendString);
	
	var zoneFile = "/etc/bind/zones/db." + tld;
	
	module_fs.readFile(zoneFile, "utf8", function readZoneFile(err, zoneData) {
		if(err) {
			resp.end("Error: Problem reading zone file: " + zoneFile);
			console.log(err.message);
			IN_PROGRESS = false;
			return;
		}
		
		var start = zoneData.indexOf(paddingStart);
		var end = zoneData.indexOf(paddingEnd) + paddingEnd.length;
		
		if(stage == "afterx") {
			// Clean up
			if(start == -1) {
				resp.end("Error: Cannot find start padding for " + subname + " in zone file: " + zoneFile);
				console.error("Error: Unable to find string '" + paddingStart + "' in " + zoneFile);
				IN_PROGRESS = false;
				return;
			}
			if(end == paddingEnd.length-1) {
				resp.end("Error: Cannot find end padding for " + subname + " in zone file: " + zoneFile);
				console.error("Error: Unable to find string '" + paddingEnd + "' in " + zoneFile);
				IN_PROGRESS = false;
				return;
			}
			
			// Only remove the challange string!
			zoneData = zoneData.slice(0, zoneData.indexOf(challangeString)) + zoneData.slice(zoneData.indexOf(challangeString) + challangeString.length);
			
			if(zoneData.indexOf(name + " IN TXT") == -1) {
				// It no longer contains any challange strings.
				// We can also remove the padding
				zoneData = zoneData.slice(0, start) + zoneData.slice(end);
			}
			
		}
		
		if(stage == "before") {
			
			if(start == -1) {
				zoneData += paddingStart;
				zoneData += challangeString;
				zoneData += specificString;
				zoneData += paddingEnd;
			}
			else {
				// A Letsencrypt TXT challange record already exist.
				// Add another inside the padding
				zoneData = zoneData.slice(0, start + paddingStart.length) + challangeString + zoneData.slice(start + paddingStart.length);
			}
		}
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
			IN_PROGRESS = false;
			return;
		}
		
		var serialNr = parseInt(matchSerial[2]);
		if(isNaN(serialNr)) {
			resp.end("Error: Problems finding serial number in zone file: " + zoneFile);
			console.error("Error: matchSerial=" + JSON.stringify(matchSerial) + ". unable to find serial number in " + zoneFile);
			IN_PROGRESS = false;
			return;
		}
		
		serialNr++;
		zoneData = zoneData.replace(reSerial, "$1" + serialNr + "$3");
		
		module_fs.writeFile(zoneFile, zoneData, function writeZoneFile(err) {
			if(err) {
				resp.end("Problem writing to zone file: " + zoneFile);
				console.log(err.message);
				IN_PROGRESS = false;
				return;
			}
			
			// Reload bind9/named
			module_child_process.exec("service bind9 reload", function reloadNS(error, stdout, stderr) {
				
				if(error || stderr) {
					resp.end("Error: Failed to reload name servers");
					console.error(error || stderr);
					IN_PROGRESS = false;
					return;
				}
				
				if(stdout) console.log(stdout);
				
				resp.end("OK");
				
				IN_PROGRESS = false;
				
			});
		});
		
	});

}

	
	
	
