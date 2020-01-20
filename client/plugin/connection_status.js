(function() {
"use strict";

	var lastX = 0;
	var lastWidth = 10;
	var rightPadding = 5;
	
	EDITOR.plugin({
		desc: "Show connection status",
		load: function loadConnectionStatus() {
			
			setTimeout(function waitUntilFirstResize() {
				EDITOR.addRender(renderConnectionStatus, 4900);
				
				CLIENT.on("pingChange", pingChange);
				CLIENT.on("pingTimeout", pingTimeout);
				CLIENT.on("connectionConnected", connectionConnected);
				CLIENT.on("connectionLost", connectionLost);
				CLIENT.on("workerClose", workerClose);
				
				lastWidth = 50;
				lastX = EDITOR.canvas.width - lastWidth - rightPadding;
				
				renderConnectionStatus(EDITOR.canvasContext);
				
			}, 1000);
			
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
		
		console.log("renderConnectionStatus: text=" + text + " x=" + x + " y=" + y + " CLIENT.connected=" + CLIENT.connected + " CLIENT.ping=" + CLIENT.ping);
		
		if(text == undefined) return;
		
		// Clear the screen
		ctx.fillStyle = bgColor;
		ctx.fillRect(lastX, Math.ceil(y-height/2), lastWidth+rightPadding, height);
		
		ctx.fillStyle = textColor;
		ctx.fillText(text, x, y);
		
		lastX = x;
		lastWidth = width;
		
	}
	

})();
