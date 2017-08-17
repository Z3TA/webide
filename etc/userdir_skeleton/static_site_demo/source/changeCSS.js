
(function() { 

	console.log("Hello!");
	
	var baseUrl = "http://www.csszengarden.com/"; // 217/217.css",
	var range = {start: 214, end: 221};
	
	var current = range.start;
	
	window.addEventListener("load", function windowLoad() {
		console.log("Window loaded!");
		
		var nextLink = document.getElementById("nextDesign");
		
		nextLink.addEventListener("click", function nextLinkClick(clickEvent) {
			showNextDesign();
			event.preventDefault();
			return false;
		});
		
	});
	
	function showNextDesign() {
		current++;
		if(current >= range.end) current = range.start;
		changeCss(baseUrl + current + "/" + current + ".css"); 
	}
	
function changeCss(cssFile) {
	console.log("Reloading link stylesheet elements ...");
	
	var links = document.getElementsByTagName('link');
	
		var originalCss = "gfx/csszengarden.css";
		
	for (var i=0; i<links.length; i++) {
		if(links[i].getAttribute("rel").toLowerCase().indexOf("stylesheet") != -1) {
				console.log(links[i].href);
				if(links[i].getAttribute("id") == "csszengarden") {
				links[i].href = cssFile;
					// "?date=" + new Date().getMilliseconds();
					
				console.log("CSS file updated to cssFile=" + cssFile);
					return;
			}
			}
	}
		console.log("stylesheet not found!");
	return false;
}


})();