/*
	Performs end-to-end and performance tests on running instance

	Add to crontab or make a Upstart/systemD config (run on another server)

*/

//console.log(process.env);

var module_puppeteer = require('puppeteer');
var module_fs = require("fs");
var module_path = require("path");
var module_nodemailer = require('nodemailer');
var module_smtpTransport = require('nodemailer-smtp-transport');

var WEBIDE_URL = process.env.WEBIDE_URL || "https://webide.se/";
var DEBUG = process.env.hasOwnProperty("DEBUG") ? process.env.DEBUG : true;
var SMTP_PORT = process.env.SMTP_PORT || 255;
var SMTP_HOST = process.env.SMTP_HOST || "zetafiles.org";
var SMTP_USER = process.env.SMTP_USER;
var SMTP_PW = process.env.SMTP_PW;
var ADMIN_EMAIL = process.env.ADMIN_EMAIL || "zeta@zetafiles.org";
var MAIL_SENDER = process.env.MAIL_SENDER || "healthcheck@webide.se";

var log = console.log;

if( process.env.TLD=="webide.se" ) {
	var SCREENSHOT_FOLDER = process.env.HOME + "wwwpub/pup/";
}
else {
	var SCREENSHOT_FOLDER = process.env.SCREENSHOT_FOLDER || (process.cwd() + "/screenshots/");
}

var shreenshotCounter = 0;

check().then(success).catch(fail);

async function success() {
	console.log("success!");
	
	if(DEBUG) {
		var msg = "Healtcheck completed";
		console.log("Waiting for sendMail...");
		await sendMail(MAIL_SENDER, ADMIN_EMAIL, "Healthcheck completed: " + WEBIDE_URL, msg); // from, to, subject, text
		console.log("sendMail completed!");
	}

	// sendMail resolves too early!! so wait for graceful exit. eg. don't call process.exit here
}

async function fail(err) {
	console.log("fail!");
	console.error(err);

	var msg = err.stack || ("typeof err=" + typeof err + " err=" + err);

	await sendMail(MAIL_SENDER, ADMIN_EMAIL, "Healthcheck error: " + WEBIDE_URL + " " + msg.split("\n")[0].slice(0, 100), msg); // from, to, subject, text

	// sendMail resolves too early!! So we need to wait. But if we don't exit we might be stuck here forever waiting for some Promise...
	setTimeout(function() {
		process.exit(1);
	}, 3000);

}


async function clearScreenshots() {
	var fs = module_fs.promises;
	
	for (const file of await fs.readdir(SCREENSHOT_FOLDER)) {

		if(!file.match(/.png$/)) throw new Error(file + " is probably not a screenshot!"); // We don't want to accidentally clear a folder

		await fs.unlink(module_path.join(SCREENSHOT_FOLDER, file));
	}
}

async function check() {

	await clearScreenshots();

	const browser = await module_puppeteer.launch()
	const page = await browser.newPage()

	var interval = setInterval(function() { screenshot(page) }, 1000);

	var t = new Timer("Load page", 500);
	await page.goto(WEBIDE_URL);
	await t.stop();

	await screenshot(page);

	var t = new Timer("Login", 1000);
	await page.type('#username', 'demo');
	await page.type('#password', 'demo');
	await page.click('#loginButton');
	await page.waitForSelector("#windowMenu");
	await page.waitForSelector("#dashboard .smallGraph .graph"); // CPU graph
	await t.stop();

	//throw new Error("test error");

	await screenshot(page);

	var t = new Timer("Open file widget", 100);
	await page.keyboard.down('Control');
	await page.keyboard.press('O');
	await page.keyboard.up('Control');
	await page.waitForSelector("#inputGoto");
	await t.stop();

	await screenshot(page);

	await page.type('#inputGoto', 'welcome.htm');

	var t = new Timer("Open file");
	await page.waitForSelector("#gotoList li");
	await page.keyboard.press('Enter');
	await page.waitForSelector("#tab_folder_list_wwwpub");
	await t.stop();

	clearInterval(interval);

	await screenshot(page);

	await browser.close();
	
}

async function screenshot(page) {
	return page.screenshot({path: SCREENSHOT_FOLDER + "s" + (++shreenshotCounter) + ".png"});
}


function Timer(name, max) {
	this.name = name;
	this.start = new Date();
	this.end = new Date();
	this.max = max || 10000;
}

Timer.prototype.stop = async function stop_timer() {
	this.end = new Date();
	this.diff = this.end - this.start;
	if(this.diff > this.max) await this.report();
	else if(DEBUG) {
		console.log(this.name + ": " + this.diff + "ms");
	}
}

Timer.prototype.report = function() {
	console.warn(this.name + " " + this.diff + " > " + this.max);
	var msg = this.name + " took " + this.diff + "ms. Max is " + this.max + "ms"
	return sendMail(MAIL_SENDER, ADMIN_EMAIL, "Performance alert: " + WEBIDE_URL + " " + msg.split("\n")[0].slice(0, 100), msg); // from, to, subject, text
}

async function sendMail(from, to, subject, text) {

	log( "Sending mail from=" + from + " to=" + to + " subject=" + subject + " text.length=" + text.length + "" );

	var mailSettings = {
		port: SMTP_PORT,
		host: SMTP_HOST
	};

	if(SMTP_USER) mailSettings.auth = {user: SMTP_USER, pass: SMTP_PW};

	if(!module_nodemailer) return log("Module nodemailer not loaded!");
	if(!module_smtpTransport) return log("Module smtpTransport not loaded!");

	var transporter = module_nodemailer.createTransport(module_smtpTransport(mailSettings));

	var screenshots = module_fs.readdirSync(SCREENSHOT_FOLDER);

	console.log("screenshots=" + JSON.stringify(screenshots));

	screenshots = screenshots.map(function (filePath) {
		return {path: module_path.join(SCREENSHOT_FOLDER, filePath)};
	});

	console.log("screenshots=" + JSON.stringify(screenshots));

	await transporter.sendMail({
		from: from,
		to: to,
		subject: subject,
		text: text,
		attachments: screenshots

	}, function(err, info) {
		if(err) {
			//if(err.message.match(/Hostname\/IP doesn't match certificate's altnames: "IP: (192\.168\.0\.1)|(127\.0\.0\.1) is not in the cert's list/)) {
			console.error(err);
			console.log("Unable to send e-mail (" + subject + "): " + err.message);
			//}
			//else throw new Error(err);
		}
		else {
			log("Mail sent: " + info.response);
		}
	});

}


