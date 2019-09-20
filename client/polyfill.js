/*
	
	Make sure the client (browser) supports these ...
	
*/

if(typeof console == "undefined") console = {};
if(typeof console.log == "undefined") console.log = function() {};
if(typeof console.error == "undefined") console.error = function() {};

navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;

	if (!Array.isArray) {
	Array.isArray = function(arg) {
	return Object.prototype.toString.call(arg) === '[object Array]';
	};
	}

if (!Array.prototype.filter){
	Array.prototype.filter = function(func, thisArg) {
		'use strict';
		if ( ! ((typeof func === 'Function' || typeof func === 'function') && this) )
		throw new TypeError();
		
		var len = this.length >>> 0,
		res = new Array(len), // preallocate array
		t = this, c = 0, i = -1;
		if (thisArg === undefined){
			while (++i !== len){
				// checks to see if the key was set
				if (i in this){
					if (func(t[i], i, t)){
						res[c++] = t[i];
					}
				}
			}
		}
		else{
			while (++i !== len){
				// checks to see if the key was set
				if (i in this){
					if (func.call(thisArg, t[i], i, t)){
						res[c++] = t[i];
					}
				}
			}
		}
		
		res.length = c; // shrink down array to proper size
		return res;
	};
}

// Production steps of ECMA-262, Edition 5, 15.4.4.19
// Reference: http://es5.github.io/#x15.4.4.19
if (!Array.prototype.map) {
	
	Array.prototype.map = function(callback/*, thisArg*/) {
		
		var T, A, k;
		
		if (this == null) {
			throw new TypeError('this is null or not defined');
		}
		
		// 1. Let O be the result of calling ToObject passing the |this|
		//    value as the argument.
		var O = Object(this);
		
		// 2. Let lenValue be the result of calling the Get internal
		//    method of O with the argument "length".
		// 3. Let len be ToUint32(lenValue).
		var len = O.length >>> 0;
		
		// 4. If IsCallable(callback) is false, throw a TypeError exception.
		// See: http://es5.github.com/#x9.11
		if (typeof callback !== 'function') {
			throw new TypeError(callback + ' is not a function');
		}
		
		// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
		if (arguments.length > 1) {
			T = arguments[1];
		}
		
		// 6. Let A be a new array created as if by the expression new Array(len)
		//    where Array is the standard built-in constructor with that name and
		//    len is the value of len.
		A = new Array(len);
		
		// 7. Let k be 0
		k = 0;
		
		// 8. Repeat, while k < len
		while (k < len) {
			
			var kValue, mappedValue;
			
			// a. Let Pk be ToString(k).
			//   This is implicit for LHS operands of the in operator
			// b. Let kPresent be the result of calling the HasProperty internal
			//    method of O with argument Pk.
			//   This step can be combined with c
			// c. If kPresent is true, then
			if (k in O) {
				
				// i. Let kValue be the result of calling the Get internal
				//    method of O with argument Pk.
				kValue = O[k];
				
				// ii. Let mappedValue be the result of calling the Call internal
				//     method of callback with T as the this value and argument
				//     list containing kValue, k, and O.
				mappedValue = callback.call(T, kValue, k, O);
				
				// iii. Call the DefineOwnProperty internal method of A with arguments
				// Pk, Property Descriptor
				// { Value: mappedValue,
				//   Writable: true,
				//   Enumerable: true,
				//   Configurable: true },
				// and false.
				
				// In browsers that support Object.defineProperty, use the following:
				// Object.defineProperty(A, k, {
				//   value: mappedValue,
				//   writable: true,
				//   enumerable: true,
				//   configurable: true
				// });
				
				// For best browser support, use the following:
				A[k] = mappedValue;
			}
			// d. Increase k by 1.
			k++;
		}
		
		// 9. return A
		return A;
	};
}


if (!String.prototype.repeat) {
	String.prototype.repeat = function(count) {
		'use strict';
		if (this == null) {
			throw new TypeError('can\'t convert ' + this + ' to object');
		}
		var str = '' + this;
		// To convert string to integer.
		count = +count;
		if (count != count) {
			count = 0;
		}
		if (count < 0) {
			throw new RangeError('repeat count must be non-negative');
		}
		if (count == Infinity) {
			throw new RangeError('repeat count must be less than infinity');
		}
		count = Math.floor(count);
		if (str.length == 0 || count == 0) {
			return '';
		}
		// Ensuring count is a 31-bit integer allows us to heavily optimize the
		// main part. But anyway, most current (August 2014) browsers can't handle
		// strings 1 << 28 chars or longer, so:
		if (str.length * count >= 1 << 28) {
			throw new RangeError('repeat count must not overflow maximum string size');
		}
		var maxCount = str.length * count;
		count = Math.floor(Math.log(count) / Math.log(2));
		while (count) {
			str += str;
			count--;
		}
		str += str.substring(0, maxCount - str.length);
		return str;
	}
}



(function() {
	
	var promisifiedOldGUM = function(constraints, successCallback, errorCallback) {
		
		// First get ahold of getUserMedia, if present
		var getUserMedia = (navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia);
		
		// Some browsers just don't implement it - return a rejected promise with an error
		// to keep a consistent interface
		if(!getUserMedia) {
			return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
		}
		
		// Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
		return new Promise(function(successCallback, errorCallback) {
			getUserMedia.call(navigator, constraints, successCallback, errorCallback);
		});
		
	}
	
	// Older browsers might not implement mediaDevices at all, so we set an empty object first
	if(navigator.mediaDevices === undefined) {
		navigator.mediaDevices = {};
	}
	
	// Some browsers partially implement mediaDevices. We can't just assign an object
	// with getUserMedia as it would overwrite existing properties.
	// Here, we will just add the getUserMedia property if it's missing.
	if(navigator.mediaDevices.getUserMedia === undefined) {
		navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
	}
	
})();

