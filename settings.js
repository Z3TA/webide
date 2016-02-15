/*
	
	I put these in a separate file to make them easier to find.
	
	It might need more organization. The rest is in editor.js

*/

global.settings = { // sugg: separate view options
	devMode: true,  // devMode: true will spew out debug info and make sanity checks (will slow down the editor because of all the console.log's)
	insert: false,
	enableSpellchecker: false,
	enableDocumentPreview: false,
	tabSpace: 4, // How much indentation. Note that the editor does all the indentation for you!  
	gridHeight: 23, // 22    New finding: cld-text turns on after typing somwhere    asd  
	gridWidth: 8.5, // 8, 7.8
	leftMargin: 50,
	indentAfterTags: ["div", "ul", "ol", "head", "script", "style", "table", "tr", "form", "select"], // Intendent after these tags
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
		fontSize: 15, // Also play with gridHeight and gridWidth 
		font: "Consolas, DejaVu Sans Mono, monospace", // You'll want to use Consolas 15px on Windows! DejaVu Sans Mono 13px looks best on Linux (Ubuntu). Font's need to be installed on system (not CSS) for lcx-text to work.
		highlightMatchFont: "bold 15px Consolas, DejaVu Sans Mono, monospace",
		highlightMatchFontColor: "rgb(31, 119, 32)",
		highlightMissMatchFontColor: "rgb(255, 159, 0)",
		highlightMatchBackground: "rgb(255, 255, 230)",
		textColor: "rgb(0,0,0)", // Should be in rgb(0,0,0) format because some functions like to convert and make darker/lighter/transparent
		bgColor: "rgb(255,255,255)", // Studies say that black on white is the best for readability. todo: themes rgb(256,256,256)
		commentColor: "rgb(8, 134, 29)",
		quoteColor: "rgb(51, 128, 128)",
		xmlTagColor: "rgb(0, 21, 162)",
		selectedTextBg: "rgb(193, 214, 253)",
		currentLineColor: "rgb(255, 255, 230)",
		highlightTextBg: "rgb(155, 255, 155)"          // For text highlighting
	}
};
