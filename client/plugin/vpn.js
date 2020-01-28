
(function() {
"use strict";
	
	var discoveryBarIcon;
	var widget;
	var configPath = "/wireguard/wg0.conf";
	
EDITOR.plugin({
desc: "Connect to VPN server",
load: function loadVpnSupport() {
			
			discoveryBarIcon = EDITOR.discoveryBar.addIcon("gfx/wireguard-vpn.svg", 90,  "IP tunnel", "VPN", vpnConnect);
			
			//widget = EDITOR.createWidget(buildVpnWidget);
			
},
unload: function unloadVpnSupport() {
			
			//widget.unload();
			
			EDITOR.discoveryBar.remove(discoveryBarIcon);
			
}
	});
	
	
	function vpnConnect() {
		
if(!EDITOR.user) {
alertBox("Need to be logged in to a editor server in order to connect to a VPN server!");
return;
}

		var homeDir = EDITOR.user.home;
		EDITOR.pathPickerTool({defaultPath: UTIL.joinPaths(homeDir, configPath, instruction: "Path to wg-quick (Wireguard) config: ")}, gotoConfPath);
		
	}
	
	function gotoConfPath(err, path) {
		if(err) alertBox(err.message);
		else vpnConnect(path);
	}
	
	function vpnConnect(pathToConfig) {
		
		configPath = pathToConfig;
		
		CLIENT.cmd("startVpn", {type: "wireguard", conf: configPath}, function vpnStartedMaybe(err) {
			if(err) alertBox(err.message);
			else {
alertBox("Connected to VPN!");
				discoveryBarIcon.activate();
			}
		});
	}
	
	function vpnDisconnect(pathToConfig) {
		if(pathToConfig == undefined) pathToConfig = configPath;
		
		CLIENT.cmd("stopVpn", {type: "wireguard", conf: configPath}, function vpnStoppedMaybe(err) {
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
	
	functioin buildVpnWidget(widget) {
		
	}
	
	

})();
