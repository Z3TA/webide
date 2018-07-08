/*
	
	Native: 
	google-drive-ocamlfuse -headless -id 987730033948-ahajn7bgtdfh09b719f9a30u9sma2n96.apps.googleusercontent.com -secret oz_hNXf2jtwqM3S7enuXST_j
	
	http://localhost:8080/google_oauth
	
	https://accounts.google.com/o/oauth2/auth?client_id=987730033948-rupie76gqs1f6ir3u45kg06isli8jnmt.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fgoogle_oauth&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&response_type=code&access_type=offline&approval_prompt=force
	
	
	
	Web: 
	google-drive-ocamlfuse -headless -id 987730033948-rupie76gqs1f6ir3u45kg06isli8jnmt.apps.googleusercontent.com -secret BBYwT9Fjvvm_yG42-zzayKaM
	
	4/AAAE8Vbt2BpzvX5gh3sR81xqHmpkKYRb3uE4RDfB3E-Fy_pF5imXKolmvpJI_GWpt2ldn67TNXi3cISJW8hQQzA
*/

var webClient = '987730033948-rupie76gqs1f6ir3u45kg06isli8jnmt.apps.googleusercontent.com';
var nativeClient = "987730033948-ahajn7bgtdfh09b719f9a30u9sma2n96.apps.googleusercontent.com";


// Google API Client ID and API key from the Developer Console
var CLIENT_ID = webClient;
var API_KEY = 'AIzaSyC-zAO6nFL16iwBaLy0o5suVKsA-58CsyM';
// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
//var SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly'; // List files
var SCOPES = 'https://www.googleapis.com/auth/drive';

var menuItem;

EDITOR.plugin({
	desc: "Mount Google Drive",
	load: function() {
		menuItem = EDITOR.addMenuItem("Google Drive", googleDriveInit);

},
	unload: function() {
EDITOR.removeMenuItem(menuItem);
}
});

function googleDriveInit() {
	if(typeof gapi == "undefined") {
		EDITOR.loadScript("https://apis.google.com/js/client:platform.js", true, function() {
			if(typeof gapi == "undefined") return alertBox("Failed to load Google Drive api libraries!");
			auth();
		});
}
	else auth();
}

function auth() {
	gapi.load('auth2', function() {
		auth2 = gapi.auth2.init({
			apiKey: API_KEY,
			clientId: CLIENT_ID,
			scope: SCOPES,
			redirectUri: "urn:ietf:wg:oauth:2.0:oob"
		}).then(function () {
			
			var ga = gapi.auth2.getAuthInstance();
			
			ga.grantOfflineAccess().then(signInCallback);
			
		});
	});
}

function signInCallback(authResult) {
	console.log("authResult=", authResult);
	console.log("code=", authResult.code);
	
	
}



