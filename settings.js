/*
	
	I put these in a separate file to make them easier to find.
	
	It might need more orginisation. The rest is in editor.js

*/

global.settings = { // sugg: separate view options
	insert: false,
	enableSpellchecker: true,
	tabSpace: 4, // How much indentation. Note that the editor does all the indentation for you!
	gridHeight: 22,
	gridWidth: 8, // 7.8
	leftMargin: 50,
	indentAfterTags: ["div", "ul", "ol", "head", "script", "table", "tr", "form", "select"], // Indendent after these tags
	rightMargin: 50,
	topMargin: 10,
	bottomMargin: 5,
	wordDelimiters: "(){}[]/*-+\\,'\" \n", 
	canBreakAfter: " \n,{}[];",
	canBreakBefore: "}]\t",
	drawGridBox: false,
	scrollStep: 3,
	caret: {
		width: 1,
		color: "rgb(0,0,0)"
	},
	style: {
		fontSize: 15,
		font: "Consolas",
		highlightParenthesisFont: "bold 15px Consolas",
		highlightParenthesisFontColor: "rgb(0,180,0)",
		textColor: "rgb(0,0,0)",
		bgColor: "rgb(256,256,256)",
		commentColor: "rgb(8, 134, 29)",
		quoteColor: "rgb(51, 128, 128)",
		selectedTextBg: "rgb(193, 214, 253)",
		currentLineColor: "rgb(255, 255, 230)",
		highlightTextBg: "rgb(155, 255, 155)"          // For text highlightning
	}
};