(function() {
	
	var SOCKJS_OPEN = 1;
	var CHARCODE_ENTER = 13;
	var MIN_PW_LENGTH = 5;
	var MIN_USERNAME_LENGTH = 3;
	
	
	
	window.addEventListener("load", signup, false);
	
	function signup() {
		
		var host = window.location.hostname;
		
		if(host == "127.0.0.1") {
			var signupUrl1 = "http://127.0.0.1:8100/signup"; // For development
		}
		else {
			var port = window.location.port ? ":" + window.location.port : "";
			var signupUrl1 = window.location.protocol + "//" + host + port + "/signup";
			var signupUrl2 = window.location.protocol + "//signup." + host + port + "/signup";
		}
		
		var connection;
		var connectedSuccessful = false;
		var connectionTries = 0;
		var inputUsername = document.getElementById("username");
		var inputPassword = document.getElementById("password");
		var inputPassword2 = document.getElementById("password2");
		var createButton = document.getElementById("createButton");
		var usernameAlertDiv = document.getElementById("usernameAlert");
		var pwAlertDiv = document.getElementById("pwAlert");
		var generalAlertDiv = document.getElementById("generalAlert");
		var typingTimer;
		var generalAlertMessages = [];
		
			generalAlertDiv.style.display = "none";
			usernameAlertDiv.style.display = "none";
			pwAlertDiv.style.display = "none";
			
			inputUsername.addEventListener("keyup", inputUserNameKeyUp);
			inputPassword.addEventListener("keyup", inputPasswordKeyUp);
			inputPassword2.addEventListener("keyup", inputPasswordKeyUp);
			createButton.addEventListener("click", createButtonClick);
			
			var sockJsReservedQuirk = '';
			var sockJsOptions = {debug: true};
			
			connect(signupUrl1);
			
			function connect(signupUrl) {
				connectionTries++;
				console.log("Connecting to " + signupUrl);
				connection = new SockJS(signupUrl, sockJsReservedQuirk, sockJsOptions);
				connection.onopen = function serverConnected() {
					console.log("Connected to signup service!");
					connectedSuccessful = true;
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
					var url = location.protocol + "://" + arr[2] + "/";
					console.log("Navigating to url=" + url + " location.protocol=" + location.protocol);
					document.location = url;
					}
					else {
						throw new Error("Unknown message from signup service: " + msg);
					}
				};
				
				connection.onclose = function serverDisconnected() {
					console.log("Connection to signup service Closed!");
					if(!connectedSuccessful && connectionTries < 2 && signupUrl2) {
						connect(signupUrl2);
					}
					else {
						if(connectedSuccessful) alertGeneralMessage("Connection to signup service closed!");
						else alertGeneralMessage("Unable to connect to signup service!");
					}
				};
			}
			
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
			inputPassword.value.length >= MIN_PW_LENGTH &&
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
				var newMessage = document.createElement("p");
			newMessage.innerText = msg;
			generalAlertDiv.appendChild(newMessage);
			generalAlertDiv.style.display = "block";
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
