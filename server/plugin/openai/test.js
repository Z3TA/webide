
var API = require("./chatgpt_completion.js");

var user = {
	name: "Johan",
	send: function(msg) {
		console.log("user.send: " + JSON.stringify(msg, null, 2));
	}
};

var json = {
	msg: "// hello world"
};

API.complete(user, json, function(err, resp) {

	if(err) console.log("Error: " + err.message);

	if(resp) console.log("resp: " + JSON.stringify(resp, null, 2));

});
