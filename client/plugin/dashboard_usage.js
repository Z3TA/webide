(function() {
	"use strict";

	var cpuWidget;
	var memoryWidget
	var updateInterval;
	var UPDATE_TIME = 2000;
	
	EDITOR.plugin({
		desc: "Show system CPU and memory usage on the dashboard",
		load: function loadCpuAndMemoryWidget() {
			
			cpuWidget = createCpuWidget();
			memoryWidget = createMemoryWidget();
			
			EDITOR.on("showDashboard", startCpuAndMemoryTimer);
			EDITOR.on("hideDashboard", stopCpuAndMemoryTimer);
			
			EDITOR.dashboard.addWidget(cpuWidget.domElement);
			EDITOR.dashboard.addWidget(memoryWidget.domElement);
			
		},
		unload: function unloadCpuAndMemoryWidget() {
			
			EDITOR.dashboard.removeWidget(cpuWidget.domElement);
			
			EDITOR.removeEvent("showDashboard", startCpuAndMemoryTimer);
			EDITOR.removeEvent("hideDashboard", stopCpuAndMemoryTimer);
		}
	});
	
	function startCpuAndMemoryTimer() {
		
		if(updateInterval) clearInterval(updateInterval);
		updateInterval = setInterval(function updateCpuAndMemoryUsage() {
			cpuWidget.update();
			memoryWidget.update();
		}, UPDATE_TIME);
		
		return true;
	}
	
	function stopCpuAndMemoryTimer() {
		if(updateInterval) clearInterval(updateInterval);
		
		return true;
	}
	
	function createCpuWidget() {
		
		var widget = document.createElement("div");
		widget.setAttribute("class", "smallGraph dashboardWidget");
		
		var caption = document.createElement("div");
		caption.setAttribute("class", "description");
		caption.innerText = "System CPU Load";
		widget.appendChild(caption);
		
		var currentLoad = document.createElement("div");
		currentLoad.setAttribute("class", "current strong");
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
				
				//console.log(JSON.stringify(cpus, null, 2));
				
				// Times are the cummulated number of milliseconds (from boot) the CPU has spent in that mode. (One second has 1000 milli-seconds)
				
				var times = cpus.map(function(cpu) {
					return cpu.times["user"] + cpu.times["nice"] + cpu.times["sys"] + cpu.times["irq"];
				});
				
				var total = times.reduce(sumReducer);
				
				if(!last) last = total;
				
				var delta = total - last;
				var load = Math.round(delta * 100 / UPDATE_TIME / cpus.length) | 0; // Avarage across all CPU's'
				
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
	
	function createMemoryWidget() {
		
		var widget = document.createElement("div");
		widget.setAttribute("class", "smallGraph dashboardWidget");
		
		var caption = document.createElement("div");
		caption.setAttribute("class", "description");
		caption.innerText = "System memory usage";
		widget.appendChild(caption);
		
		var memoryUsage = document.createElement("div");
		memoryUsage.setAttribute("class", "current strong");
		widget.appendChild(memoryUsage);
		
		var memoryAbout = document.createElement("div");
		memoryAbout.setAttribute("class", "currentsmall weak");
		widget.appendChild(memoryAbout);
		
		var graph = document.createElement("div");
		graph.setAttribute("class", "graph");
		
		var memorySamples = [0,0,0,0,0,0,0,0,0,0];
		var graphs = [];
		
		var graphWrap;
		for(var i=0; i<memorySamples.length; i++) {
			graphWrap = document.createElement("div");
			graphWrap.setAttribute("class", "itemwrap");
			
			graphs[i] = document.createElement("div");
			graphs[i].setAttribute("class", "item item" + i);
			graphs[i].style.height = Math.round(memorySamples[i] / 10) + "px";
			
			graphWrap.appendChild(graphs[i]);
			
			graph.appendChild(graphWrap);
		}
		
		widget.appendChild(graph);
		
		function update() {
			
			CLIENT.cmd("memory", function(err, memory) {
				
				if(err) return;
				
				//console.log(JSON.stringify(memory, null, 2));
				
				var unit = "MB";
				var division = memory.free.toString().length-1;
				if(division < 1) division = 1;
				
				//console.log("memory: division=" + division);
				
				if(division >= 9) {
					unit = "GB";
					division = 1024*1024*1024;
				}
				else if(division >= 6) {
					unit = "MB";
					division = 1024*1024;
				}
				else if(division >= 3) {
					unit = "K";
					division = 1024;
				}
				else {
					unit = "";
					division = 1;
				}
				
				//console.log("memory: unit=" + unit + " division=" + division);
				
				var total = Math.round(memory.total/division * 10)|0;
				var free = Math.round(memory.free/division * 10)|0;
				
				total = total / 10;
				free = free / 10;
				
				var totalStr = total.toString();
				var freeStr = free.toString();
				
				if(totalStr.indexOf(".") == -1) totalStr += ".0";
				if(freeStr.indexOf(".") == -1) freeStr += ".0";
				
				//memoryAbout.innerText = totalStr + unit + " total, " + freeStr + unit + " free";
				memoryAbout.innerText = freeStr + unit + " free";
				
				var usage = Math.round( (memory.total-memory.free) / memory.total * 1000) | 0;
				
				//var strUsage = (usage/10).toString();
				var strUsage = Math.round(usage/10).toString();
				if(strUsage.indexOf("100") == 0) strUsage = "100";
				//else if(strUsage.indexOf(".") == -1) strUsage += ".0";
				
				memoryUsage.innerText = strUsage + "%";
				
				for(var i=0; i<graphs.length; i++) {
					graphs[i].style.height = Math.round(memorySamples[i] / 10) + "px";
				}
				
				memorySamples.shift();
				memorySamples.push(usage);
				
			});
			
		}
		
		return {domElement: widget, update: update};
	}
	
	function sumReducer(accumulator, currentValue) {
		if(accumulator == undefined) accumulator = 0;
		return accumulator + currentValue;
	}
	
})();
