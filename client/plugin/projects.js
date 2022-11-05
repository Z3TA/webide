/*
	Make it easy to switch between projects/sessions

	Feel free to add to this plugin, like loading enviroments

*/
(function() {
	"use strict";

	var projectMenu;

	var menuItems = [];

	var projectsMenuOrder = 1;

	var settingsName = "settings";
	var currentProject; // points to an object inside the projectSettings object
	var projectSettings;

	var saveCurrentProjectMenuItem, renameCurrenctProjectMenuItem;

	var defaultProjectSettings = {
		currentProjectName: undefined // Avoid pointers in order to make the settings serializable 
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

			var saveCurrentProjectMenuItem = EDITOR.windowMenu.add("Save current session", [S("File"), S("Project/session"), 100, 10], function() {
				EDITOR.windowMenu.hide();
				saveCurrentProject();
			});

			var renameCurrenctProjectMenuItem = EDITOR.windowMenu.add("Rename current session", [S("File"), S("Project/session"), 100, 20], function() {
				EDITOR.windowMenu.hide();
				renameCurrentProject();
			}, true);

		},
		unload: function unloadProjects() {

			EDITOR.windowMenu.remove(saveCurrentProjectMenuItem);
			EDITOR.windowMenu.remove(renameCurrenctProjectMenuItem);

			for (var i=0; i<menuItems.length; i++) {
				EDITOR.windowMenu.remove(menuItems[i]);
			}

			menuItems.length = 0;

		}
	});

	function saveProject(project, callback) {

		if(project) saveData(project);
		else {
			// Add new project
			promptBox("Save current session/project ?\nName of the project:", function(name) {
				if(name == undefined) return;

				projectSettings.projects.push({
					name: name
				});

				saveData(projectSettings.projects[projectSettings.projects.length-1]);

			});
		}

		function saveData(project) {

			project.workingDir = EDITOR.workingDirectory;
			project.openFiles = Object.keys(EDITOR.files);

			EDITOR.saveSettings(settingsName, projectSettings);

			if(callback) callback(null);

		}

	}

	function renameCurrentProject() {
		if(currentProject == undefined) return saveProject();

		var promptBox("Rename the current session/project:", {defaultValue: currentProject.name, selectAll: true}, function(name) {
			if(name == undefined) return;

			currentProject.name = name;
			projectSettings.currentProjectname = name;

			EDITOR.saveSettings(settingsName, projectSettings);
		});
	}

	function loadedProjectSettings(settings) {
		projectSettings = settings;

		for (var i=0, name=""; i<projectSettings.projects.length; i++) {
			name = projectSettings.projects[i].name;
			
			if( projectSettings.currentProjectName == name ) {
				switchToProject(projectSettings.projects[i], false);
			}

			menuItems.push(EDITOR.windowMenu.add(name, [S("File"), S("Project/session"), 100, 300 + ++projectsMenuOrder], function() {
				EDITOR.windowMenu.hide();
				switchToProject(projectSettings.projects[name]);
			}));
		}
	}

	function switchToProject(project, askToSaveCurrent) {
		if(askToSaveCurrent == undefined) askToSaveCurrent = true;

		if(project == currentProject) return;

		if(currentProject == undefined && EDITOR.currentFile && askToSaveCurrent) {
			return saveProject(undefined, switchProject);
		}

		function switchProject() {

			// Close currently opened files
			for(var path in EDITOR.files) {
				EDITOR.closeFile(path);
			}

			// Open the files that was open when the session last saved
			for (var i=0; i<project.openFiles.length; i++) {
				EDITOR.openFile(project.openFiles[i].path);
			}

			projectSettings.currentProjectName = project.name;
			EDITOR.saveSettings(settingsName, projectSettings);

			currentProject = project;
		}


	}

	



})();
