/*
	Make it easy to switch between projects/sessions

	Feel free to add to this plugin, like loading enviroments

*/

(function() {
	"use strict";

	var projectMenu;

	var menuItems = {}; // name: menuItem

	var projectsMenuOrder = 1;

	var settingsName = "settings";
	var currentProject; // points to an object inside the projectSettings object
	var projectSettings;

	var saveProjectMenuItem, renameProjectMenuItem;

	var defaultProjectSettings = {
		currentProjectName: undefined, // Avoid pointers in order to make the settings serializable 
		projects: [
			{
				name: "My web site (demo static site generator)",
				workingDir: "~/my_web_site/",
				openFiles: [
					{path: "~/my_web_site/source/index.htm", order: 100},
					{path: "~/my_web_site/source/about.htm", order: 200}
				]
			}
		]
	};

	EDITOR.plugin({
		desc: "Projects",
		load: function loadProjects() {
			EDITOR.loadSettings(settingsName, defaultProjectSettings, loadedProjectSettings);

			// label, where, whenClicked, separator, keyComboFunction

			var saveProjectMenuItem = EDITOR.windowMenu.add("Save current session", [S("File"), S("Project/session"), 100, 10], function() {
				EDITOR.windowMenu.hide();
				saveProject(currentProject);
			});

			var renameProjectMenuItem = EDITOR.windowMenu.add("Rename current session", [S("File"), S("Project/session"), 200, 20], function() {
				EDITOR.windowMenu.hide();
				renameProject();
			}, "bottom");

			console.log("projects:loadProjects!");
		},

		unload: function unloadProjects() {
			EDITOR.windowMenu.remove(saveProjectMenuItem);
			EDITOR.windowMenu.remove(renameProjectMenuItem);

			removeMenus();
		}
	});

	function saveAndUpdate() {
		removeMenus();
		addMenus();
		EDITOR.saveSettings(settingsName, projectSettings);
	}

	function removeMenus() {
		for (var projectName in menuItems) {
			console.log("projects:removeMenus: Removing menu for projectName=" + projectName);
			EDITOR.windowMenu.remove(menuItems[projectName]);
			delete menuItems[projectName];
		}
	}

	function addMenus() {
		projectSettings.projects.sort(function sortProjectByName(a, b) {
			if(a.name < b.name) { return -1; }
			if(a.name > b.name) { return 1; }
			return 0;
		});

		projectSettings.projects.forEach(addMenuItem);

		function addMenuItem(project) {
			console.warn("projects:addMenuItem: project=" + JSON.stringify(project, null, 2));
			menuItems[project.name] = EDITOR.windowMenu.add(project.name, [S("File"), S("Project/session"), 100, 300 + ++projectsMenuOrder], function(file, combo, character, charCode, direction, clickEvent) {
				
				console.log("projects:addMenuItem: Click on menu item! project=" + JSON.stringify(project, null, 2));
				EDITOR.windowMenu.hide();

				if(clickEvent.ctrlKey) var askToSaveCurrent = false;

				switchToProject(project, askToSaveCurrent);
			});
		}
	}

	function saveProject(project, callback) {
		if(project) saveData(project);
		else {
			// Add new project
			console.warn("projects: Ask to save current project...");
			promptBox("Save current session/project ?\nName of the project:", function(name) {
				if(name == undefined) {
					console.warn("projects:saveProject: Calling callback because name=" + name);
					if(callback) callback(null);
					callback = null;
					return;
				}

				projectSettings.projects.push({
					name: name
				});

				saveData(projectSettings.projects[projectSettings.projects.length-1]);
			});
		}

		function saveData(project) {
			project.workingDir = EDITOR.workingDirectory;

			project.openFiles.length = 0;
			for(var path in EDITOR.files) {
				if(!EDITOR.files[path].savedAs) continue;
				project.openFiles.push({
					path: path,
					order: EDITOR.files[path].order
				});
			}

			saveAndUpdate();
			
			console.warn("projects:saveProject:saveData Calling callback because we are done saving " + project && project.name);
			if(callback) callback(null);
			callback = null;
		}
	}

	function renameProject(project) {
		if(project == undefined) project = currentProject;

		if(currentProject == undefined) return saveProject();

		promptBox("Rename the current session/project:", {defaultValue: currentProject.name, selectAll: true}, function(name) {
			if(name == undefined) return;

			currentProject.name = name;
			projectSettings.currentProjectname = name;

			saveAndUpdate();
		});
	}

	function loadedProjectSettings(settings) {
		projectSettings = settings;

		console.log("projects:loadedProjectSettings: settings=" + JSON.stringify(settings, null, 2));

		for (var i=0, name=""; i<projectSettings.projects.length; i++) {
			name = projectSettings.projects[i].name;
			if( projectSettings.currentProjectName == name ) {
				switchToProject(projectSettings.projects[i], false);
				return; // Switching project will reload menus!
			}
		}

		addMenus();
	}

	function switchToProject(project, askToSaveCurrent) {
		if(project == undefined) throw new Error("projects:switchToProject: project=" + project);

		if(askToSaveCurrent == undefined) askToSaveCurrent = true;

		console.log("projects:switchToProject: project.name=" + (project && project.name) + " currentProject.name=" + (currentProject && currentProject.name) + " askToSaveCurrent=" + askToSaveCurrent + " projectSettings=" + JSON.stringify(projectSettings, null, 2));

		if(project == currentProject) {
			console.log("projects:switchToProject: Not switching because project == currentProject");
			return;
		}
		
		if(currentProject == undefined && EDITOR.currentFile && askToSaveCurrent) {
			return saveProject(undefined, switchProject);
		}
		else {
			switchProject();
		}

		function switchProject() {
			if(project == undefined) throw new Error("projects:switchToProject:switchProject: project=" + project);

			console.log("projects:switchToProject:switchProject: project.name=" + (project && project.name) + " currentProject.name=" + (currentProject && currentProject.name) + " askToSaveCurrent=" + askToSaveCurrent + " projectSettings=" + JSON.stringify(projectSettings, null, 2));

			// Close currently opened files
			for(var path in EDITOR.files) {
				EDITOR.closeFile(path);
			}

			project.openFiles.sort(function sortByOrder(a, b) {
				if(a.order < b.order) return -1;
				if(b.order > a.order) return 1;
				else return 0;
			});

			// Open the files that was open when the session last saved
			for (var i=0; i<project.openFiles.length; i++) {

				if(typeof project.openFiles[i] != "object") throw new Error("projects:switchToProject:switchProject: Wrong formatting in project=" + JSON.stringify(project) + " Each item in openFiles should be an object with path and order!");

				console.log("projects:switchToProject:switchProject: Opening file path=" + project.openFiles[i].path);
				EDITOR.openFile(project.openFiles[i].path);
			}

			projectSettings.currentProjectName = project.name;
			saveAndUpdate();

			if(!menuItems.hasOwnProperty(project.name)) throw new Error("projects:switchToProject:switchProject project.name=" + (project && project.name) + " does not exist in menuItems=" + Object.keys(menuItems));

			if(currentProject) menuItems[currentProject.name].deactivate();
			menuItems[project.name].activate();

			currentProject = project;
		}
	}

})();
