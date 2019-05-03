(function() {
	"use strict";

	EDITOR.on("fileOpen", checkEncoding);

	function checkEncoding(file) {
		/*
			Our goal is to detect encoding error and offer to convert the file to utf8
			
			For now ... We will convert from Windows code page 1252 Western European. (or 1251)
			
			PS. The editor will save EVERYTHING in UTF8. Because JavaScript (and everyone else) loves UTF8
			
		*/
		
		//console.warn(new Error("File loaded!").stack);
		
		if(!file.savedAs) {
console.warn("encoding_converter.js currently do not suppor unsaved files!"); 
		return;
		}
		
		var maxCharacters = 500; // Limit on how many characters to check for problems
		var problem = false;
		for(var i=0, charCode; i<Math.min(maxCharacters, file.text.length); i++) {
			if(file.text.charCodeAt(i) > 60000) {
				charCode = file.text.charCodeAt(i);
				
				if(charCode == 65279) continue; // Ignore UTF8 BOM
				
				problemFound(i);
				problem = true;
				break;
			}			
		}
		
		if(!problem) {
			
		}
		
		function problemFound(i) {
			EDITOR.resizeNeeded(); // Just in case, to prevent weird look
			EDITOR.renderNeeded(); // Render so the user can make a better decision whether to convert or not
			if(confirm(file.text.charCodeAt(i) + "=" + file.text.charAt(i) + " at index " + i + " in " + file.path + 
			" ... Do you want to try converting the document to UTF8 encoding?\nIf you save without converting first, all non-supported characters will be lost!")) {
				if(file.savedAs) EDITOR.readFromDisk(file.path, false, "binary", fileRead);
				else {
					var byteArr = stringToBytes(file.text);
					var buffer = byteArr.map(function(b) {return String.fromCharCode(b);}).join("");
					var text = decodeBytes(buffer, "cp1252"); // or cp1251
					file.reload(text);
				}
			}
			
			function fileRead(err, path, buffer) {
				// Todo: Detect the right encoding ... (probably impossibe)
				if(err) throw err;
				if(buffer == undefined) throw new Error("buffer=" + buffer + " path=" + path);
				var text = decodeBytes(buffer, "cp1252"); // or cp1251
				
				file.reload(text);

			}
		}
		
	}
	
	function stringToBytes(s) {
		var b = new Array();
		var last = s.length;
		
		for (var i = 0; i < last; i++) {
			var d = s.charCodeAt(i);
			if (d < 128)
				b[i] = d;
			else {
				var c = s.charAt(i);
				console.warn(c + ' is NOT an ASCII character');
				b[i] = -1;
			}
		}
		return b;
	}
	
	function dec2Bin(d) {
		var b = '';
		
		for (var i = 0; i < 8; i++) {
			b = (d%2) + b;
			d = Math.floor(d/2);
		}
		
		return b;
	}
	
	function decodeBytes(bytes, encoding) {
		var encodings= {
			// Windows code page 1252 Western European
			//
			cp1252: '\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f\u20ac\ufffd\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\ufffd\u017d\ufffd\ufffd\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\ufffd\u017e\u0178\xa0\xa1\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xab\xac\xad\xae\xaf\xb0\xb1\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xbb\xbc\xbd\xbe\xbf\xc0\xc1\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xcb\xcc\xcd\xce\xcf\xd0\xd1\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xdb\xdc\xdd\xde\xdf\xe0\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xeb\xec\xed\xee\xef\xf0\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xfb\xfc\xfd\xfe\xff',

			// Windows code page 1251 Cyrillic
			//
			cp1251: '\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\x0c\r\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\x7f\u0402\u0403\u201a\u0453\u201e\u2026\u2020\u2021\u20ac\u2030\u0409\u2039\u040a\u040c\u040b\u040f\u0452\u2018\u2019\u201c\u201d\u2022\u2013\u2014\ufffd\u2122\u0459\u203a\u045a\u045c\u045b\u045f\xa0\u040e\u045e\u0408\xa4\u0490\xa6\xa7\u0401\xa9\u0404\xab\xac\xad\xae\u0407\xb0\xb1\u0406\u0456\u0491\xb5\xb6\xb7\u0451\u2116\u0454\xbb\u0458\u0405\u0455\u0457\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e\u041f\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f'
		};
		
		var enc= encodings[encoding];
		var n= bytes.length;
		var chars= new Array(n);
		for (var i= 0; i<n; i++) {
			chars[i]= enc.charAt(bytes.charCodeAt(i));
		}
		return chars.join('');
	}
	
})();
