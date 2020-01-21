(function() {
"use strict";

	var lastWidth = 50;
	var rightPadding = 5;
	var winMenuItem;
	var enabled = false;
	
	EDITOR.plugin({
		desc: "Show connection status",
		load: function loadConnectionStatus() {
			
			winMenuItem = EDITOR.windowMenu.add(S("ping_and_network_status"), [S("View"), 70], toggleNetworkStatus);
			
			EDITOR.loadSettings("show_ping", enabled, function(setting) {
				
enabled = setting;

				if(enabled) {
					// Wait for first resize...
					setTimeout(enable, 1000);
				}
			});
			
		},
		unload: function unloadConnectionStatus() {
			
			disable();
			
			EDITOR.windowMenu.remove(winMenuItem);
			
		}
	});

	function enable() {
		EDITOR.addRender(renderConnectionStatus, 4900);
		
		CLIENT.on("pingChange", pingChange);
		CLIENT.on("pingTimeout", pingTimeout);
		CLIENT.on("connectionConnected", connectionConnected);
		CLIENT.on("connectionLost", connectionLost);
		CLIENT.on("workerClose", workerClose);
		
		renderConnectionStatus(EDITOR.canvasContext);
		
		winMenuItem.activate();
	}
	
	function disable() {
		CLIENT.removeEvent("pingChange", pingChange);
		CLIENT.removeEvent("pingTimeout", pingTimeout);
		CLIENT.removeEvent("connectionConnected", connectionConnected);
		CLIENT.removeEvent("connectionLost", connectionLost);
		CLIENT.removeEvent("workerClose", workerClose);
		
		EDITOR.removeRender(renderConnectionStatus);
		
		EDITOR.renderNeeded();
		
		winMenuItem.deactivate();
	}
	
	function toggleNetworkStatus() {
		enabled = !enabled;
		
		console.log("toggleNetworkStatus: enabled=" + enabled + " Calling EDITOR.saveSettings...");
		
		EDITOR.saveSettings("show_ping", enabled);
		
		if(enabled) enable();
		else disable();
	}
	
	function connectionConnected() {
		renderConnectionStatus(EDITOR.canvasContext);
	}
	
	function connectionLost() {
		renderConnectionStatus(EDITOR.canvasContext);
	}
	
	function workerClose() {
		renderConnectionStatus(EDITOR.canvasContext);
	}
	
	function pingChange(ping) {
		renderConnectionStatus(EDITOR.canvasContext);
	}
	
	function pingTimeout() {
		renderConnectionStatus(EDITOR.canvasContext);
	}
	
	
	
	
	function renderConnectionStatus(ctx) {
		
		if(CLIENT.connected && CLIENT.ping == Infinity) {
			var text = S("network_problem");
			var bgColor = "yellow";
			var textColor = "black";
		}
		else if(CLIENT.connected && CLIENT.ping == -1) {
			var text = S("reconnecting");
			var bgColor = "green";
			var textColor = "black";
		}
		else if(CLIENT.connected && CLIENT.ping > -1) { 
			var text = "ping: " + CLIENT.ping;
			if(CLIENT.ping < 100) {
				var bgColor = EDITOR.settings.style.bgColor;
				var textColor = EDITOR.settings.style.textColor;
			}
			else {
				var bgColor = "yellow";
				var textColor = "black";
			}
		}
		else if(!CLIENT.connected) {
			var text = S("disconnected");
			var bgColor = "red";
			var textColor = "white";
		}
		else {
			console.warn("renderConnectionStatus: CLIENT.connected=" + CLIENT.connected + " CLIENT.ping=" + CLIENT.ping + " huh???");
		}
		
		var width = Math.ceil(ctx.measureText(text).width);
		var height = 20;
		
		var x = EDITOR.canvas.width - width - rightPadding;
		var y = 20;
		
		var lastX = EDITOR.canvas.width - lastWidth - rightPadding;
		
		console.log("renderConnectionStatus: text=" + text + " x=" + x + " y=" + y + " CLIENT.connected=" + CLIENT.connected + " CLIENT.ping=" + CLIENT.ping);
		
		if(text == undefined) return;
		
		// Clear the screen from last message
		ctx.fillStyle = EDITOR.settings.style.bgColor;
		ctx.fillRect(lastX, Math.ceil(y-height/2), lastWidth+rightPadding, height);
		
// Fill background for new message
		ctx.fillStyle = bgColor;
		ctx.fillRect(x, Math.ceil(y-height/2), width+rightPadding, height);
		
		ctx.fillStyle = textColor;
		ctx.fillText(text, x, y);
		
		lastWidth = width;
		
	}
	

})();
