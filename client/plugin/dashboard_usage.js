(function() {
	"use strict";

	var cpuWidget;
	var updateInterval;
	var UPDATE_TIME = 1000;
	
	EDITOR.plugin({
		desc: "Show CPU usage on the dashboard",
		load: function loadTimeWidget() {
			
			cpuWidget = createCpuWidget();
			
			EDITOR.on("showDashboard", startCpuTimer);
			EDITOR.on("hideDashboard", stopCpuTimer);
			
			EDITOR.dashboard.addWidget(cpuWidget.domElement);
			
		},
		unload: function unloadTimeWidget() {
			
			EDITOR.dashboard.removeWidget(cpuWidget.domElement);
			
			EDITOR.removeEvent("showDashboard", startCpuTimer);
			EDITOR.removeEvent("hideDashboard", stopCpuTimer);
		}
	});
	
	function startCpuTimer() {
		
		if(updateInterval) clearInterval(updateInterval);
		updateInterval = setInterval(cpuWidget.update, UPDATE_TIME);
		
		return true;
	}
	
	function stopCpuTimer() {
		if(updateInterval) clearInterval(updateInterval);
		
		return true;
	}
	
	function createCpuWidget() {
		
		var widget = document.createElement("div");
		widget.setAttribute("class", "cpuWidget dashboardWidget");
		
		var caption = document.createElement("div");
		caption.setAttribute("class", "description");
		caption.innerText = "CPU Load";
		widget.appendChild(caption);
		
		var currentLoad = document.createElement("div");
		currentLoad.setAttribute("class", "currentLoad");
		widget.appendChild(currentLoad);
		
		var graph = document.createElement("div");
		graph.setAttribute("class", "graph");
		
		var lastSamples = [0,0,0,0,0,0,0,0,0,0];
		var graphs = [];
		
		var graphWrap;
		for(var i=0; i<lastSamples.length; i++) {
			graphWrap = document.createElement("div");
			graphWrap.setAttribute("class", "itemwrap");
			
			graphs[i] = document.createElement("div");
			graphs[i].setAttribute("class", "item item" + i);
			graphs[i].style.height = Math.round(lastSamples[i] / 10) + "px";
			
			graphWrap.appendChild(graphs[i]);
			
			graph.appendChild(graphWrap);
		}
		
		widget.appendChild(graph);
		
		
		var last;
		
		
		function update() {
			
			CLIENT.cmd("cpu", function(err, cpus) {
				
				if(err) return;
				
				console.log(JSON.stringify(cpus, null, 2));
				
				// Times are the cummulated number of milliseconds (from boot) the CPU has spent in that mode. (One second has 1000 milli-seconds)
				
				var times = cpus.map(function(cpu) {
					return cpu.times["user"] + cpu.times["nice"] + cpu.times["sys"] + cpu.times["irq"];
				});
				
				var total = times.reduce(sumReducer);
				
				if(!last) last = total;
				
				var delta = total - last;
				var load = Math.round(delta / 10 / cpus.length) | 0; // Avarage across all CPU's'
				
				var strLoad = (load/10).toString();
				if(strLoad.indexOf("100") == 0) strLoad = "100";
				else if(strLoad.indexOf(".") == -1) strLoad += ".0";
				
				currentLoad.innerText = strLoad + "%";
				
				/*
					if(total != last) currentLoad.classList.remove('fade');
					setTimeout(function() {
					currentLoad.classList.add('fade');
					
					}, 500);
				*/
				
				
				for(var i=0; i<graphs.length; i++) {
					graphs[i].style.height = Math.round(lastSamples[i] / 10) + "px";
				}
				
				lastSamples.shift();
				lastSamples.push(load);
				
				last = total;
				
			});
			
		}
		
		return {domElement: widget, update: update};
		
		
	}
	
	
	function sumReducer(accumulator, currentValue) {
		if(accumulator == undefined) accumulator = 0;
		return accumulator + currentValue;
	}
	
})();
