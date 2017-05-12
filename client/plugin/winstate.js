(function() {
	
	//alert("runtime=" + runtime);
	
	if(runtime == "browser") {
		console.warn("Winstate not yet supported in the browser!");
		return;
	}
	
	if(!window.localStorage) {
		console.warn("window.localStorage not available! winstate.js plugin disabled.");
		return false;
	}
	
	'use strict';

	/*
	 * https://github.com/nwjs/nw.js/wiki/Preserve-window-state-between-sessions
	 *
	 * Cross-platform window state preservation.
	 * Yes this code is quite complicated, but this is the best I came up with for
	 * current state of node-webkit Window API (v0.7.3 and later).
	 *
	 * Known issues:
	 * - Unmaximization not always sets the window (x, y) in the lastly used coordinates.
	 * - Unmaximization animation sometimes looks wierd.
	 * - Extra height added to window, at least in linux x64 gnome-shell env. It seems that
	 *   when we read height then it returns it with window frame, but if we resize window
	 *   then it applies dimensions only to internal document without external frame.
	 *   Need to test in other environments with different visual themes.
	 *
	 * Change log:
	 * 2013-12-01
	 * - Workaround of extra height in gnome-shell added.
	 *
	 * 2014-03-22
	 * - Repared workaround (from 2013-12-01) behaviour when use frameless window.
	 *   Now it works correctly.
	 * 2014-10-02
	 * - Fixed cannot set windowState of null error when attempting to set window.localStorage
	 *
	 * 2015-03-05
	 * - Don't call window.show() if dev tools are already open (see initWindowState).
	 *
	 * 2015-06-15
	 * - Don't resize the window when using LiveReload.
	 */

	var gui = require('nw.gui');
	var win = gui.Window.get();
	var winState = {};
	var currWinMode;
	var resizeTimeout;
	var isMaximizationEvent = false;
	// extra height added in linux x64 gnome-shell env, use it as workaround
	var deltaHeight = gui.App.manifest.window.frame ? 0 : 'disabled';


	function initWindowState() {
		// Don't resize the window when using LiveReload.
		// There seems to be no way to check whether a window was reopened, so let's
		// check for dev tools - they can't be open on the app start, so if
		// dev tools are open, LiveReload was used.
		
		if(!window.localStorage) throw new Error("window.localStorage not available!");
		
		//if (!win.isDevToolsOpen()) {
			winState = window.localStorage.windowState ? JSON.parse(window.localStorage.windowState) : null;

			if (winState) {
				currWinMode = winState.mode;
				if (currWinMode === 'maximized') {
					win.maximize();
				} else {
					restoreWindowState();
				}
			} else {
				currWinMode = 'normal';
				dumpWindowState();
			}

			win.show();
		//}
	}
	
	function dumpWindowState() {
		if (!winState) {
			winState = {};
		}

		// we don't want to save minimized state, only maximized or normal
		if (currWinMode === 'maximized') {
			winState.mode = 'maximized';
		} else {
			winState.mode = 'normal';
		}

		// when window is maximized you want to preserve normal
		// window dimensions to restore them later (even between sessions)
		if (currWinMode === 'normal') {
			winState.x = win.x;
			winState.y = win.y;
			winState.width = win.width;
			winState.height = win.height;

			// save delta only of it is not zero
			if (deltaHeight !== 'disabled' && deltaHeight !== 0 && currWinMode !== 'maximized') {
				winState.deltaHeight = deltaHeight;
			}
		}
		
		checkWindowSate();
	}

	function checkWindowSate() {
		if(winState.x < 0 || winState.y < 0) throw new Error("Windows state error: " + JSON.stringify(winState));

		if(winState.width < 100 || winState.height < 100) throw new Error("Windows state width/height too low: " + JSON.stringify(winState));
		
	}
	
	function restoreWindowState() {
		
		try {
			checkWindowSate();
		}
		catch(e) {
			console.warn("The window state was reset from " + JSON.stringify(winState));
			
			winState.x = 0;
			winState.y = 0;
			winState.width = 800;
			winState.height = 600;
			
		}
		
		// deltaHeight already saved, so just restore it and adjust window height
		if (deltaHeight !== 'disabled' && typeof winState.deltaHeight !== 'undefined') {
			deltaHeight = winState.deltaHeight
			winState.height = winState.height - deltaHeight
		}
		
		console.log("winState=" + JSON.stringify(winState));
		
		win.resizeTo(winState.width, winState.height);
		win.moveTo(winState.x, winState.y);
		EDITOR.resizeNeeded();
	}

	function saveWindowState() {
		dumpWindowState();
		if(winState) window.localStorage.windowState = JSON.stringify(winState);
	}

	win.on('maximize', function () {
		isMaximizationEvent = true;
		currWinMode = 'maximized';
	});

	win.on('unmaximize', function () {
		currWinMode = 'normal';
		restoreWindowState();
	});

	win.on('minimize', function () {
		currWinMode = 'minimized';
	});

	win.on('restore', function () {
		currWinMode = 'normal';
	});

	win.window.addEventListener('resize', function () {
		// resize event is fired many times on one resize action,
		// this hack with setTiemout forces it to fire only once
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(function () {

			// on MacOS you can resize maximized window, so it's no longer maximized
			if (isMaximizationEvent) {
				// first resize after maximization event should be ignored
				isMaximizationEvent = false;
			} else {
				if (currWinMode === 'maximized') {
					currWinMode = 'normal';
				}
			}

			// there is no deltaHeight yet, calculate it and adjust window size
			if (deltaHeight !== 'disabled' && deltaHeight === false) {
				deltaHeight = win.height - winState.height;

				// set correct size
				if (deltaHeight !== 0) {
					win.resizeTo(winState.width, win.height - deltaHeight);
					EDITOR.resizeNeeded();
				}
			}

			dumpWindowState();

		}, 500);
	}, false);

	
	// Use editor events!
	
	EDITOR.on("exit", winstateOnClose);
	
	EDITOR.on("start", initWindowState);
	
	function winstateOnClose() {
		try {
			saveWindowState();
			return true;
		} catch(err) {
			console.warn("winstateError: " + err);
			return false; // False means: Do not close
		}
    }
    
})();