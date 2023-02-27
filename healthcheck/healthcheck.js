/*
	Performs a bunch of end-to-end and performance tests on running instance

	remove screenshot

	when failing, send all screenshots

*/

//console.log(process.env);

var puppeteer = require('puppeteer');
var webideUrl = "https://webide.se/"; // Change to the URL of your cloudIDE
var c = 0;
var DEBUG = true;
var log = console.log;

check().then(success).catch(fail);

function success() {
	console.log("success!");
}

function fail(err) {
	console.log("fail!");
	console.error(err);
	process.exit();
}

async function check() {

	const browser = await puppeteer.launch()
	const page = await browser.newPage()

	setInterval(function() { screenshot(page) }, 1000);

	var t = new Timer("Load page", 500);
	await page.goto(webideUrl);
	t.stop();

	await screenshot(page);

	var t = new Timer("Login", 1000);
	await page.type('#username', 'demo');
	await page.type('#password', 'demo');
	await page.click('#loginButton');
	await page.waitForSelector("#windowMenu");
	await page.waitForSelector("#dashboard .smallGraph .graph"); // CPU graph
	t.stop();

	await screenshot(page);

	var t = new Timer("Open file widget", 100);
	await page.keyboard.down('Control');
	await page.keyboard.press('O');
	await page.keyboard.up('Control');
	await page.waitForSelector("#inputGoto");
	t.stop();

	await screenshot(page);

	await page.type('#inputGoto', 'welcome.htm');

	var t = new Timer("Open file");
	await page.waitForSelector("#gotoList li");
	await page.keyboard.press('Enter');
	await page.waitForSelector("#tab_folder_list_wwwpub");
	t.stop();


	await screenshot(page);



	await browser.close();
}

async function screenshot(page) {
	return page.screenshot({path: process.env.HOME + "wwwpub/pup/s" + (++c) + ".png"});
}


function Timer(name, max) {
	this.name = name;
	this.start = new Date();
	this.end = new Date();
	this.max = max || 10000;
}

Timer.prototype.stop = function() {
	this.end = new Date();
	this.diff = this.end - this.start;
	if(this.diff > this.max) this.report();
	else if(DEBUG) {
		console.log(this.name + ": " + this.diff + "ms");
	}
}

Timer.prototype.report = function() {
	console.warn(this.name + " " + this.diff + " > " + this.max);

	sendMail("webide@" + HOSTNAME, ADMIN_EMAIL, "Server error: " + msg.split("\n")[0].slice(0, 100), msg); // from, to, subject, text
}

function sendMail(from, to, subject, text) {

	log( "Sending mail from=" + from + " to=" + to + " subject=" + subject + " text.length=" + text.length + "" );

	var mailSettings = {
		port: SMTP_PORT,
		host: SMTP_HOST
	};

	if(SMTP_USER) mailSettings.auth = {user: SMTP_USER, pass: SMTP_PW};

	if(!module_nodemailer) return log("Module nodemailer not loaded!");
	if(!module_smtpTransport) return log("Module smtpTransport not loaded!");

	var transporter = module_nodemailer.createTransport(module_smtpTransport(mailSettings));

	transporter.sendMail({
		from: from,
		to: to,
		subject: subject,
		text: text

	}, function(err, info){
		if(err) {
			//if(err.message.match(/Hostname\/IP doesn't match certificate's altnames: "IP: (192\.168\.0\.1)|(127\.0\.0\.1) is not in the cert's list/)) {
			log("Unable to send e-mail (" + subject + "): " + err.message, WARN);
			//}
			//else throw new Error(err);
		}
		else {
			log("Mail sent: " + info.response);
		}
	});

}


