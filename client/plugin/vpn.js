
(function() {
"use strict";
	
	var discoveryBarIcon;
	var widget;
	var configPath = "/wireguard/wg0.conf";
	var connected = false;
	
EDITOR.plugin({
desc: "Connect to VPN server",
load: function loadVpnSupport() {
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/wireguard-vpn.svg", 90,  "Virtual private network (VPN) IP tunnel", "VPN", toggleVpnConnection);
			
			//widget = EDITOR.createWidget(buildVpnWidget);
			
			CLIENT.on("loginSuccess", checkVpnStatus);
			
},
unload: function unloadVpnSupport() {
			
			//widget.unload();
			
			EDITOR.discoveryBar.remove(discoveryBarIcon);
			
			CLIENT.removeEvent("loginSuccess", checkVpnStatus);
			
}
	});
	
	function toggleVpnConnection() {
		if(connected) vpnStop();
		else vpnConnect();
	
return PREVENT_DEFAULT;
}
	
	function checkVpnStatus() {
		CLIENT.cmd("vpn", {type: "wireguard", command: "status", conf: configPath}, function vpnStartedMaybe(err, status) {
			if(err) alertBox(err.message);
			else {
				if(status == "connected") {
					connected = true;
					discoveryBarIcon.activate();
				}
				else if(status == "disconnected") {
					connected = false;
					discoveryBarIcon.deactivate();
				}
				else {
					throw new Error("Unexpected answer from server: status=" + status);
				}
				
				
			}
		});
	}
	
	
	function vpnConnect() {
		
if(!EDITOR.user) {
alertBox("Need to be logged in to a editor server in order to connect to a VPN server!");
return;
}

		var homeDir = EDITOR.user.home;
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
		
		CLIENT.cmd("vpn", {type: "wireguard", command: "start", conf: configPath}, function vpnStartedMaybe(err) {
			if(err) alertBox(err.message);
			else {
alertBox("Connected to VPN!");
				discoveryBarIcon.activate();
			}
		});
	}
	
	function vpnStop(pathToConfig) {
		if(pathToConfig == undefined) pathToConfig = configPath;
		
		if(typeof pathToConfig != "string") throw new Error("pathToConfig=" + pathToConfig + " is not a string!");
		
		CLIENT.cmd("vpn", {type: "wireguard", command: "stop", conf: pathToConfig}, function vpnStoppedMaybe(err) {
			if(err) alertBox(err.message);
			else {
alertBox("Disconnected from VPN!");
		discoveryBarIcon.deactivate();
}
});
	}
	
	
	
	function showVpnWidget() {
		widget.show();
		
	}
	
	function buildVpnWidget(widget) {
		
	}
	
	

})();
