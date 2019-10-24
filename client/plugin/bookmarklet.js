
(function() {

	var winMenuBookmarklet;

EDITOR.plugin({
		desc: "Bookmarklet",
		load: function loadBookmarkletPlugin() {
			winMenuBookmarklet = EDITOR.windowMenu.add(S("Bookmarklet"), [S("Editor"), 1], bookmarklet);
		},
		unload: function unloadBookmarkletPlugin() {
			EDITOR.windowMenu.remove(winMenuBookmarklet);
		}
	});
	
	
	function bookmarklet() {
		
		var loc = document.location;
		
		var srcUrl = loc.protocol + "//" + loc.hostname + "/embed.js";
		
		var link = '<a href="javascript:(function(){var s=document.createElement(\'script\');s.setAttribute(\'id\', \'webide_bookmarklet\');s.setAttribute(\'src\',\'' + srcUrl +'\');document.body.appendChild(s);})()">Code editor</a>';
		
		alertBox(S("drag_following_link_to_bookmark_bar") + ": " + link + "<br><br>" + S("when_bookmarklet_clicked"));
		
	}
	
})();