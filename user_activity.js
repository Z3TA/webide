#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*
	
	Find out which users are inactive:
	sudo ./user_activity.js
	
*/

var getArg = require("./shared/getArg.js");
var eachUser = require("./shared/eachUser.js");

var defaultHome = "/home/";
var HOME = getArg(["home", "home"]) || defaultHome;

var fs = require("fs");

var now = Math.floor(Date.now() / 1000);
var inactive = 10*24*60*60; // Ten days in seconds
var times = [];
var filesToRead = 0;

console.log("Days since last activity:");

eachUser(HOME, function(user) {
	//console.log(user);
	filesToRead++;
	fs.readFile(user.homeDir + ".webideStorage/lastLogin", "utf8", function(err, data) {
		
if(err) {
			if(err.code != "ENOENT") throw err;
			var lastLogin = 0;
		}
		else {
			var lastLogin = parseInt(data);
			//console.log("data=" + data);
		}
		
		var diff = now - lastLogin;
		
		times.push({name: user.name, hours: Math.round(diff / 60 / 60)});
		
		if(--filesToRead == 0) done(); 
		
	});
}, function() {

	if(filesToRead == 0) done(); 
	
});

function done() {
	//console.log("times.length=" + times.length);
	
	times.sort(function(a, b) {
		return a.hours - b.hours;
	});
	
	times.forEach(function(user) {
		console.log(user.name, Math.round(user.hours/24 *10)/10 + " days");
	});
}

