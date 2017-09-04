(function() {
	"use strict";
	
	var pageViewsStat;
	
	EDITOR.plugin({
		desc: "Show web site stats on ",
		load: function loadWebsiteStats() {
			pageViewsStat = EDITOR.addDashboardWidget(createPageViewStatWidget());
		},
		unload: function unloadWebsiteStats() {
			EDITOR.removeDashboardWidget(pageViewsStat);
		},
		});
	
	function createPageViewStatWidget() {
		
		var pageViewStat = document.createElement("div");
		pageViewStat.setAttribute("class", "pageViewStat dashboardWidget");
		
		var description = document.createElement("span");
		description.setAttribute("class", "description");
		description.appendChild(document.createTextNode("Total page views last 30 days"));
		
		pageViewStat.appendChild(description);
		pageViewStat.appendChild(document.createElement("hr"));
		
		var total = document.createElement("div");
		total.setAttribute("class", "total value");
		total.innerText = (1337).toLocaleString();
		
		pageViewStat.appendChild(total);
		
		var previousDiv = document.createElement("div");
		previousDiv.setAttribute("class", "previous");
		
		previousDiv.appendChild(document.createTextNode("Previous: "));
		
		var previous = document.createElement("span");
		previous.setAttribute("class", "value");
		previous.innerText = (1320).toLocaleString();;
		
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
		
		var fakeData = [500,600,1075,1150,1100,1200,1420,1320,1337];
		drawGraph(fakeData);
		
		return pageViewStat;
		
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
