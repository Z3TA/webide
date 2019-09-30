(function() {
	"use strict";
	
	var pageViewsStat;
	
	EDITOR.plugin({
		desc: "Show web site stats on dashboard",
		load: function loadWebsiteStats() {
			pageViewsStat = EDITOR.dashboard.addWidget(createPageViewStatWidget());
		},
		unload: function unloadWebsiteStats() {
			EDITOR.dashboard.removeWidget(pageViewsStat);
		},
		});
	
	function createPageViewStatWidget() {
		
		var readMonths = 0;
		
		var pageViewStat = document.createElement("div");
		pageViewStat.setAttribute("class", "pageViewStat dashboardWidget");
		
		var description = document.createElement("span");
		description.setAttribute("class", "description");
		description.appendChild(document.createTextNode("Requests to your wwwpub last 12 days"));
		
		pageViewStat.appendChild(description);
		//pageViewStat.appendChild(document.createElement("hr"));
		
		var total = document.createElement("div");
		total.setAttribute("class", "total value big strong");
		total.innerText = (1337).toLocaleString();
		
		pageViewStat.appendChild(total);
		
		var previousDiv = document.createElement("div");
		previousDiv.setAttribute("class", "previous");
		
		previousDiv.appendChild(document.createTextNode("Last week: "));
		
		var previous = document.createElement("span");
		previous.setAttribute("class", "value strong");
		previous.innerText = (1320).toLocaleString();
		
		previousDiv.appendChild(previous);
		
		previousDiv.appendChild(document.createTextNode(" / "));
		
		var percIncrease = document.createElement("span");
		percIncrease.setAttribute("class", "posetive value");
		percIncrease.innerText = "+1,3%";
		
		previousDiv.appendChild(percIncrease);
		
		pageViewStat.appendChild(previousDiv);
		
		var canvas = document.createElement("canvas");
		canvas.setAttribute("width", "420");
		canvas.setAttribute("height", "120");
		
		pageViewStat.appendChild(canvas);
		
		//var fakeData = [500,600,1075,1150,1100,1200,1420,1320,1337];
		//drawGraph(fakeData);
		
		var logsToCheck = 0;
		var logsChecked = 0;
		var logs = [];
		var totalHttpRequests = 0;
		CLIENT.on("loginSuccess", function loggedInToServer(login) {
			checkLog(0);
			for(var i=1; i<=12; i++) checkLog(i);
		});
		
		return pageViewStat;
		
		function checkLog(n) {
			logsToCheck++;
			var nr = "";
			if(n > 0) nr = nr + n;
			CLIENT.cmd("readLines", {start: 1, end: 1, path: "/log/access.log" + (nr ? "." + nr : "")}, readLines);
			function readLines(err, resp) {
				logsChecked++;
				if(err) {
					console.warn("requests_stat: " + err.message);
					logs[n] = 0;
				}
				else {
					logs[n] = resp.totalLines;
					totalHttpRequests += resp.totalLines;
					console.log("requests_stat: n=" + n + " resp.totalLines=" + resp.totalLines);
				}
				if(logsChecked == logsToCheck) {
					
					logs.reverse(); // So that todays is last
					
					drawGraph(logs);
					
					total.innerText = (totalHttpRequests).toLocaleString();
					
					var prev = 0;
					var last = 0;
					for(var i=2; i<=6; i++) {
						prev += logs[i];
						console.log("requests_stat: logs[" + i + "]=" + logs[i] + " prev=" + prev);
					}
					for(var i=7; i<=11; i++) {
						last += logs[i];
						console.log("requests_stat: logs[" + i + "]=" + logs[i] + " last=" + last);
					}
					
					previous.innerText = (prev).toLocaleString();
					
					var perc = Math.round(((last/prev) - 1) * 100, 1);
					var str = (perc).toLocaleString() + "%";
					
					if(perc > 0) {
str = "+" + str;
						percIncrease.classList.add("posetive");
						percIncrease.classList.remove("negative");
					}
					else {
						percIncrease.classList.remove("posetive");
						percIncrease.classList.add("negative");
					}
					
					percIncrease.innerText = str;
					
					// Reset if we login to another server
					logsToCheck = 0;
					logsChecked = 0;
					
				}
				else {
					console.log("requests_stat: n=" + n + " logsChecked=" + logsChecked + " logsToCheck=" + logsToCheck);
				}
			}
		}
		
		
		function drawGraph(data) {
			var ctx = canvas.getContext("2d", {alpha: true});
			
			var sortedData = data.concat().sort(function asc(a, b) { // concat to make a copy
				return a - b;
			});
			
			var min = sortedData[0];
			var max = sortedData[sortedData.length-1];
			var diff = max - min;
			
			var canvasWidth = canvas.width;
			var canvasHeight = canvas.height;
			
			var x = 0;
			var y = canvasHeight - (canvasHeight / diff * (data[0]-min));;
			
			ctx.clearRect(0,0, canvasWidth, canvasHeight);
			
			ctx.beginPath();
			ctx.moveTo(x, y);
			console.log("pageViewStat data="+ JSON.stringify(data));
			for(var i=0; i<data.length; i++) {
				x = canvasWidth / (data.length-1) * i;
				y = canvasHeight - (canvasHeight / diff * (data[i]-min));
				ctx.lineTo(x,y);
			}
			ctx.strokeStyle="#b4dbeb";
			ctx.lineWidth=2;
			ctx.stroke();
			
			
		}
		
		
		
	}
	
	
})();
