"use strict";

/*
	
	module_child_process.exec("", EXEC_OPTIONS, function(err, stdout, stderr) {
	if(err) throw err;
	if(stderr) log(stderr, NOTICE);
	if(stdout) log(stdout, INFO);
	kvmAccessGranted = true;
	});
	
*/

var UTIL = require("../../client/UTIL.js");
var module_child_process = require('child_process');
var logModule = require("../../shared/log.js");
var log = logModule.log;
// Log levels
var ERROR = 3;
var WARN = 4;
var NOTICE = 5;
var INFO = 6;
var DEBUG = 7;

var ANDROID = {
	startEmulator: function(user, json, callback) {
		startAvd(user.name);
		
	},
	stopEmulator: function() {
		
	}
}

function startAvd(username, avd) {
	
if(avd == undefined) avd = "Pixel_2_API_29";

/*
		
/home/ltest1/Android/Sdk/emulator
		./emulator -avd Pixel_2_API_29

	*/

	// ### Android Emulator
	
	var emulatorArgs = [
		"-avd " + avd, 
	];
	
	var bin = "/home/" + username + "/Android/Sdk/emulator/emulator";
	
	log(username + " starting bin=" + bin + " with args=" + JSON.stringify(emulatorArgs), DEBUG);
	var emulator = module_child_process.spawn(bin, emulatorArgs);
	
	emulator.on("close", function (code, signal) {
		log(username + " emulator (avd=" + avd + ") close: code=" + code + " signal=" + signal, NOTICE);
	});
	
	emulator.on("disconnect", function () {
		log(username + " emulator (avd=" + avd + ") disconnect: emulator.connected=" + emulator.connected, DEBUG);
	});
	
	emulator.on("error", function (err) {
		log(username + " emulator (avd=" + avd + ") error: err.message=" + err.message, ERROR);
		console.error(err);
		//throw err;
	});
	
	emulator.stdout.on("data", function (data) {
		log(username + " emulator (avd=" + avd + ") stdout: " + data, INFO);
	});
	
	emulator.stderr.on("data", function (data) {
		log(username + " emulator (avd=" + avd + ") stderr: " + data, DEBUG);
	});
	
	
}

module.exports = ANDROID;
