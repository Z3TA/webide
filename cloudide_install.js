#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	
	Only run this script if you want to install the editor as a cloud editor!
	
	Before running this you need to uninstall nodejs and then re-install it:
	curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
	sudo apt-get install -y nodejs
	
*/

if(process.platform == "win32") throw new Error("This install script only runs under Linux (Ubuntu)");
// You might be able to figure out the steps needed by reading this file ...
// While it's possible to run the server in Windows, we highly recommend running in a unix-like system like Linux (Ubuntu)'

if(process.version.indexOf("v8.") != 0) throw new Error("The editor currently only supports nodejs version 8.");
// It will most likely also work with newer versions. But they have yet not been tested.

var os = require("os");
var info = os.userInfo ? os.userInfo() : {username: "ROOT", uid: process.geteuid()};

if(info.uid !== 0) {
	throw new Error("You need to run this script as root! Try: sudo " + process.argv.join(" "));
}

var getArg = require("./shared/getArg.js");
var fs = require("fs");
var exec = require("child_process").execSync;
//exec("apt update");

// Make sure we are inside the jzedit root folder ...
// The following with crash the script if the files doesn't exist
exec("chmod +x removeuser.js");
exec("chmod +x adduser.js");



var HOSTNAME = getArg(["host", "host", "hostname", "domain"]); // Same as "server_name" in nginx profile or "VirtualHost" on other web servers
var ADMIN_EMAIL = getArg(["email", "email", "mail", "admin_email", "admin_mail"]); // E-mail address for letsencrypt

if(!HOSTNAME) throw new Error("Please specify the host/domain name that will be used to access the Cloud IDE. Argument: --domain=yourdomain.com")
if(!ADMIN_EMAIL) throw new Error("Please specify the e-mail address for the administartor Argument: --mail=admin@yourdomain.com")

var ENCODING = "utf-8";


// Edit default's
var defaults = fs.readFileSync("./server/default_settings.js", ENCODING);
defaults = defaults.replace("zeta@zetafiles.org", ADMIN_EMAIL);
defaults = defaults.replace("webide.se", HOSTNAME);
fs.writeFileSync("./server/default_settings.js", defaults);

// Set hostname
fs.writeFileSync("/etc/hostname", HOSTNAME + "\n");


// Install apparmor for extra security, each user will have their own apparmor profile that only allow them to access their home dir
exec("apt install apparmor -y");


// for sending error reports
// edit the service you want emails for and add OnFailure=status-email-user@%n.service to the [Unit] section. 
// %n passes the unit's name to the template.
console.log("Installing status-email-user@.service");
exec("apt install sendmail -y");
exec("cp etc/systemd/systemd-email.sh /usr/local/bin/");
exec("chmod 774 /usr/local/bin/systemd-email.sh")
var reportService = fs.readFileSync("./etc/systemd/status-email-user@.service", ENCODING);
reportService = reportService.replace("zeta@zetafiles.org", ADMIN_EMAIL);
fs.writeFileSync("/etc/systemd/system/status-email-user@.service", reportService);
exec("systemctl enable status-email-user@.service");



	// Install the cloud-IDE service that runs server/server.js
console.log("Installing jzedit.service");
	var jzedit_service = fs.readFileSync("etc/systemd/jzedit.service", ENCODING);
jzedit_service = jzedit_service.replace("webide.se", HOSTNAME);
jzedit_service = jzedit_service.replace("zeta@zetafiles.org", ADMIN_EMAIL);
fs.writeFileSync("/etc/systemd/system/jzedit.service", jzedit_service);
	exec("systemctl enable jzedit");
	


// Signup service to let users signup
	// If you enable automatic signup you probably also want to edit client/signup/signup.htm
console.log("Installing jzedit_signup.service");
console.log("Automatic signup available at: http://" + HOSTNAME + "/signup/signup.htm");
var signup_service = fs.readFileSync("etc/systemd/jzedit_signup.service", ENCODING);
signup_service = signup_service.replace(/webide\.se/g, HOSTNAME);
fs.writeFileSync("/etc/systemd/system/jzedit_signup.service", signup_service);
exec("systemctl enable jzedit_signup");
	

// Install Service that let users run nodejs micro-services
console.log("Installing jzedit_nodejs_init.service");
exec("cp etc/systemd/jzedit_nodejs_init.service /etc/systemd/system/jzedit_nodejs_init.service");
exec("systemctl enable jzedit_nodejs_init");


	// Install Nginx (needed to let users have their own home page under user.yourdomain.com)
console.log("Installing Nginx");
	exec("apt install nginx -y");
	
console.log("Installing " + HOSTNAME + ".nginx config");
var jzedit_nginx = fs.readFileSync("etc/nginx/webide.se.nginx", ENCODING);
jzedit_nginx = jzedit_nginx.replace(/webide\.se/g, HOSTNAME);
fs.writeFileSync("/etc/nginx/sites-available/" + HOSTNAME + ".nginx", jzedit_nginx);
execTry("ln -s /etc/nginx/sites-available/" + HOSTNAME + ".nginx  /etc/nginx/sites-enabled/" + HOSTNAME + "")

console.log("Installing signup." + HOSTNAME + ".nginx config");
var signup_nginx = fs.readFileSync("etc/nginx/signup.webide.se.nginx", ENCODING);
signup_nginx = signup_nginx.replace(/webide\.se/g, HOSTNAME);
fs.writeFileSync("/etc/nginx/sites-available/signup." + HOSTNAME + ".nginx", signup_nginx);
execTry("ln -s /etc/nginx/sites-available/signup." + HOSTNAME + ".nginx  /etc/nginx/sites-enabled/signup." + HOSTNAME + "")

console.log("Adding default Nginx config");
exec("cp etc/nginx/default.nginx /etc/nginx/sites-available/default");


//exec("systemctl reload nginx");


console.log("Installing logrotate script for nginx log files");
execTry("ln -s $(pwd)/etc/nginx/nginx.logrotate.conf /etc/logrotate.d/nginx.logrotate.conf");


console.log("Installing VNC dependencies");
exec("apt install xvfb x11vnc chromium-browser -y");


console.log("Installing Mercurial");
exec("apt install mercurial -y");


console.log("Installing hggit for Mercruial");
exec("apt install python-pip -y");
//exec("apt -f install -y"); // Fix problems with Python
//exec("apt install python-pip -y");
exec("pip install hg-git");


console.log("Installing NPM");
exec("apt install npm -y");


console.log("Installing Letsencrypt's certbot");
exec("apt-get install software-properties-common -y");
exec("add-apt-repository ppa:certbot/certbot -y");
exec("apt-get update");
exec("apt-get install python-certbot-nginx -y");


console.log("Installing archive extractor utilities");
exec("apt-add-repository multiverse && apt-get update");
exec("apt-get install unzip unrar -y");

console.log("Installing CGSF dependencies");
exec("apt-get install fuse -y");



console.log("Finish!");

console.log("You might need to edit the following files:");
console.log("/etc/nginx/sites-available/" + HOSTNAME + ".nginx");
console.log("/etc/nginx/sites-available/signup." + HOSTNAME + ".nginx");
console.log(__dirname + "default.js");
console.log("");
console.log("then run systemctl reload nginx");
console.log("(use nginx -T to check for errors)");


function execTry(cmd) {
	try {
		exec(cmd);
	}
	catch(err) {
		console.log(err.message);
	}
}


//var update = exec("apt update").toString(ENCODING);


//var update = exec(cmd).toString(ENCODING);
//if(stdout.trim()) throw new Error(stdout);

