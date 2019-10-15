/*
	Running certbot (letsencrypt) to install SSL certificate
*/

"use strict";

var module_path = require("path");

var letsencrypt = {};

letsencrypt.register = function register(domain, adminEmail, wildcard, callback) {
	
	if(domain == undefined) throw new Error("domain=" + domain + " required!");
	if(domain == undefined) throw new Error("adminEmail=" + adminEmail + " required!");
	
	if(typeof wildcard == "function") {
		callback = wildcard;
		wildcard = undefined;
	}
	
	var spawn = require('child_process').spawn;
	
	/*
		without wildcard certificate:
		certbot certonly --nginx --noninteractive --agree-tos --email zeta@zetafiles.org -d johan.webide.se
		
		with wildcard certificate: 
		certbot certonly --manual --manual-public-ip-logging-ok --preferred-challenges dns --noninteractive --agree-tos --email zeta@zetafiles.org -d 'johan.webide.se,*.johan.webide.se' --manual-auth-hook="/srv/webide/letsencrypt/certbot-manual-auth-hook.sh" --manual-cleanup-hook="/srv/webide/letsencrypt/certbot-manual-cleanup-hook.sh" 
		
		certonly = Don't mess with nginx config files
		
		Check logs:
		/var/log/letsencrypt/letsencrypt.log
		
	*/
	
	if(wildcard) {
		// Use __dirname as this module can be required from many places
		var path = module_path.resolve(__dirname + "./../letsencrypt/");
		var args = [
			"certonly", 
			"--manual", 
			"--manual-public-ip-logging-ok", 
			"--preferred-challenges",
			"dns", 
			"--noninteractive", 
			"--agree-tos", 
			"--email",
			adminEmail,
			"-d",
			domain + ',*.' + domain, 
			'--manual-auth-hook=' + path + '/certbot-manual-auth-hook.sh', 
			'--manual-cleanup-hook=' + path + '/certbot-manual-cleanup-hook.sh',
			"--expand"
		];
	}
	else {
	var args = ["certonly", "--nginx", "--noninteractive", "--agree-tos", "--email", adminEmail, "-d", domain];
	}
	
	var certbot = spawn("certbot", args, {shell: false});
	var stdout = "";
	var stderr = "";
	
	certbot.stdout.on('data', function certbotStdout(data) {
		stdout += data;
	});
	
	certbot.stderr.on('data', function certbotStderr(data) {
		stderr += data;
	});
	
	certbot.on('error', function certbotError(err) {
		console.log("certbot error: stdout=" + stdout);
		console.log("certbot error: stderr=" + stderr);
		if(callback) callback(err);
		callback = null;
	});
	
	certbot.on('close', function certbotDone(exitCode) {
		if(stdout.length < 1000) console.log("certbot close: stdout=" + stdout);
		else console.log("certbot close: stdout=" + stdout.slice(0,1000) + " ... (" + stdout.length + " characters)");
		console.log("certbot close: stderr=" + stderr);
		console.log("certbot close: exitCode=" + exitCode);
		
		/*
			
			-------------------------------------------------------------------------------
			Certificate not yet due for renewal; no action taken.
			-------------------------------------------------------------------------------
			
			certbot stderr=Saving debug log to /var/log/letsencrypt/letsencrypt.log
			Plugins selected: Authenticator nginx, Installer nginx
			Starting new HTTPS connection (1): acme-v01.api.letsencrypt.org
			Cert not yet due for renewal
			Keeping the existing certificate
			
			certbot exitCode=0
			Saving debug log to /var/log/letsencrypt/letsencrypt.log
			Plugins selected: Authenticator nginx, Installer nginx
			Starting new HTTPS connection (1): acme-v01.api.letsencrypt.org
			Cert not yet due for renewal
			Keeping the existing certificate
			
			
		*/
		
		if(exitCode) {
			var err = new Error("certbot failed! stderr=" + stderr);
			err.code = exitCode;
			
			if(stderr.match(/too many failed authorizations recently/)) {
				err.code = "RATE_LIMIT";
			}
			
			if(callback) callback(err);
			else console.log("certbot close: final error: " + err.message ? err.message : "Certbot gave no error message. See certbot logs!");
			// somehow console.warn ends up in the stderr stream !?
			
			callback = null;
			return;
		}
		
		if(callback) callback(null);
		
	});
}

letsencrypt.remove = function remove(domain, adminEmail, wildcard, callback) {

	throw new Error("Not yet implemented");
	
	/*
		
		certbot delete --cert-name domain.com
		
		Can only delete one domain at a time
		
	*/
	
	
	
}

module.exports = letsencrypt;
