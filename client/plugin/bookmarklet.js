
(function() {

	var winMenuBookmarklet;

EDITOR.plugin({
		desc: "Bookmarklet",
		load: function loadBookmarkletPlugin() {
			winMenuBookmarklet = EDITOR.windowMenu.add("Bookmarklet", ["Editor", 1], bookmarklet);
		},
		unload: function unloadBookmarkletPlugin() {
			EDITOR.windowMenu.remove(winMenuBookmarklet);
		}
	});
	
	
	function bookmarklet() {
		
		var loc = document.location;
		
		var srcUrl = loc.protocol + "//" + loc.hostname + "/embed.js";
		
		var link = '<a href="javascript:(function(){var s=document.createElement(\'script\');s.setAttribute(\'id\', \'webide_bookmarklet\');s.setAttribute(\'src\',\'' + srcUrl +'\');document.body.appendChild(s);})()">Code editor</a>';
		
		alertBox("Drag the following link to the bookmark bar: " + link + "<br><br>When clicked it will turn the first textarea on the page into a code editor!");
		
	}
	
})();