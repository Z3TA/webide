/*
	
	If you want to run your own VPN server, check out this project:
	https://github.com/trailofbits/algo
	
	There are many VPN protocols, the wireguard protocol seem to be the most popular!
	There is also openvpn, but it was very complicated to setup...
	
	Manual test:
	sudo ip netns exec USERNAME wg-quick up /home/USERNAME/wireguard/wg0.conf
	
	Check IP:
	sudo ip netns exec USERNAME curl https://www.whatismyip.com/ | grep "IPv4 is:"
	
	
*/
(function() {
	"use strict";
	
	var discoveryBarIcon;
	var widget;
	var deamonAwake = false;
	
	EDITOR.plugin({
		desc: "Docker",
		load: function loadDocker() {
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/docker.svg", 100,  "Docker daemon", "DOCKR", toggleDocker);
			// Docker Icon by Icon Mafia https://iconscout.com 
			
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
		if(deamonAwake) sleep();
		else wakeup();
		
		return PREVENT_DEFAULT;
	}
	
	function checkDockerStatus() {
		CLIENT.cmd("dockerDaemon", {command: "status"}, function dockerStatus(err, status) {
			if(err) alertBox("Unable to get Docker daemon status! Error: " + err.message);
			else {
				if(status.started) {
					deamonAwake = true;
					
					if(!status.IP) throw new Error("Did not get IP from dockerDaemon status=" + JSON.stringify(status));
					json.env.DOCKER_HOST = "tcp://" + status.IP + ":2376";
					
					discoveryBarIcon.activate();
					updateStatus("running");
				}
				else if(status.stopped) {
					deamonAwake = false;
					discoveryBarIcon.deactivate();
					updateStatus("shut off")
				}
				else {
					throw new Error("Unexpected answer from server: status=" + status);
				}
			}
		});
	}
	
	function updateStatus(status) {
		discoveryBarIcon.title = "Docker deamon " + status;
	}
	
	function wakeup() {
		CLIENT.cmd("dockerDaemon", {command: "start"}, function dockerDeamonAwakenMaybe(err, status) {
			if(err) alertBox("Unable to start the Docker daemon! Error: " + err.message);
			else {
				
				if(!status.IP) throw new Error("Did not get IP from dockerDaemon status=" + JSON.stringify(status));
				json.env.DOCKER_HOST = "tcp://" + status.IP + ":2376";
				
				alertBox("The Docker daemon is now awaken! Speak to it using the docker command in the terminal emulator");
				discoveryBarIcon.activate();
				updateStatus("running")
			}
		});
	}
	
	
	
	function sleep() {
		CLIENT.cmd("dockerDaemon", {command: "stop"}, function dockerDeamonLullaby(err) {
			if(err) alertBox("Unable to stop the Docker daemon! Error: " + err.message);
			else {
				alertBox("The Docker daemon has ben put to sleep!");
				discoveryBarIcon.deactivate();
				updateStatus("(shut off)");
			}
		});
	}
	
	
})();



