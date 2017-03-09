(function() {
	
	"use strict";
	
	var key_T = 84;
	
	EDITOR.bindKey({desc: "Test simulation of key strokes", charCode: key_T, combo: CTRL, fun: simulateKeys});
	
	function simulateKeys() {
		
		Podium.keydown(65);
		
		console.log("keypress simulated");
		
		return false;
	}
	
	
	var Podium = {};
	Podium.keydown = function(k) {
		var oEvent = document.createEvent('KeyboardEvent');
		
		// Chromium Hack
		Object.defineProperty(oEvent, 'keyCode', {
			get : function() {
				return this.keyCodeVal;
			}
		});
		Object.defineProperty(oEvent, 'which', {
			get : function() {
				return this.keyCodeVal;
			}
		});
		
		if (oEvent.initKeyboardEvent) {
			oEvent.initKeyboardEvent("keydown", true, true, document.defaultView, false, false, false, false, k, k);
		} else {
			oEvent.initKeyEvent("keydown", true, true, document.defaultView, false, false, false, false, k, 0);
		}
		
		oEvent.keyCodeVal = k;
		
		if (oEvent.keyCode !== k) {
			alert("keyCode mismatch " + oEvent.keyCode + "(" + oEvent.which + ")");
		}
		
		document.dispatchEvent(oEvent);
	}
	
	
	
	function __triggerKeyboardEvent(el, keyCode)
	{
		var eventObj = document.createEventObject ?
		document.createEventObject() : document.createEvent("Events");
		
		if(eventObj.initEvent){
			eventObj.initEvent("keydown", true, true);
		}
		
		eventObj.keyCode = keyCode;
		eventObj.which = keyCode;
		
		el.dispatchEvent ? el.dispatchEvent(eventObj) : el.fireEvent("onkeydown", eventObj);
		
	}
	
	
	
	function triggerKeyboardEvent(el, keyCode) {
		var keyboardEvent = document.createEvent("KeyboardEvent");
		
		var initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
		
		
		keyboardEvent[initMethod](
		"keydown",
		true,      // bubbles oOooOOo0
		true,      // cancelable
		window,    // view
		false,     // ctrlKeyArg
		false,     // altKeyArg
		false,     // shiftKeyArg
		false,     // metaKeyArg
		keyCode,
		0          // charCode
		);
		
		el.dispatchEvent(keyboardEvent);
	}
	
	
	
})();