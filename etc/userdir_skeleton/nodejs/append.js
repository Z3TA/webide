
console.log('Attempting to append "data" to message.txt ...');

var fs = require("fs");

fs.appendFile('message.txt', 'data to append', function dataAppended(err) {
	if (err) throw err;
	console.log('The "data to append" was appended to message.txt!');
});
