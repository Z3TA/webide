"use strict";

/*
	
	module_child_process.exec("", EXEC_OPTIONS, function(err, stdout, stderr) {
	if(err) throw err;
	if(stderr) log(stderr, NOTICE);
	if(stdout) log(stdout, INFO);
	kvmAccessGranted = true;
	});
	
	
	rm /home/ltest1/.android/avd/Pixel_2_API_29.avd/*.lock
	

	setup wizard screen is blank when running android studio in vnc
possible fix: Edit android-studio/bin/idea.properties and add
disable.android.first.run=true
	
	
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

var _emulator;

var ANDROID = {
	startEmulator: function(user, json, callback) {
		
		if(user.name == undefined) throw new Error("Unable to start Andrid emulator because user.name=" + user.name + "");
		
		startAvd(user.name, json.avd, function(err) {
			if(err) callback(err);
			else callback(null);
			
			log("================================ Android Emulator Started!? ===============================");
		});
		
	},
	stopEmulator: function(user, json, callback) {
		if(_emulator) {
log("Killing Android emulator...", DEBUG);
			_emulator.stdin.pause();
_emulator.kill();
			callback(null, true);
		}
		else callback(null, false);
	}
}

function startAvd(username, avd, realCallback, recursion) {
	
	// todo: Check if avd is already running!

	var callback = function callback(err) {

		if(err) {
			console.error(err);
		}

		realCallback(err);
		realCallback = null;
	};

	if(typeof avd == "function") {
		callback = avd;
		avd = undefined;
	}
	
	var bin = "/home/" + username + "/Android/Sdk/emulator/emulator";
	
	if(avd == undefined) {

		if(recursion) throw new Error("username=" + recursion + " avd=" + avd + " recursion=" + recursion);
		
		module_child_process.exec(bin + " -list-avds", function(err, stdout, stderr) {
			if(err) {
				log("Calling startAvd callback after list-avds because err=" + (err && err.message));
				callback(err);
				callback = null;
				return;
			}
			if(stderr) {
				log("Calling startAvd callback after list-avds because stderr=" + stderr);
				callback(new Error(stderr));
				callback = null;
				return;
			}
			if(!stdout) {
				log("Calling startAvd callback after list-avds because stdout=" + stdout + " (got notthing in stdout)");
				callback(new Error("No installed AVD's!?"));
				callback = null;
				return;
			}

			var list = stdout.split("\n");
			var avd = list[0];
			
			log("No avd specified, so using " + avd + " ...", DEBUG);
			return startAvd(username, avd, callback, 1);
			
		});
		
		return;
		
	}
	
	var lastStderr = "";
	var lastStdout = "";
	
	/*
		
		/home/ltest1/Android/Sdk/emulator
		./emulator -avd Pixel_2_API_29
		
	*/
	
	// ### Android Emulator
	
	var emulatorArgs = [
		"-avd",
		avd, 
	];
	
	
	
	log(username + " starting bin=" + bin + " with args=" + JSON.stringify(emulatorArgs), DEBUG);
	var emulator = module_child_process.spawn(bin, emulatorArgs);
	
	_emulator = emulator;
	
	emulator.on("close", function emulatorClosed(code, signal) {
		log(username + " emulator (avd=" + avd + ") close: code=" + code + " signal=" + signal, NOTICE);
		
		if(callback) {
			if(lastStderr) {
				var err = new Error(lastStderr);
			}
			else if(code != 0) {
				var err = new Error("Emulator closed with exit code=" + code + " bin=" + bin + " args=" + JSON.stringify(emulatorArgs));
			}

			log("Calling startAvd callback after emulator.on close! code=" + code + " signal=" + signal + " lastStderr=" + lastStderr + " ");
			callback(err);
			callback = null;
		}
		
	});
	
	emulator.on("disconnect", function () {
		log(username + " emulator (avd=" + avd + ") disconnect: emulator.connected=" + emulator.connected, DEBUG);
	});
	
	emulator.on("error", function (err) {
		log(username + " emulator (avd=" + avd + ") error: err.message=" + err.message, ERROR);
		console.error(err);
		if(callback) {
			log("Calling startAvd callback after emulator.on error! err.message=" + err.message);
			callback(err);
			callback = null;
		}
		//throw err;
	});
	
	emulator.stdout.on("data", function (data) {
		lastStdout = data.toString();
		log(username + " emulator (avd=" + avd + ") stdout: " + data, INFO);
		
		var reLock = /A snapshot operation for '(.*)' is pending and timeout has expired/;
		var matchLock = lastStdout.match(reLock);
		
		if(matchLock) {
			var lockedAvd = matchLock[1];
			if(lockedAvd != avd) throw new Error("lockedAvd=" + lockedAvd + " avd=" + avd);
			module_child_process.exec("rm /home/" + username + "/.android/avd/" + avd + ".avd/*.lock", function(err, stdout, stderr) {
				if(err) throw err;
				if(stderr) log(stderr, WARN);
				if(stdout) log(stdout, INFO);
			});
		}
		
	});
	
	emulator.stderr.on("data", function (data) {
		lastStderr = data.toString();
		log(username + " emulator (avd=" + avd + ") stderr: " + data, DEBUG);
		
	});
	
	log(username + " emulator (avd=" + avd + ") callback=" + (typeof callback) + " emulator.connected=" + emulator.connected);
	
	setTimeout(function() {
		// It seems emulator.connected is always false... so use stdout/stderr to guess if it started or not
		if(lastStderr && !emulator.connected && callback) {
			log("Calling startAvd callback after timeout because emulator.connected=" + emulator.connected + " lastStdout=" + lastStdout + " lastStderr=" + lastStderr);
			callback(new Error(lastStderr));
			callback = null;
		}
		else if((emulator.connected || lastStdout) && callback) {
			log("Calling startAvd callback after timeout because emulator.connected=" + emulator.connected + " lastStdout=" + lastStdout);
			callback(null);
			callback = null;
		}
		else {
			log("NOT callacing startAvd callback after timeout because emulator.connected=" + emulator.connected + " lastStdout=" + lastStdout + " lastStderr=" + lastStderr);
		}
		
		log(username + " emulator (avd=" + avd + ") callback=" + (typeof callback) + " After timeout: lastStdout=" + lastStdout + " lastStderr=" + lastStderr + " emulator.connected=" + emulator.connected);
		
	}, 3000); // The emulator can take some time to load...
	
}

module.exports = ANDROID;
