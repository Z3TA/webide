/*
	Updates the semver file
	Run this script for each new release
*/

var done = false;

process.on("exit", function () {
	console.log("Semver tool exit: done=" + done);
	var exitCode = 0;
	if(!done) exitCode = 1;
	process.exit(exitCode);
});

var fs = require("fs");
fs.readFile("SEMVER", "utf8", function(err, data) {
	if(err) throw err;
	
	var semver = data.split(".");
	for (var i=0; i<semver.length; i++) {
		semver[i] = parseInt(semver[i]);
	}
	
	ask("Have the EDITOR/File/server API's got Major or Minor updates since last release ? ", undefined, function(err, answer) {
		if(answer.match(/maj|br/i)) {
			semver[0]++;
			semver[1] = 0;
			semver[2] = 0;
		}
		else if(answer.match(/min|fe/i)) {
			semver[1]++;
			semver[2] = 0;
		}
		else {
			semver[2]++;
		}
		
		var semverString = semver.join(".");
		
		ask("Update semver from " + data + " to " + semverString + " ? ", ["y", "n"], function(err, answer) {
			if(answer == "y") {
				fs.writeFile("SEMVER", semverString, function(err) {
					console.log("Semver updated from " + data + " to " + semverString);
					done = true;
					process.exit(0);
				});
			}
			else process.exit(1);
		});
	});
});

function ask(question, answers, callback) {
	var readline = require('readline');
	var rl = readline.createInterface(process.stdin, process.stdout);
	
	var questionString = question.trim();
	if(answers) questionString += " " + JSON.stringify(answers) + " ";
	else questionString += " ";
	
	rl.question(questionString, function(answer) {
		if(answers) {
			var gotAnswer;
			
			for (var i=0; i<answers.length; i++) {
				if(answer.match(new RegExp(answers[i], "i"))) {
					gotAnswer = answers[i];
					break;
				}
			}
			if(!gotAnswer) {
				for (var i=0; i<answers.length; i++) {
					if( answer.slice(0,1).toLowerCase() == answers[i].slice(0,1).toLowerCase() ) {
						gotAnswer = answers[i];
						break;
					}
				}
			}
		}
		
		callback(null, gotAnswer || answer);
	});
	
}