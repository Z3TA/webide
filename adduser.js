#!/usr/bin/env node

var username = process.argv[2];
var groupName = "jzedit_users";

function getGroupId(groupName) {
	var fs = require("fs");
	
	var groupData = fs.readFileSync("/etc/group", "utf8");
		var groups = groupData.split(/\r|\n/);
		
		// format: jzedit_users:x:115:
		
		for (var i=0, group, name, id; i<groups.length; i++) {
			group = groups[i].split(":");
			name = group[0];
			id = group[2];
			
			if(name == groupName) return parseInt(id);
			}
		
		throw new Error("Unable to find id for groupName=" + groupName);
}





