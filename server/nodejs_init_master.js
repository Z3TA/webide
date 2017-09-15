/*
	
	This service will be started by systemd and running as root.
	It will spawn a nodejs_init_slave.js for each webide user.
	
	The nodejs_init_slave.js processes will chroot and setuid setgid to the users.
	It will then read a list of services to start. And make sure they are running ...
	Logging all stdout and stderr. Sending e-mail warnings on stderr and non responing processes.
	
	nodejs.conf.json config file (in user root):
	devLocation: path to dev files
	prodLocation: path to the files in "production" (don't show prod files when using Ctrl+P to open files, unless it's the same as devLocation)
	(when the user hits the deploy button, tests will run and if they pass, 
	everything in devLocation, besides data-folders, will be copied to prodLocation)
	adminEmail: E-mail address to send a message to if the process crash. User need to opt-in to recive e-mails ...
	devEnv: {development: true} Varaibles that will be available in process.env in development mode, put database login details etc in here.
	prodEnv: {production: true} Varaibles that will be available in process.env in production mode, put database login details etc in here.
	
	
	
*/
