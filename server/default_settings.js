
/*
	Default server settings
	
	
*/
module.exports = {
	domain: "webide.se",
	admin_email: "zeta@zetafiles.org",
	home_dir: "/home/",
	editor_http_port: 8099,
	signup_http_port: 8100,
	nodejs_deamon_manager_port: 8200,
	smtp_port: 25,
	smtp_host: "epost.zetafiles.org",
	http_ip: "127.0.0.1", // use 0.0.0.0 to bind to all IP's'
	stdin_channel_port: 13379
}

/*
	
	PS.
	If the file is named .json nodejs will try to parse it
	And JSON doesn't support comments and object notations like in JavaScript.
	
*/