(function() {
	
	var SOCKJS_OPEN = 1;
	var SIGNUP_URL = "https://signup.webide.se/signup";
	var CHARCODE_ENTER = 13;
	var MIN_PW_LENGTH = 5;
	var MIN_USERNAME_LENGTH = 3;
	
	if(window.location.hostname == "127.0.0.1") SIGNUP_URL = "http://127.0.0.1:8100/signup"; // For development
	
	window.addEventListener("load", signup, false);
	
	function signup() {
		var inputUsername = document.getElementById("username");
		var inputPassword = document.getElementById("password");
		var inputPassword2 = document.getElementById("password2");
		var createButton = document.getElementById("createButton");
		var usernameAlertDiv = document.getElementById("usernameAlert");
		var pwAlertDiv = document.getElementById("pwAlert");
		var generalAlertDiv = document.getElementById("generalAlert");
		var typingTimer;
		
		generalAlertDiv.style.display = "none";
		usernameAlertDiv.style.display = "none";
		pwAlertDiv.style.display = "none";
		
		inputUsername.addEventListener("keyup", inputUserNameKeyUp);
		inputPassword.addEventListener("keyup", inputPasswordKeyUp);
		inputPassword2.addEventListener("keyup", inputPasswordKeyUp);
		createButton.addEventListener("click", createButtonClick);
		
		var sockJsReservedQuirk = '';
		var sockJsOptions = {debug: true};
		connection = new SockJS(SIGNUP_URL, sockJsReservedQuirk, sockJsOptions);
		connection.onopen = function serverConnected() {
			console.log("Connected to signup service!");
		};
		
		connection.onmessage = function serverMessage(e) {
			var msg = e.data;
			
			console.log("Message from signup service: " + msg);
			
			var arr = msg.split(":");
			var code = arr[0];
			
			generalAlertDiv.style.display = "none";
			usernameAlertDiv.style.display = "none";
			pwAlertDiv.style.display = "none";
			
			if(code == "availableError") alertUsername("Problem checking if username " + arr[1] + " is available: " + arr[2]);
			else if(code == "available") {
				if(arr[2]=="false") alertUsername("Username " + arr[1] + " is " + (arr[2]=="true" ? "" : "not") + " available!");
			}
			else if(code == "createError") alertGeneralMessage("Unable to create user " + arr[1] + " on " + arr[2] + ": " + arr[3]);
			else if(code == "serviceError") alertGeneralMessage(arr[1]);
			else if(code == "created") {
				alertGeneralMessage("Successfully created user " + arr[1]);
				document.location = location.protocol + "://" + arr[2] + "/";
			}
			else {
				throw new Error("Unknown message from signup service: " + msg);
			}
		};
		
		connection.onclose = function serverDisconnected() {
			console.log("Connection to signup service Closed!");
			
		};
		
		
		function inputUserNameKeyUp(keyUpEvent) {
			var charCode = keyUpEvent.charCode || keyUpEvent.keyCode;
			
			console.log("charCode=" + charCode);
			
			var username = inputUsername.value;
			
			var urlUser = document.getElementById("urlUser");
			urlUser.innerText = username;
			
			usernameAlertDiv.style.display="none";
			
			if(username.length < MIN_USERNAME_LENGTH) return alertUsername("Username needs to be at least " + MIN_USERNAME_LENGTH + " characters!");
			
			clearTimeout(typingTimer);
			typingTimer = setTimeout(function() {
				checkNameAvailability(inputUsername.value);
			}, 500);
			
			if(charCode == CHARCODE_ENTER && inputPassword.value.length >= MIN_PW_LENGTH) createAccount(inputUsername.value, inputPassword.value);
		}
		
		function inputPasswordKeyUp(keyUpEvent) {
			var charCode = keyUpEvent.charCode || keyUpEvent.keyCode;
			var password = inputPassword.value;
			var password2 = inputPassword2.value;
			
			pwAlertDiv.style.display = "none";
			
			if(password.length < MIN_PW_LENGTH) alertPassword("The password needs to be at least " + MIN_PW_LENGTH + " characters!");
			else if(!password.match(/[^a-zA-Z]/)) alertPassword("It's a good idea to have special characters in the password!");
			else if(password != password2 && password2) alertPassword("The repeated password is not the same!");
			
			if(charCode == CHARCODE_ENTER && 
			inputUsername.value.length >= MIN_USERNAME_LENGTH &&
			password == password2) createAccount(inputUsername.value, inputPassword.value);
			
		}
		
		
		function createButtonClick() {
			var username = inputUsername.value;
			var password = inputPassword.value;
			var password2 = inputPassword2.value;
			
			if(password != password2) return alertPassword("The repeated password is not the same!");;
			
			createAccount(username, password);
		}
		
		function checkNameAvailability(username) {
			if(username.match(/[^a-zA-Z0-9]/)) {
				alertBox("Username can only contain latin characters a-z, A-Z and numbers 0-9");
			}
			else connSend("usernameAvailable:" + username);
		}
		
		function createAccount(username, password) {
			alertGeneralMessage("Creating user " + username + ". Please wait ...");
			connSend("createAccount:" + username + "," + password);
		}
		
		function alertGeneralMessage(msg) {
			generalAlertDiv.innerText = msg;
			generalAlertDiv.style.display = "inline";
		}
		
		function alertUsername(msg) {
			usernameAlertDiv.innerText = msg;
			usernameAlertDiv.style.display = "inline";
		}
		
		function alertPassword(msg) {
			pwAlertDiv.innerText = msg;
			pwAlertDiv.style.display = "inline";
		}
		
		function connSend(msg, callback) {
			
			if(connection.readyState==SOCKJS_OPEN) {
				connection.send(msg);
				if(callback) callback(null);
			}
			else {
				var err = new Error("Not connected to signup service!");
				err.code = "CONNECTION_CLOSED";
				if(callback) callback(err);
				else {
					alertGeneralMessage("Lost connection or not connected to signup service!");
					throw err;
				}
			}
			
		}
		
	}
})();
