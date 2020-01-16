(function() {
"use strict";

	var hasProblem = false;
	
	EDITOR.plugin({
		desc: "Show connection status",
		load: function loadConnectionStatus() {
			
			CLIENT.on("pingChange", pingChange);
			CLIENT.on("pingTimeout", pingTimeout);
			CLIENT.on("connectionConnected", connectionConnected);
			CLIENT.on("connectionLost", connectionLost);
			CLIENT.on("workerClose", workerClose);
			
			EDITOR.addRender(renderConnectionStatus, 4900);
			
		},
		unload: function unloadConnectionStatus() {
			
			CLIENT.removeEvent("pingChange", pingChange);
			CLIENT.removeEvent("pingTimeout", pingTimeout);
			CLIENT.removeEvent("connectionConnected", connectionConnected);
			CLIENT.removeEvent("connectionLost", connectionLost);
			CLIENT.removeEvent("workerClose", workerClose);
			
			EDITOR.removeRender(renderConnectionStatus);
		}
	});

	function connectionConnected() {
		EDITOR.renderNeeded();
	}
	
	function connectionLost() {
		EDITOR.renderNeeded();
	}
	
	function workerClose() {
		EDITOR.renderNeeded();
	}
	
	function pingChange(ping) {
		EDITOR.renderNeeded();
	}
	
	function pingTimeout() {
		EDITOR.renderNeeded();
	}
	
	function renderConnectionStatus(ctx) {
		
		if(CLIENT.connected && CLIENT.ping > -1) { 
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
		else if(CLIENT.connected && CLIENT.ping == -1) {
			var text = S("network_problem");
			var bgColor = "yellow";
			var textColor = "black";
		}
		else if(!CLIENT.connected) {
			var text = S("disconnected");
			var bgColor = "red";
			var textColor = "white";
		}
		
		var width = Math.ceil(ctx.measureText(text).width);
		var height = 20;
		
		var x = EDITOR.canvas.width - width - 5;
		var y = 20;
		
		
		//ctx.beginPath();
		ctx.fillStyle = bgColor;
		ctx.fillRect(x, Math.ceil(y-height/2), width, height);
		
		ctx.fillStyle = textColor;
		ctx.fillText(text, x, y);
		
		console.log("renderConnectionStatus: text=" + text + " x=" + x + " y=" + y);
		
	}
	

})();