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
	var configPath = "/wireguard/wg0.conf";
	var connected = false;
	var winMenuItem;
	
if(QUERY_STRING["disable"] && QUERY_STRING["disable"].indexOf("vpn") != -1) {
console.warn("VPN disabled via query string!");
return;
}

EDITOR.plugin({
desc: "Connect to VPN server",
load: function loadVpnSupport() {
			
			winMenuItem = EDITOR.windowMenu.add("VPN", [S("tools"), 1], toggleVpnConnection);
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/wireguard-vpn.svg", 130,  "Virtual private network (VPN) IP tunnel", "VPN", toggleVpnConnection);
			
			//widget = EDITOR.createWidget(buildVpnWidget);
			
			CLIENT.on("loginSuccess", checkVpnStatus);
			
},
unload: function unloadVpnSupport() {
			
			//widget.unload();
			
			if(discoveryBarIcon) EDITOR.discoveryBar.remove(discoveryBarIcon);
			
			EDITOR.windowMenu.remove(winMenuItem);
			
			CLIENT.removeEvent("loginSuccess", checkVpnStatus);
			
}
	});
	
	function toggleVpnConnection() {
		if(connected) vpnStop();
		else vpnConnect();
		
		return PREVENT_DEFAULT;
	}
	
	function checkVpnStatus(login) {
if(!login.tld) {
console.warn("Disabling VPN plugin");
EDITOR.disablePlugin("Connect to VPN server", true);
return;
}

		CLIENT.cmd("vpn", {type: "wireguard", command: "status", conf: configPath}, function vpnStatus(err, status) {
			if(err) alertBox(err.message);
			else {
				if(status.indexOf("connected") == 0) {
					connected = true;
					if(discoveryBarIcon) discoveryBarIcon.activate();
					winMenuItem.activate();
				}
				else if(status == "disconnected") {
					connected = false;
					if(discoveryBarIcon && !discoveryBarIcon.disabled) discoveryBarIcon.deactivate();
					if(winMenuItem) winMenuItem.deactivate();
				}
				else {
					throw new Error("Unexpected answer from server: status=" + status);
				}
				
				updateStatus(status)
				
			}
		});
	}
	
	function updateStatus(status) {
		var title = "Virtual private network (VPN) IP tunnel " + status;
		if(discoveryBarIcon) discoveryBarIcon.title = title;
		winMenuItem.text.title = title;
	}
	
	function vpnConnect() {
		
if(!EDITOR.user) {
alertBox("Need to be logged in to a editor server in order to connect to a VPN server!");
return;
}

		var homeDir = EDITOR.user.homeDir;
		EDITOR.pathPickerTool( {defaultPath: UTIL.joinPaths(homeDir, configPath), instruction: "Path to wg-quick (Wireguard) config: "}, gotoConfPath );
		
	}
	
	function gotoConfPath(err, path) {
		if(err) alertBox(err.message);
		else if(typeof path != "string") throw new Error("path=" + path + " is not a string!");
		else vpnStart(path);
	}
	
	function vpnStart(pathToConfig) {
		
		configPath = pathToConfig;
		
		if(typeof configPath != "string") throw new Error("configPath=" + configPath + " is not a string!");
		
		CLIENT.cmd("vpn", {type: "wireguard", command: "start", conf: configPath}, function startedVpn(err) {
			if(err) alertBox(err.message);
			else {
alertBox("Connected to VPN!");
				if(discoveryBarIcon) discoveryBarIcon.activate();
				winMenuItem.activate();
				updateStatus("connected!")
			}
		});
	}
	
	function vpnStop(pathToConfig) {
		if(pathToConfig == undefined) pathToConfig = configPath;
		
		if(typeof pathToConfig != "string") throw new Error("pathToConfig=" + pathToConfig + " is not a string!");
		
		CLIENT.cmd("vpn", {type: "wireguard", command: "stop", conf: pathToConfig}, function stoppedVpn(err) {
			if(err) alertBox(err.message);
			else {
alertBox("Disconnected from VPN!");
				if(discoveryBarIcon) discoveryBarIcon.deactivate();
winMenuItem.deactivate();
				updateStatus("(not connected)");
}
});
	}
	
	
	
	function showVpnWidget() {
		widget.show();
		
	}
	
	function buildVpnWidget(widget) {
		
	}
	
	

})();
