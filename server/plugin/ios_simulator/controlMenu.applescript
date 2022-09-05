menuItemClick("Simulator", ['View', 'Theme', 'Dark'])

function menuItemClick(strAppName, lstMenuPath) {
	var oApp = Application(strAppName),
	lngChain = lstMenuPath.length,
	blnResult = false;

	if (lngChain > 1) {

		var appSE = Application("System Events"),
		lstApps = appSE.processes.where({
			name: strAppName
		}),
		procApp = lstApps.length ? lstApps[0] : null;

		if (procApp) {
			oApp.activate();
			var strMenu = lstMenuPath[0],
			fnMenu = procApp.menuBars[0].menus.byName(strMenu),
			lngLast = lngChain - 1;

			for (var i = 1; i < lngLast; i++) {
				strMenu = lstMenuPath[i];
				fnMenu = fnMenu.menuItems[strMenu].menus[strMenu];
			}


			fnMenu.menuItems[
				lstMenuPath[lngLast]
			].click();
			blnResult = true;
		}
	}
	return blnResult;
}

