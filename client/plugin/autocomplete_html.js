(function() {

	var date = new Date();
	// format: 2008-02-14 20:00
	var time = date.getFullYear() + "-" + zeroPad(date.getMonth()+1) + "-" + zeroPad(date.getDate()) + " " + zeroPad(date.getHours()) + ":" + zeroPad(date.getMinutes());
	
	function zeroPad(nr) {
		if(nr.toString().length==1) nr = "0" + nr;
		return nr; 
	}
	
	var completions = {
		a: ['a href=""></a>', 4],
		// Cannot have anything else on a or a wont autocomplete (which is much more common then the other elements tarting with a)
		//address: ["address></address>", 10],
		blockquote: ['blockquote></blockquote>', 13],
		button: ["button></button>", 9],
		br: "br />",
		canvas: "canvas />",
		caption: ["caption></caption>", 10],
		cite: ["cite></cite>", 7],
		code: ["code></code>", 7],
		col: ['col span="" />', 4],
		colgroup: ['colgroup></colgroup>', 11],
		data: ['data value=""></data>', 7],
		datalist: ['datalist id=""></datalist>', 11],
		dd: ['dd></dd>', 5],
		del: 'del>',
		details: ['details></details>', 10],
		dfn: ['dfn></dfn>', 6],
		dialog: ['dialog open></dialog>', 10],
		div: ["div></div>", 6],
		dl: ['dl></dl>', 5],
		dt: ['dt></dt>', 5],
		em: ['em></em>', 5],
		embed: ['embed src="" />', 4],
		fieldset: ['fieldset></fieldset>', 11],
		figcaption: ['figcaption></figcaption>', 13],
		figure: ['figure></figure>', 9],
		footer: ['footer></footer>', 9],
		form: ['form></form>', 7],
		header: ['header></header>', 9],
		hr: 'hr />',
		iframe: ['iframe src=""></iframe>', 11],
		img: ['img wdith="" height="" src="" />', 4],
		input: ['input type="text" id="" />', 4],
		ins: ['ins></ins>', 6],
		kbd: ['kbd></kbd>', 6],
		label: ['label for=""></label>', 8],
		legend: ['legend></legend>', 9],
		li: ['li></li>', 5],
		link: ['link rel="stylesheet" type="text/css" href="" />', 4],
		main: ['main></main>', 7],
		map: ['map name=""></map>', 6],
		mark: ['mark></mark>', 7],
		meta: ['meta />', 2],
		meter: ['meter value=""></meter>', 8],
		nav: ['nav></nav>', 6],
		noscript: ['noscript></noscript>', 11],
		object: ['object width="" height="" data=""></object>', 11],
		ol: ['ol></ol>', 5],
		optgroup: ['optgroup label=""></optgroup>', 11],
		option: ['option></option>', 9],
		output: ['output for=""></output>', 11],
		param: ['param name="" value="" />', 13],
		picture: ['picture></picture>', 10],
		pre: ['pre></pre>', 6],
		progress: 'progress value="0" min="0" max="100"></progress>',
		rp: ['rp></rp>', 5],
		rt: ['rt></rt>', 5],
		ruby: ['ruby></ruby>', 7],
		samp: ['samp></samp>', 7],
		script: ['script></script>', 9],
		section: ['section></section>', 10],
		select: ['select></select>', 9],
		small: ['small></small>', 8],
		source: ['source src="" type="" />', 12],
		span: ['span></span>', 7],
		strong: ['strong></strong>', 9],
		style: ['style></style>', 8],
		sub: ['sub></sub>', 6],
		summary: ['summary></summary>', 10],
		sup: ['sup></sup>', 6],
		svg: ['svg width="500" height="200"></svg>', 6],
		table: ['table></table>', 8],
		tbody: ['tbody></tbody>', 8],
		td: ['td></td>', 5],
		template: ['template></template>', 11],
		textarea: ['textarea rows=""></textarea>', 13],
		tfoot: ['tfoot></tfoot>', 8],
		th: ['th></th>', 5],
		thead: ['thead></thead>', 8],
		time: ['time datetime="' + time + '"></time>', 7],
		tr: ['tr></tr>', 5],
		track: ['<track src=".vtt" kind="subtitles" srclang="en" label="English" />', 55],
		ul: ['ul></ul>', 5],
		var: ['var></var>', 6],
		video: ['video width="320" height="240"></video>', 8],
		wbr: 'wbr />'
	};
	
	// todo: https://www.w3schools.com/tags/
	
	var htmlTags = [];
	
	
	EDITOR.plugin({
		desc: "Autocomplete HTML elements",
		load: function loadAutocompleteHTML() {
			
			var order = 50; // Before js_misc
			
			EDITOR.on("autoComplete", autoCompleteHtml, order);
			
		},
		unload: function unloadAutocompleteHTML() {
			
			EDITOR.removeEvent("autoComplete", autoCompleteHtml);
			
		}
	});
	
	function autoCompleteHtml(file, word, wordLength, gotOptions) {
		
		var charBeforeWord = file.text.charAt(file.caret.index-wordLength-1);
		
		if(word.length > 0 && charBeforeWord == "!" && "DOCTYPE".slice(0, wordLength) == word) {
			return [
				['DOCTYPE html>\n<html lang="en">\n<head>\n<title></title>\n</head>\n<body>\n\n</body>\n</html>\n', 41]
			];
		}
		
		//if(!isHTML(file)) return;
		
		var tagStart = charBeforeWord == "<";
		var tagEnd = charBeforeWord == "/";
		
		console.log("autoCompleteHtml: word=" + word + " hmm=" + "DOCTYPE".slice(0, wordLength) + " charBeforeWord=" + charBeforeWord + " tagStart=" + tagStart + " tagEnd=" + tagEnd);
		
		
		if(!tagStart && !tagEnd) return;
		
		var options = [];
		
		for(var el in completions) {
			if(el.slice(0,wordLength) == word) {
				console.log("autoCompleteHtml: " + el.slice(0,wordLength) + " == " + word + " => " + el);
				if(tagEnd) options.push(el + ">");
				else options.push(completions[el]);
			}
			
		}
		
		if(options.length > 0) return options;
		
	}
	
	
	function isHTML(file) {
		if(file.path.match(/html?$/i)) return true;
		else if(file.text.match(/<!DOCTYPE html>/i)) return true;
		else if(file.text.match(/<html>/i)) return true;
		else if(file.text.match(/<script>/i)) return true;
		
		else return false;
	}
	
})();

