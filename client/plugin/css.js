(function() {
	/*

		Goal of this plugin:
		* Autocomplete CSS rules
		* Show invalid CSS rules
		* Show/goto rules that override current value

		* When typing 12pxrem convert 12px to rem! or when clicking tab on 12px convert it to rem !?
		* Mark lines not ending with semicolon!

	*/

	var isCssFile = false;
	
	EDITOR.plugin({
		desc: "CSS intellisense",
		load: function loadCssIntellisense() {

			EDITOR.on("fileShow", checkIfCss);
			var autocompleteOrder = 1; // We want the CSS autocompletion to firtst so we can cancel remaining auto-completions
			EDITOR.on("autoComplete", autoCompleteCssRules, autocompleteOrder);


		},
		unload: function unloadCssIntellisense() {

			EDITOR.removeEvent("fileShow", checkIfCss);
			
			EDITOR.removeEvent("autoComplete", autoCompleteCssRules);

		},

	});

	function checkIfCss(file) {

		// Also include .scss (Sass)
		if(file.fileExtension.toLowerCase().indexOf("css") != -1) {
			
			isCssFile = true;

			EDITOR.addPreRender(checkCssRules);

		}
		else {
			
			isCssFile = false;

			EDITOR.removePreRender(checkCssRules);
		}
	}

	// Pre-render function to highlight missed semicolon
	function checkCssRules(buffer, file, bufferStartRow, maxColumns) {



		return buffer;
	}



	/*
		Pre-render function to highlight misspelled rules

		I thought this was going to be simple, 
		but then there are comments and optional white spaces and semicolons... 
		Should probably make a proper CSS parser, rather then doing it in a pre-render
	*/

	function checkCssRules(buffer, file, bufferStartRow, maxColumns) {
		var rule = ""
		var row = 0;
		var col = 0;
		var reSpace = /\s/;
		var inComment = false;
		var char = "";
		var lastChar = "";
		var inOptions = false;
		var inSelector = true;
		var selector = "";

		for(var row=0; row<buffer.length; row++) {
			//if(row == file.caret.row+bufferStartRow) continue;
			
			//console.log("============ row=" + row + " ===============");

			for(var col=0; col<buffer[row].length; col++) {
				char = buffer[row][col].char;

				// Ignore comments
				if( inComment && char == "/" && lastChar == "*" ) inComment = false;
				else if(char == "*" && lastChar == "/") inComment = true;
				else if(inComment) continue;

				if(char == "{") {
					inSelector = false;
				}
				else if(inSelector) {
					selector += char;
				}
				else if(char == ":") {

					if(inOptions) {
						// Missing semicolon !?
						for(var r=row-1; r>0; r--) {
							if(buffer[r].length > 0) {
								if( buffer[r][ buffer[r].length-1 ].char == "}" || buffer[r][ buffer[r].length-1 ].char == "{" ) continue;

								buffer[r][ buffer[r].length-1 ].circle = true;
								break;
							}
						}
					}

					//console.log("rule=" + rule);

					if(cssRule.indexOf( rule.trim() ) == -1) {
						for(var i=0; i<rule.length && i < buffer[row].length; i++) {
							buffer[row][i].wave = true;
						}
					}
					rule = "";

					inOptions = true;
					// Make sure there is a ; semicolon before we see another : colon!

				}
				else if(inOptions && char == ";") {
					inOptions = false;
				}
				else if(!inOptions && char == "}") {
					inSelector = true;
				}
				else if(!inOptions && !inSelector) {
					rule += char;
				}
				

				//console.log("col=" + col + " char=" + char + " inComment=" + inComment + " inSelector=" + inSelector + " inOptions=" + inOptions);

			}
		}

		return buffer;
	}

	function autoCompleteCssRules(file, word, wordLength, gotOptions) {

		// note: default word delimiter splits - which is legal in CSS
		// so we have to figure out the word ourselves!

		var char = "";
		var str = "";
		var reSpace = /\s/;
		for(var i=file.caret.index-1; i>0; i--) {
			char = file.text[i];
			console.log("char=" + char);
			if(char == ":" || char == " ") return;
			if(char.match(reSpace)) break;
			str = char + str;
		}

		console.log("str=" + str);

		if(str.length > 0) {

			var matches = [];

			for (var i=0; i<cssRule.length; i++) {
				if(cssRule[i].indexOf(str) == 0) {
					if(str.indexOf("-") != -1) {
						console.log("str =" + str);
						console.log("word=" + word);
						console.log("rule=" + cssRule[i]);

						var sugg =  cssRule[i].slice( str.lastIndexOf("-") + 1 );
						console.log("sugg=" + sugg);

						matches.push( sugg  );
					}
					else {
						matches.push( cssRule[i] );
					}
					
				}
			}

			if(matches.length == 0) return;

			if(matches.length == 1) matches[0] = matches[0] + ": ";

			return {exclusive: true, add: matches};

		}

		console.log("autoCompleteCssRules: str=" + str + " word=" + word + " matches=" + JSON.stringify(matches));

	}

	var cssRule = [
		"align-content",
		"align-items",
		"align-self",
		"all",
		"animation",
		"animation-delay",
		"animation-direction",
		"animation-duration",
		"animation-fill-mode",
		"animation-iteration-count",
		"animation-name",
		"animation-play-state",
		"animation-timing-function",
		"backface-visibility",
		"background",
		"background-attachment",
		"background-blend-mode",
		"background-clip",
		"background-color",
		"background-image",
		"background-origin",
		"background-position",
		"background-repeat",
		"background-size",
		"border",
		"border-bottom",
		"border-bottom-color",
		"border-bottom-left-radius",
		"border-bottom-right-radius",
		"border-bottom-style",
		"border-bottom-width",
		"border-collapse",
		"border-color",
		"border-image",
		"border-image-outset",
		"border-image-repeat",
		"border-image-slice",
		"border-image-source",
		"border-image-width",
		"border-left",
		"border-left-color",
		"border-left-style",
		"border-left-width",
		"border-radius",
		"border-right",
		"border-right-color",
		"border-right-style",
		"border-right-width",
		"border-spacing",
		"border-style",
		"border-top",
		"border-top-color",
		"border-top-left-radius",
		"border-top-right-radius",
		"border-top-style",
		"border-top-width",
		"border-width",
		"bottom",
		"box-decoration-break",
		"box-shadow",
		"box-sizing",
		"break-after",
		"break-before",
		"break-inside",
		"caption-side",
		"caret-color",
		"@charset",
		"clear",
		"clip",
		"color",
		"column-count",
		"column-fill",
		"column-gap",
		"column-rule",
		"column-rule-color",
		"column-rule-style",
		"column-rule-width",
		"column-span",
		"column-width",
		"columns",
		"content",
		"counter-increment",
		"counter-reset",
		"cursor",
		"direction",
		"display",
		"empty-cells",
		"filter",
		"flex",
		"flex-basis",
		"flex-direction",
		"flex-flow",
		"flex-grow",
		"flex-shrink",
		"flex-wrap",
		"float",
		"font",
		"@font-face",
		"font-family",
		"font-feature-settings",
		"@font-feature-values",
		"font-kerning",
		"font-language-override",
		"font-size",
		"font-size-adjust",
		"font-stretch",
		"font-style",
		"font-synthesis",
		"font-variant",
		"font-variant-alternates",
		"font-variant-caps",
		"font-variant-east-asian",
		"font-variant-ligatures",
		"font-variant-numeric",
		"font-variant-position",
		"font-weight",
		"grid",
		"grid-area",
		"grid-auto-columns",
		"grid-auto-flow",
		"grid-auto-rows",
		"grid-column",
		"grid-column-end",
		"grid-column-gap",
		"grid-column-start",
		"grid-gap",
		"grid-row",
		"grid-row-end",
		"grid-row-gap",
		"grid-row-start",
		"grid-template",
		"grid-template-areas",
		"grid-template-columns",
		"grid-template-rows",
		"hanging-punctuation",
		"height",
		"hyphens",
		"image-rendering",
		"@import",
		"isolation",
		"justify-content",
		"@keyframes",
		"left",
		"letter-spacing",
		"line-break",
		"line-height",
		"list-style",
		"list-style-image",
		"list-style-position",
		"list-style-type",
		"margin",
		"margin-bottom",
		"margin-left",
		"margin-right",
		"margin-top",
		"mask",
		"mask-type",
		"max-height",
		"max-width",
		"@media",
		"min-height",
		"min-width",
		"mix-blend-mode",
		"object-fit",
		"object-position",
		"opacity",
		"order",
		"orphans",
		"outline",
		"outline-color",
		"outline-offset",
		"outline-style",
		"outline-width",
		"overflow",
		"Specifies",
		"overflow-wrap",
		"overflow-x",
		"overflow-y",
		"padding",
		"padding-bottom",
		"padding-left",
		"padding-right",
		"padding-top",
		"page-break-after",
		"page-break-before",
		"page-break-inside",
		"perspective",
		"perspective-origin",
		"pointer-events",
		"position",
		"quotes",
		"resize",
		"right",
		"scroll-behavior",
		"tab-size",
		"table-layout",
		"text-align",
		"text-align-last",
		"text-combine-upright",
		"text-decoration",
		"text-decoration-color",
		"text-decoration-line",
		"text-decoration-style",
		"text-indent",
		"text-justify",
		"text-orientation",
		"text-overflow",
		"text-shadow",
		"text-transform",
		"text-underline-position",
		"top",
		"transform",
		"transform-origin",
		"transform-style",
		"transition",
		"transition-delay",
		"transition-duration",
		"transition-property",
		"transition-timing-function",
		"unicode-bidi",
		"user-select",
		"vertical-align",
		"visibility",
		"white-space",
		"widows",
		"width",
		"word-break",
		"word-spacing",
		"word-wrap",
		"writing-mode",
		"z-index"
	];


})();