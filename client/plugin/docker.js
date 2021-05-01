/*
	hmm: might not have to use user namespace on Docker VM,
	instead make Docker run with the uid we want
	(need to give root permissions to that uid)
	
*/
(function() {
	"use strict";
	
	var discoveryBarIcon;
	var widget;
	var deamonAwake = false;
	var deamonCreated = false;
	var windowMenu;
	
if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("docker") != -1) {
console.warn("Docker disabled via query string!");
return;
}

	EDITOR.plugin({
		desc: "Docker",
		load: function loadDocker() {
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/docker.svg", 100,  "Docker daemon", "DOCKR", toggleDocker);
			// Docker Icon by Icon Mafia https://iconscout.com 
			
			windowMenu = EDITOR.windowMenu.add(S("docker daemon"), [S("tools"), 80], toggleDocker);
			
			//widget = EDITOR.createWidget(buildVpnWidget);
			
			CLIENT.on("loginSuccess", checkDockerStatus);
			
		},
		unload: function stopDocker() {
			
			//widget.unload();
			
			EDITOR.discoveryBar.remove(discoveryBarIcon);
			
			CLIENT.removeEvent("loginSuccess", checkDockerStatus);
			
		}
	});
	
	function toggleDocker() {
		//console.log("deamonAwake=" + deamonAwake);
		if(deamonAwake) sleep();
		else wakeup();
		
windowMenu.hide();

		return PREVENT_DEFAULT;
	}
	
	function checkDockerStatus(login) {
		if(!login.tld) {
			//console.warn("Disabling Docker plugin");
			EDITOR.disablePlugin("Docker", true);
return;
		}
		
		CLIENT.cmd("dockerDaemon", {command: "status"}, 120000, function dockerStatus(err, status) {
			if(err) {
				if(err.code == "ENOSUPPORT") {
					//console.warn("Disabling Docker plugin");
					EDITOR.disablePlugin("Docker", true);
					return;
				}
				else alertBox("Unable to get Docker daemon status! Error: code=" + err.code + " message=" + err.message);
			}
			else {

				if(status.hasOwnProperty("created")) deamonCreated = status.created;

				if(status.started) {
					deamonAwake = true;
					
					if(!status.IP) throw new Error("Did not get IP from dockerDaemon status=" + JSON.stringify(status));
					EDITOR.env.DOCKER_HOST = "tcp://" + status.IP + ":2376";
					
					if(discoveryBarIcon && !discoveryBarIcon.disabled) discoveryBarIcon.activate();
					if(windowMenu) windowMenu.activate();
					updateStatus("running", status.IP);
				}
				else if(status.stopped) {
					deamonAwake = false;
					if(discoveryBarIcon && !discoveryBarIcon.disabled) discoveryBarIcon.deactivate();
					if(windowMenu) windowMenu.deactivate();
					updateStatus("shut off")
				}
				else {
					throw new Error("Unexpected answer from server: status=" + status);
				}
			}
		});
	}
	
	function updateStatus(status, IP) {
		if(discoveryBarIcon) discoveryBarIcon.title = "Docker deamon " + status + (IP ? " on " + IP : "");
	}
	
	function wakeup() {
		var timeout = 60000;
		var patientAlert = undefined;
		CLIENT.cmd("dockerDaemon", {command: "start"}, timeout, function dockerDeamonAwakenMaybe(err, status) {
			
			if(patientAlert && typeof patientAlert == "object" && typeof patientAlert.close == "function") patientAlert.close();

			if(err) alertBox("Unable to start the Docker daemon! Error: " + err.message);
			else {
				
				if(!status.IP) throw new Error("Did not get IP from dockerDaemon status=" + JSON.stringify(status));
				EDITOR.env.DOCKER_HOST = "tcp://" + status.IP + ":2376";
				
				alertBox("The Docker daemon is now awaken! Speak to it using the docker command in the terminal emulator");
				discoveryBarIcon.activate();
				windowMenu.activate();
				updateStatus("running", status.IP);
				deamonAwake = true;
			}
		});
		if(!deamonCreated) {
			patientAlert = alertBox("First time starting the Docker deamon will take a while. Please be patent!");
		}
	}
	
	function sleep() {
		CLIENT.cmd("dockerDaemon", {command: "stop"}, function dockerDeamonLullaby(err) {
			if(err) alertBox("Unable to stop the Docker daemon! Error: " + err.message);
			else {
				alertBox("The Docker daemon has ben put to sleep!");
				discoveryBarIcon.deactivate();
				windowMenu.deactivate();
				updateStatus("(shut off)");
deamonAwake = false;
			}
		});
	}
	
	
})();



