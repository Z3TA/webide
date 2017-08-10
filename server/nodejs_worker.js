/*
	Let users run nodejs scripts
	
*/

var username = process.env.username;
var uid = process.env.uid;
var gid = process.env.gid;

if(!username) throw new Error("No username defined in process.env=" + JSON.stringify(process.env));
if(!uid) throw new Error("No uid defined! process.env=" + JSON.stringify(process.env));
if(!gid) throw new Error("No gid defined in process.env=" + JSON.stringify(process.env));

uid = parseInt(uid);
gid = parseInt(gid);

var posix = require("posix");
posix.chroot('/home/' + username);
posix.setegid(gid);
posix.seteuid(uid);

// Read .nodeinit or something to get a list of "prod" scripts to start asap


