/*
	
	This service is meant to run on a DNS master server to handle letsencrypt DNS challanges such as:
	
	Please deploy a DNS TXT record under the name
	_acme-challenge.johan.webide.se with the following value:
	
	LJQIGP1nHSfxPHq8_KfhnWWl9gscmT_7yw4GJv7dwdo
	---------------------------------------------------------------------------------------------------
	
	install: See letsEncryptDns.service
	
	
	Note: Certbot currently don't support hooks with automaitcally renewing, so you need to use crontab!
	Add the following command to crontab on the cloudIDE server (replace path to jzedit):
	certbot renew --manual-auth-hook="/srv/jzedit/letsencrypt/certbot-manual-auth-hook.sh" --manual-cleanup-hook="/srv/jzedit/letsencrypt/certbot-manual-cleanup-hook.sh" 
	
	
	How to test on the cloudIDE server (replace path to jzedit):
	certbot certonly --staging --manual --manual-public-ip-logging-ok --preferred-challenges dns --noninteractive --agree-tos --email zeta@zetafiles.org -d 'johan.webide.se,*.johan.webide.se' --manual-auth-hook="/srv/jzedit/letsencrypt/certbot-manual-auth-hook.sh" --manual-cleanup-hook="/srv/jzedit/letsencrypt/certbot-manual-cleanup-hook.sh" 
	
	Delete a cert:
	certbot delete
	
	
	---------------------------------------------------------------------------------------------------
	Problem 1: 
	We need to register two domains ! (*.user.webide.se and user.webide.se)
	so Letsencrypt wants us to add TWO txt records for user.webide.se 
	
	Solution: Make a queue and only run one dns-update query at any time
	(Not allowing many writes to the same file at once also solves the problem with file corruption)
	---------------------------------------------------------------------------------------------------
	Problem 2:
	When adding a TXT record for user.webide.se it becomes "specific" and 
	*.webide.se no longer works for user.webide.se
	
	Solution: We need to add records for user and *.user
	---------------------------------------------------------------------------------------------------
	Problem 3: 
	We can not have both TXT and CNAME records!
	
	Solution: Copy the A and AAAA records from the tld
	
	(This was not actually a problem, but we'll keep using A and AAAA records instead of CNAME just in case)
	---------------------------------------------------------------------------------------------------
	
	Check bind9 for zone file errors:
	named-checkconf -z
	
	Hint: Make sure *all* DNS slave server gets the new records in a timely manner
	
	Check each slave server if it has the TXT records:
	dig _acme-challenge.user.webide.se -t TXT @8.8.8.8
	
*/

var IP_OK = ["127.0.0.1", "5.9.139.7"]; // List of trusted IP addresses
var TLDS = ["webide.se"]; // Domains we handle
var HTTP_PORT = "8102";
var HTTP_IP = "127.0.0.1";
var SECRET = "changeme"; // Change this to prevent a malicious user to add custom TXT records to your TLD's!!

var IN_PROGRESS = false; // We can only process one request at a time
var QUEUE = [];
var PROGRESS_COUNTER = 0;

const module_http = require("http");
const module_fs = require("fs");
const module_child_process = require('child_process');

var httpServer = module_http.createServer(handleHttpRequest);
httpServer.listen(HTTP_PORT, HTTP_IP);


function handleHttpRequest(req, resp) {
	var IP = req.headers["x-real-ip"] || req.connection.remoteAddress;
	
	log("Request from " + IP + ": " + req.url);
	
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
		log("Work in progress, waiting ... queue=" + QUEUE.length + "");
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
	
	PROGRESS_COUNTER++;
	IN_PROGRESS = true;
	
	log("Processing: stage=" + stage + " name=" + name + " value=" + value);
	
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
	
	var challangeString = "_acme-challenge." + name + '. 20 IN TXT "' + value + '"\n';
	var specificString = "*." + subname + " IN CNAME " + tld + ".\n";
	
	
	var zoneFile = "/etc/bind/zones/db." + tld;
	module_fs.readFile(zoneFile, "utf8", function readZoneFile(err, zoneData) {
		if(err) {
			resp.end("Error: Problem reading zone file: " + zoneFile);
			log(err.message);
			IN_PROGRESS = false;
			return;
		}
		
		// Find A and AAAA records for tld
		var matchA = zoneData.match(/[@*]\s+IN\s+A\s+([0-9.]*)/i);
		var matchAAAA = zoneData.match(/[@*]\s+IN\s+AAAA\s+([0-9a-f:]*)/i);
		
		if(!matchA) {
			resp.end("Error: Cannot find A record for " + tld + " in zone file: " + zoneFile);
			console.error("Error: Unable match A record in " + zoneFile);
		}
		
		var aRecord = matchA[1];
		specificString += subname + " IN A " + aRecord + "\n";
		
		if(matchAAAA) {
			var aaaaRecord = matchAAAA[1];
			specificString += subname + " IN AAAA " + aaaaRecord + "\n";
		}
		
		/*
			All user's data is grouped so you can easliy remove all of them
			*.webide.se will catch foo.bar.baz.webide.se so we only need the user.webide.se records
			when doing a Letsencrypt challange
		*/
		var start = zoneData.indexOf(paddingStart);
		var end = zoneData.indexOf(paddingEnd) + paddingEnd.length;
		
		if(stage == "after") {
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
				log(err.message);
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
				
				if(stdout) log(stdout);
				
				/*
					Letsencrypt seem to use 8.8.8.8 which is a bit slow.
					Lets make the Letsencrypt script wait to give all DNS servers a chance to fetch the recrods
					
					Certbot seem to send off both stage=before but waits for *both* before requesting the TXT records,
					(problem: Letsencrypt challange only succeeds on *one* of the TXT entries)
					so we only (should) have to make Certbot wait on the *seconds* request.
				*/
				
				if(stage == "before" && PROGRESS_COUNTER % 2 == 0) {
					setTimeout(function wait() {
						resp.end("OK");
						//IN_PROGRESS = false;
					}, 30000);
				}
				else {
					resp.end("OK");
				}
				
				IN_PROGRESS = false;
			});
		});
	});
}

function log(msg) {
	console.log(myDate() + " " + msg);
	
	function myDate() {
		var d = new Date();
		
		var hour = addZero(d.getHours());
		var minute = addZero(d.getMinutes());
		var second = addZero(d.getSeconds());
		
		var day = addZero(d.getDate());
		var month = addZero(1+d.getMonth());
		var year = d.getFullYear();
		
		return year + "-" + month + "-" + day + " (" + hour + ":" + minute + ":" + second + ")";
		
		function addZero(n) {
			if(n < 10) return "0" + n;
			else return n;
		}
	}
}
