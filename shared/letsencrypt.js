/*
	Running certbot (letsencrypt) to install SSL certificate
*/

var letsencrypt = {};

letsencrypt.register = function register(domain, adminEmail, callback) {
	
	if(domain == undefined) throw new Error("domain=" + domain + " required!");
	if(domain == undefined) throw new Error("adminEmail=" + adminEmail + " required!");
	
	var spawn = require('child_process').spawn;
	
	/*
		certbot certonly --nginx --noninteractive --agree-tos --email zeta@zetafiles.org -d johan.webide.se
		
		certonly = Don't mess with nginx config files
		
	*/
	
	var args = ["certonly", "--nginx", "--noninteractive", "--agree-tos", "--email", adminEmail, "-d", domain];
	
	//console.log("hg cat args=" + JSON.stringify(args) + " json=" + JSON.stringify(json));
	
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
		console.log("ERROR: stdout=" + stdout);
		console.log("ERROR: stderr=" + stderr);
		if(callback) callback(err);
		callback = null;
	});
	
	certbot.on('close', function certbotDone(exitCode) {
		if(stdout.length < 500) console.log("certbot stdout=" + stdout);
		else console.log("certbot stdout=" + stdout.slice(0,500) + " ... (" + stdout.length + " characters)");
		//console.log("certbot stdout=" + stdout);
		console.log("certbot stderr=" + stderr);
		console.log("certbot exitCode=" + exitCode);
		
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
			var err = new Error(stderr);
			err.code = exitCode;
			
			if(stderr.match(/too many failed authorizations recently/)) {
				err.code = "RATE_LIMIT";
			}
			
			if(callback) callback(err);
			else console.warn("CERTBOT ERROR: " + err.message ? err.message : "Certbot gave no error message. See certbot logs!");
			
			callback = null;
			return;
		}
		
		if(callback) callback(null);
		
	});
}

module.exports = letsencrypt;
