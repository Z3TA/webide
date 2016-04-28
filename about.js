/*
	Hi!
	
	You are looking at a "native" text/code editor (that also runs in the browser)
	
	Available for Windows: http://webtigerteam.com/editor/release/jzedit-v1_beta-c424-windows-x64.zip
	and Linux: http://webtigerteam.com/editor/release/jzedit-v1_beta-c424-linux-x64.tar.gz
	
	Main Features:
*/

// Real time JavaScript static analysis ...
function Person(name) {
	this.name = name;
}
Person.prototype.greet() {
	console.log("Hello " + this.name + "!");
}

var myPerson = new Person("World");

// Auto completion
myPerson.gr

// Detects common errors 
if(myPerson.name = "Jon") 

// Stop wasting time indenting code and arguing about tabs vs spaces
var data = {
	people: [
		{name: "Jon", age: 35},
		{name: "Jane", age: 36}
	]
};

// Easy to write plugins and add functionality using JavaScript
editor.bindKey({charCode: 104, combo: CTRL, fun: 
	function timeReport(file) {
		var mysql = require('mysql'); // Supports NodeJS modules
		var connection = mysql.createConnection({database : 'timeReports'});
		connection.connect();
		connection.query('INSERT INTO files SET ?', {file: file.path, user: 'me'});
		connection.end();
	}
});


// The editor is asynchronous, and event based. Most events can be captured by: 
editor.on("fileParse", function myCallback(file) {
	alert("This file is a " + file.parsed.language + " file!")
});

