/*

	todo: Able to reset password!
	Store the email alias in a file that are not readable by normal users


*/
(function() {
	"use strict";

	var changePwMenu;
	var changePwWidget;

	EDITOR.plugin({
		desc: "Change backend password",
		load: function loadPassword() {
			changePwMenu = EDITOR.windowMenu.add("change password", [S("editor"), S("settings"), 200], changePassword);

		},
		unload: function unloadPassword() {
			EDITOR.windowMenu.remove(changePwMenu);
			changePwMenu = null;

		}
	});

	function changePassword() {
		promptBox("Your current password:", {isPassword: true}, function(oldPw) {
			promptBox("New password:", {isPassword: true}, function(newPw) {
				promptBox("Repeat the new password:", {isPassword: true}, function(newPwRepeat) {

					if(newPw != newPwRepeat) {
						return alertBox("The repeated new password did not match!");
					}

					CLIENT.cmd("changePassword", {old_password: oldPw, new_password: newPw}, function(err) {
						if(err) throw err;


						alertBox("Password successfully changed!");
						changePwMenu.hide();

					});

				});
			});
		});
	}


})();