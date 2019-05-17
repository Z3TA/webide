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
	
	Update: Certbot seem to be able to handle the renewal!
	check: https://transparencyreport.google.com/https/certificates?cert_search_auth=&cert_search_cert=&cert_search=include_expired:true;include_subdomains:true;domain:johan.webide.se&lu=cert_search
	
	
	
	How to test on the cloudIDE server (replace path to jzedit):
	certbot certonly --staging --dry-run --manual --manual-public-ip-logging-ok --preferred-challenges dns --noninteractive --agree-tos --email zeta@zetafiles.org -d 'johan.webide.se,*.johan.webide.se' --manual-auth-hook="/srv/jzedit/letsencrypt/certbot-manual-auth-hook.sh" --manual-cleanup-hook="/srv/jzedit/letsencrypt/certbot-manual-cleanup-hook.sh" 
	
	Remove --staging --dry-run for running in production.
	And don't forget to delete /etc/letsencrypt/live/domain.tld/ or certbot will create domain.tld-0001/
	
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
	Problem 4: When Certbot wants to register many domains, it first sends all stage=before, 
	meaning we will have many TXT entries for the same domain!
	
	Solution: Check if there's already a value, then replace it
	---------------------------------------------------------------------------------------------------
	
	
	Check bind9 for zone file errors:
	named-checkconf -z
	
	Hint: Make sure *all* DNS slave server gets the new records in a timely manner
	
	Check each slave server if it has the TXT records:
	dig _acme-challenge.user.webide.se -t TXT @8.8.8.8
	
	
	
	
*/

"use strict";


var MODULE_FS = require("fs");
var MODULE_CHILD_PROCESS = require('child_process');
var IN_PROGRESS = false; // We can only process one request at a time
var QUEUE = [];
var PROGRESS_COUNTER = 0;
var TTL = 20; // Time-to-live for the _acme-challenge TXT record

// These variables are populated by the config file. See below ...
var IP_OK;
var TLDS;
var HTTP_PORT;
var HTTP_IP;
var SECRET;

var CONFIG_FILE = "./letsEncryptDns.conf.json";
MODULE_FS.readFile(CONFIG_FILE, function readDomains(err, data) {
	if(err) throw new Error("Unable to load configuration file: CONFIG_FILE=" + CONFIG_FILE + " Error: " + err.message);
	
	try {
		var config = JSON.parse(data);
	}
	catch(err) {
		throw new Error("Unable to parse configuration file: data=" + data + " Error: " + err.message);
	}
	
	// Not having var infront makes variables global
	IP_OK = config.trusted_ip || ["127.0.0.1", "5.9.139.7"]; // List of trusted IP addresses
	TLDS = config.tld || ["webide.se"]; // Domains we handle
	HTTP_PORT = config.http_port || "8102";
	HTTP_IP = config.http_ip || "127.0.0.1";
	SECRET = config.secret || "changeme"; // Change this to prevent a malicious user to add custom TXT records to your TLD's!!
	
	console.log("Trusted IP addresses: " + JSON.stringify(IP_OK));
	console.log("Top level domains to handle: " + JSON.stringify(TLDS));
	console.log("Secret code: " + SECRET);
	console.log("HTTP server listening on: " + HTTP_IP + ":" + HTTP_PORT);
	
	var module_http = require("http");
	var httpServer = module_http.createServer(handleHttpRequest);
	httpServer.listen(HTTP_PORT, HTTP_IP);
	
});


function handleHttpRequest(req, resp) {
	var IP = req.headers["x-real-ip"] || req.connection.remoteAddress;
	
	log("Request from " + IP + ": " + req.url);
	
	if(IP_OK.indexOf(IP) == -1) return resp.end("IP not authorized: " + IP + "\n");
	
	var match = req.url.match(/.*\?stage=(before|after)&name=([A-Za-z0-9_.-]*)&value=([A-Za-z0-9_.-]*)&secret=([A-Za-z0-9_.-]*)/);
	
	if(match == null) return resp.end("Malformed request url: " + req.url + "\n");
	
	var stage = match[1];
	var name = match[2];
	var value = match[3];
	var secret = match[4];
	
	if(secret != SECRET) return resp.end("Bad secret: " + secret + "\n");
	
	var work = {stage: stage, name: name, value: value, resp: resp, time: new Date()};
	
	QUEUE.push(work);
	
	workQueue();
}

function workQueue() {
	if(IN_PROGRESS) {
		log("Work in progress, waiting ... queue=" + QUEUE.length + "");
		setTimeout(workQueue, 1000);
		return;
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
	
	if(!work) {
		log("No more work to do! QUEUE.length=" + QUEUE.length);
		return;
	}
	
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
	
	var paddingStart = "; Start Letsencrypt challange for " + (subname || tld) + "\n";
	var paddingEnd = "; End Letsencrypt challange for " + (subname || tld) + "\n\n";
	
	var txtEntry = "_acme-challenge." + name + '. ' + TTL + ' IN TXT ';
	var challangeString = txtEntry + '"' + value + '"\n';
	
	var zoneFile = "/etc/bind/zones/db." + tld;
	MODULE_FS.readFile(zoneFile, "utf8", function readZoneFile(err, zoneData) {
		if(err) {
			resp.end("Error: Problem reading zone file: " + zoneFile);
			log(err.message);
			IN_PROGRESS = false;
			return;
		}
		
		
		var specificString = "*." + subname + " IN CNAME " + tld + ".\n";
		
		/*
			note: Zone file can not contain CNAME and A records pointing to the same host!
			for example, if there's already www IN CNAME, we can not have a www IN A !
		*/
		
		if(!zoneData.match( new RegExp(subname + " +IN +CNAME") )) {
			
			// Find A and AAAA records for tld
			var matchA = zoneData.match(/[@*]\s+IN\s+\d*?\s+A\s+([0-9.]*)/i);
			var matchAAAA = zoneData.match(/[@*]\s+IN\s+\d*?\s+AAAA\s+([0-9a-f:]*)/i);
			
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
			
			if(zoneData.indexOf(challangeString) == -1) {
console.warn("zoneData doesn't contain challangeString=" + challangeString + "\n\nzoneData=" + zoneData);
			}
			else {
				zoneData = zoneData.slice(0, zoneData.indexOf(challangeString)) + zoneData.slice(zoneData.indexOf(challangeString) + challangeString.length);
			log("Removed challangeString=" + challangeString);
			end -= challangeString.length;
			}
			
			if(zoneData.indexOf(txtEntry) == -1) {
				// It no longer contains any challange strings.
				// We can also remove the padding
				
				log( "Removing padding:\n" + zoneData.slice(start, end) );
				
				zoneData = zoneData.slice(0, start) + zoneData.slice(end);
			}
		}
		
		if(stage == "before") {
			if(start == -1) {
				// No challange records exist
				zoneData += paddingStart;
				zoneData += challangeString;
				if(subname) zoneData += specificString;
				zoneData += paddingEnd;
			}
			else {
				// A Letsencrypt TXT challange record already exist.
				
				var txtEntryIndex = zoneData.indexOf(txtEntry);
				if(txtEntryIndex != -1) {
					var endOfExistingTxtEntry = zoneData.indexOf("\n", txtEntryIndex);
					if(endOfExistingTxtEntry == -1) throw new Error("Unable to find new line after " + txtEntry + " in " + zoneFile);
					log("Removing existing TXT entry for " + name + " !");
					zoneData = zoneData.slice(0, txtEntryIndex) + zoneData.slice(endOfExistingTxtEntry+1);
				}
				else log("No TXT record exist for " + name + "");
				
				
				// Add another inside the padding
				log("Adding challange string (TXT record) for " + name + "");
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
			but not us, we'll just increment with one :P
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
		
		MODULE_FS.writeFile(zoneFile, zoneData, function writeZoneFile(err) {
			if(err) {
				resp.end("Problem writing to zone file: " + zoneFile);
				log(err.message);
				IN_PROGRESS = false;
				return;
			}
			
			// Do we have to wait a bit before reloading bind9 !?!?
			setTimeout(function waitForFs() {
				
			// Reload bind9/named
			MODULE_CHILD_PROCESS.exec("service bind9 reload", function reloadNS(error, stdout, stderr) {
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
					so we only (should) have to make Certbot wait on the *second* request.
						
						problem: Google name server 8.8.8.8 can be lazy and use old cached value,
						querying the record however seem to trigger a cache update (but you need to make another request to get the fresh data)
						solution: Query the 8.8.8.8 so the cache is updated
					*/
				
					var dns = require('dns');
					var resolver = new dns.Resolver();
					var nameServer = '8.8.8.8'
					resolver.setServers([nameServer]);
					
					if(stage == "before" && QUEUE.length == 0) {
						setTimeout(function refreshGdnsCache() { //  wait for slave servers
							log("Refreshing G DNS cache ...");
							resolver.resolveTxt("_acme-challenge." + name, function(err, results) {
								
								var correctValue = false;
								
								if(err) {
									if(err.code == "ENOTFOUND") {
										log(nameServer + " can not find TXT record for _acme-challenge." + name + "");
									}
									else {
										log("Something went wrong when making dns query to " + nameServer + ": " + err.message);
									}
								}
								

								if(!err) {
									//log("dns results=" + JSON.stringify(results));
									var strings = results[0];
									if( strings[0] == value ) {
										correctValue = true;
										log(nameServer + " has the correct value!");
									}
									else {
										correctValue = false;
										log(nameServer + " has the wrong record " + strings[0] + "\nExpected " + value);
									}
								}
								
								if(correctValue) {
									sendResp(true);
								}
								else {
									// Try again
									setTimeout(function tryRefreshGdnsAgain() {
										log("Making another attempt to frefresh G DNS cache ...");
										resolver.resolveTxt("_acme-challenge." + name, function(err, results) {
											var correctValue = false;
											
											if(err) {
												if(err.code == "ENOTFOUND") {
													log(nameServer + " can still not find TXT record for _acme-challenge." + name + "");
												}
												else {
													log("Something went wrong when making the second dns query to " + nameServer + ": " + err.message);
												}
											}
											
											if(!err) {
												//log("dns results=" + JSON.stringify(results));
												var strings = results[0];
												if( strings[0] == value ) {
													correctValue = true;
													log(nameServer + " now has the correct value!");
												}
												else {
													correctValue = false;
													log(nameServer + " still has the wrong record " + strings[0] + "\nExpected " + value);
												}
											}
											
											if(correctValue) {
												sendResp(true);
											}
											else {
												
												setTimeout(sendResp, 5000);
												
												// Test local DNS server for debugging purposes
												nameServer = '127.0.0.1'
												resolver.setServers([nameServer]);
												
												resolver.resolveTxt("_acme-challenge." + name, function(err, results) {
													var correctValue = false;
													
													if(err) {
														if(err.code == "ENOTFOUND") {
															log(nameServer + " can not find TXT record for _acme-challenge." + name + "");
														}
														else {
															log("Something went wrong making dns query to " + nameServer + ": " + err.message);
														}
													}
													
													if(!err) {
														//log("dns results=" + JSON.stringify(results));
														var strings = results[0];
														if( strings[0] == value ) {
															correctValue = true;
															log(nameServer + " has the correct value!");
														}
														else {
															correctValue = false;
															log(nameServer + " has the wrong record " + strings[0] + "\nExpected " + value);
														}
													}
													
													if(!correctValue) throw new Error("Neither the local server has the correct value!");
													
												});
												
											}
										});
									}, 5000);
								}
							});
						}, 1000);
					}
					else {
						sendResp();
					}
					
					function sendResp(noWait) {
						// Only wait on the last request
						if(stage == "before" && QUEUE.length == 0 && !noWait) {
							setTimeout(function wait() {
								resp.end("OK");
								//IN_PROGRESS = false;
							}, 5000);
						}
						else {
							resp.end("OK");
						}
						
						IN_PROGRESS = false;
					}
					
				});
				
			}, 10); // Waiting for fs before reloading bind9
			
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
