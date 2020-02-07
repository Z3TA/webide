
function getArg(word) {
	
	/*
		Searches the process arguments for 
		ex: word = ["p", "papa", "pap"];
		
		-p 123 
		--papa 123 
		--pap 123
		--papa=123 
		--pap=123
	*/
	
	var args = process.argv.join(" ");
	
	if(typeof word == "string") {
		word = [word];
	}
	
	if(word.length == 0) throw new Error("Need at least one word to find an argument!");
	
	var regexStr = "( -" + word[0];
	for(var i=1; i<word.length; i++) regexStr += "| --" + word[i] + "=";
	regexStr += ")\\s?([^\\s\"']+|\"([^\"]*)\"|'([^']*)')?"
	// https://stackoverflow.com/questions/366202/regex-for-splitting-a-string-using-space-when-not-surrounded-by-single-or-double
	
	//console.log("regexStr=" + regexStr);
	
	var argReg = new RegExp(regexStr, "i");
	
	var match = args.match(argReg);
	//console.log("match=" + JSON.stringify(match));
	if(match !== null) {
		var value;
		//console.log("match.length=" + match.length);
		for(var i=match.length; i>-1; i--) {
			//console.log("i=" + i + " => " + match[i]);
			if( match[i] !== undefined ) {
				value = match[i];
				break;
			}
		}
		console.log("value=" + value);
		if(value === undefined) return true;
		else if(value === "false") return false;
		else if(value === "true") return true;
		else if(value === "no") return false;
		else if(value === "yes") return true;
		else return value;
	}
	else return undefined;
	
}

module.exports = getArg;
