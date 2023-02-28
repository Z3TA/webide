
/*
	Default server settings
	
	
*/
module.exports = {
	domain: "webide.se",
	admin_email: "zeta@zetafiles.org",
	home_dir: "/home/",
	editor_http_port: 8099,
	signup_http_port: 8100,
	nodejs_deamon_manager_port: "/run/node_init_manager.sock",
	smtp_port: 25,
	smtp_host: "selma.100m.se", // (can only send to ourself)
	http_ip: "127.0.0.1", // use 0.0.0.0 to bind to all IP's'
	stdin_channel_port: 13379,
	remote_file_port: 8103,

	// Enable to host a webide server behind nat
	nat_port: 8106,
	nat_host: "webide.se" // Nat server/proxy

}

/*
	
	PS.
	If the file is named .json nodejs will try to parse it
	And JSON doesn't support comments and object notations like in JavaScript.
	
*/