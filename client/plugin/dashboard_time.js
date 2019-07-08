
(function() {

	var timeWidget;
	var updateInterval;
	
EDITOR.plugin({
		desc: "Time widget for the dashboard",
		load: function loadTimeWidget() {
			
			timeWidget = createTimeWidget();
			
			EDITOR.on("showDashboard", updateTime);
			EDITOR.on("hideDashboard", stopTime);
			
			EDITOR.dashboard.addWidget(timeWidget.domElement);
			
},
		unload: function unloadTimeWidget() {
			
			EDITOR.dashboard.removeWidget(timeWidget.domElement);
			
			EDITOR.removeEvent("showDashboard", updateTime);
			EDITOR.removeEvent("hideDashboard", stopTime);
}
});

	
	function updateTime() {
		timeWidget.update();
		updateInterval = setInterval(function updateTime() {
			timeWidget.update();
		}, 1000);
		
		return true;
	}
	
	function stopTime() {
		if(updateInterval) clearInterval(updateInterval);
		
		return true;
	}
	
	
	function createTimeWidget() {
		
		var timeWidget = document.createElement("div");
		timeWidget.setAttribute("class", "timeWidget dashboardWidget");
		
		var  loc = document.createElement("div");
		loc.setAttribute("class", "location description");
		var city = document.createElement("span");
		city.setAttribute("class", "city");
		var country = document.createElement("span");
		country.setAttribute("class", "country");
		loc.appendChild(city);
		loc.appendChild(document.createTextNode(", "));
		loc.appendChild(country);
		timeWidget.appendChild(loc);
		
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function successFunction(position) {
				var lat = position.coords.latitude;
				var long = position.coords.longitude;
				city.innerText = long;
				country.innerText = lat;
			}, noGeoLocation);
		}
		else noGeoLocation();
		
		function noGeoLocation() {
			city.innerText = "Stockholm";
			country.innerText = "Sweden";
		}
		
		var clock = document.createElement("div");
		clock.setAttribute("class", "clock");
		timeWidget.appendChild(clock);
		
		var time = document.createElement("span");
		time.setAttribute("class", "time");
		clock.appendChild(time);
		
		var ampm = document.createElement("span");
		ampm.setAttribute("class", "ampm");
		clock.appendChild(ampm);
		
		var weekDay = document.createElement("div");
		weekDay.setAttribute("class", "weekDay");
		timeWidget.appendChild(weekDay);
		
		var formattedDate = document.createElement("div");
		formattedDate.setAttribute("class", "formattedDate");
		timeWidget.appendChild(formattedDate);
		
		var hr = document.createElement("hr");
		hr.setAttribute("class", "space");
		timeWidget.appendChild(hr);
		
		var timeZone = document.createElement("div");
		timeZone.setAttribute("class", "timeZone");
		timeWidget.appendChild(timeZone);
		
		//updateTime();
		
		return {domElement: timeWidget, update: updateTime};
		
		
		function updateTime() {
			var date = new Date();
			
			var hours = date.getHours();
			ampm.innerText = hours >= 12 ? 'pm' : 'am';
			
			hours = hours % 12;
			hours = hours ? hours : 12; // the hour '0' should be '12'
			
			var minutes = date.getMinutes();
			minutes = minutes < 10 ? '0'+minutes : minutes;
			
			time.innerText = hours + ':' + minutes;
			
			var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			weekDay.innerText = days[date.getDay()];
			
			
			var dayOfMonth = date.getDate();
			var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
			
			formattedDate.innerText = dayOfMonth + " " + monthNames[date.getMonth()] + " " + date.getFullYear();
			
			
			
			timeZone.innerText = "Time Zone: UTC " + date.getTimezoneOffset() / 60;
			
		}
		
		
		
		
		
		
		return timeWidget;
	}
	
})();