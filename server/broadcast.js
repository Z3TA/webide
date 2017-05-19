//var Netmask = require("netmask").Netmask;



function getIpv4Ips() {
	var os = require('os');
	
	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (var k in interfaces) {
		for (var k2 in interfaces[k]) {
			var address = interfaces[k][k2];
			if (address.family === 'IPv4' && !address.internal) {
				addresses.push(address);
			}
		}
	}

	return addresses; // [{address, netmask, family, mac, internal} ...]
}

console.log(getIpv4Ips());

// Server (remember to change BROADCAST_ADDR to the correct broadcast address)

var ip = "192.168.1.69";
var subnetMask = "255.255.255.0";

var PORT = 6024;
var BROADCAST_ADDR = "192.168.1.255"; // (new Netmask(ip + "/" + subnetMask)).broadcast; // "192.168.1.255";

console.log("BROADCAST_ADDR=" + BROADCAST_ADDR);

var dgram = require('dgram');
var server = dgram.createSocket("udp4");

server.bind(function() {
	server.setBroadcast(true);
	setInterval(broadcastNew, 3000);
});

function broadcastNew() {
	var message = new Buffer("Broadcast message!");
	server.send(message, 0, message.length, PORT, BROADCAST_ADDR, function() {
		console.log("Sent '" + message + "'");
	});
}
	

// Client

var PORT = 6024;
var dgram = require('dgram');
var client = dgram.createSocket('udp4');

client.on('listening', function () {
var address = client.address();
console.log('UDP Client listening on ' + address.address + ":" + address.port);
client.setBroadcast(true);
});

client.on('message', function (message, rinfo) {
console.log('Message from: ' + rinfo.address + ':' + rinfo.port +' - ' + message);
});

client.bind(PORT);