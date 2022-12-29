
(function() {

	var timeWidget;
	var updateInterval;
	
EDITOR.plugin({
		desc: "Time widget for the dashboard",
		load: function loadTimeWidget() {
			
			EDITOR.on("showDashboard", updateTime);
			EDITOR.on("hideDashboard", stopTime);
			
			EDITOR.dashboard.announceWidget(announceTimeWidget);

		},
		unload: function unloadTimeWidget() {
			
			if(timeWidget) EDITOR.dashboard.removeWidget(timeWidget.domElement);
			EDITOR.dashboard.deannounceWidget(announceTimeWidget);

			EDITOR.removeEvent("showDashboard", updateTime);
			EDITOR.removeEvent("hideDashboard", stopTime);
}
});

	function announceTimeWidget(callback) {
		timeWidget = createTimeWidget();
		callback(timeWidget.domElement);
	}
	
	function updateTime() {
		if(timeWidget) timeWidget.update();
		updateInterval = setInterval(function updateTime() {
			if(timeWidget) timeWidget.update();
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
		
		/*
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
		*/
		
		var clock = document.createElement("div");
		clock.setAttribute("class", "clock");
		timeWidget.appendChild(clock);
		
		var time = document.createElement("span");
		time.setAttribute("class", "time strong");
		clock.appendChild(time);
		
		var ampm = document.createElement("span");
		ampm.setAttribute("class", "ampm weak");
		clock.appendChild(ampm);
		
		var weekDay = document.createElement("div");
		weekDay.setAttribute("class", "weekDay");
		timeWidget.appendChild(weekDay);
		
		var formattedDate = document.createElement("div");
		formattedDate.setAttribute("class", "formattedDate strong");
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
			var strAmPm = hours >= 12 ? 'pm' : 'am';
			if(ampm.innerText != strAmPm) ampm.innerText = strAmPm;
			
			hours = hours % 12;
			hours = hours ? hours : 12; // the hour '0' should be '12'
			
			var minutes = date.getMinutes();
			minutes = minutes < 10 ? '0'+minutes : minutes;
			var strTime = hours + ':' + minutes
			if(time.innerText != strTime) time.innerText = strTime;
			
			var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			var strWeekDay = days[date.getDay()]
			if(weekDay.innerText != strWeekDay) weekDay.innerText = strWeekDay;
			
			
			var dayOfMonth = date.getDate();
			var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
			
			var strDate = dayOfMonth + " " + monthNames[date.getMonth()] + " " + date.getFullYear();
			if(formattedDate.innerText != strDate) formattedDate.innerText = strDate;
			
			var strTimeZone = "Time Zone: UTC " + date.getTimezoneOffset() / 60;
			if(timeZone.innerText != strTimeZone) timeZone.innerText = strTimeZone;

		}
	}
	
})();