/*
	
	Note the callback can only have two arguments: Error and Response,
	multiple arguments need to be put into an object! eg: foo(  (a, b, c) => callback(null, {a,b,c})  )
	
	
	
*/


try {
var module_mysql = require("mysql2");
}
catch(err) {
	console.log(err.message);
}

var module_os = require("os");
var module_fs = require("fs");
var currentDb = "information_schema";
var connection;

try {
	var info = module_os.userInfo ? module_os.userInfo() : {username: "ROOT", uid: process.geteuid()};
}
catch(err) {
}

var env = process.env;

if(!module_mysql) {
	var MYSQL = {
		query: moduleDoesntExist,
		databases: moduleDoesntExist
	}
}
else {
	
	var MYSQL = {
		query: function mysqlQuery(user, json, callback) {
		
		var dbName = json.database;
		
		if(dbName == undefined) return callback(new Error("No database specified!"));
		
		connect(user.name, dbName, function runQuery(err) {
			if(err) return callback(err);
			
			connection.query(json.query, function(err, results, fields) {
				if(err) {
					console.log("MYSQL: query failed: " + json.query + "\nError: " + err.message);
					return callback(err);
				}
				else {
					callback(null, {results: results, fields: fields});
				}
			});
		});
	},
	databases: function showMysqlDatabases(user, json, callback) {
		connect(user.name, currentDb, function runQuery(err) {
			if(err) return callback(err);
			
			connection.query(json.query, callback);
		});
	}
	
	
}
}


function connect(username, database, callback) {
	
	//console.log(JSON.stringify(connection, null, 2));
	
	//if(connection && database == currentDb && !connection._closing) return callback(null);
	
	var socket = "/sock/mysql";
	
	module_fs.stat(socket, function(err, stats) {
		if(err && err.code == "ENOENT") return callback(new Error("Can not find " + socket + ". MySQL is probably not installed on configured on this server. See mySQL section in README.txt for more info."));
		else if(err) throw err;
		
		console.log(JSON.stringify(stats, null, 2));
		
		console.log("stats.isSocket()=" + stats.isSocket());
		
		connection = module_mysql.createConnection({
			user: username,
			socketPath: socket,
			authSwitchHandler: true, // Need to be true:ish
			database: database || "information_schema"
		});
		
		var processUser = env.SUDO_USER ||	env.LOGNAME || env.USER || env.LNAME ||	env.USERNAME || info.username;
		
		console.log("connect: Connecting to mySQL database=" + database + " with username " + username + " running as " + processUser);
		
		currentDb = database;
		
		//connection.connect(callback);
		
		connection.connect(function(err) {
			if(err) {
				console.error(err);
				callback(err);
			}
			else {
				console.log("Connected to mysql database=" + database + "");
				callback(null);
			}
		});
		
	});
	
}

function moduleDoesntExist(user, json, callback) {
	var error = new Error("mysql2 module is not installed on the server!");
	error.code = "MODULE_MISSING";
	callback(error);
}


module.exports = MYSQL;



