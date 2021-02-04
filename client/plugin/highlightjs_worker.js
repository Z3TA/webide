importScripts('../highlight.js/highlight.min.js');

/*


  // https://github.com/highlightjs/highlight.js/blob/389245c170bc2361eff36e0550e05f72e5745708/src/lib/token_tree.js

  function Emitter() {
  console.log("highlight:worker:Emitter:(constructor)", JSON.stringify(arguments, null, 2));

  this.row = 0;
  this.col = 0;
  this.children = [];
  this.type = undefined;

  }

  Emitter.prototype.addKeyword = function(text, kind) {
  console.log("highlight:worker:Emitter:addKeyword: text=" + text + " kind=" + kind + " ");

  }

  Emitter.prototype.addText = function(text) {
  console.log("highlight:worker:Emitter:addText: text=" + text + "");
  }
  Emitter.prototype.addSublanguage = function(emitter, subLanguageName) {
  console.log("highlight:worker:Emitter:addSublanguage: emitter=" + emitter + " subLanguageName=" + subLanguageName);
  }

  Emitter.prototype.finalize = function() {
  console.log("highlight:worker:Emitter:finalize! ");
  return true;
  }

  Emitter.prototype.openNode = function(kind) {
  console.log("highlight:worker:Emitter:openNode: kind=" + kind + " ");
  }

  Emitter.prototype.closeNode = function() {
  console.log("highlight:worker:Emitter:closeNode!");
  }

  Emitter.prototype.closeAllNodes = function() {
  console.log("highlight:worker:Emitter:closeAllNodes!");
  }

  Emitter.prototype.toHTML = function() {
  console.log("highlight:worker:Emitter:toHTML!");
  return "abc";
  }

  self.hljs.configure({__emitter: Emitter});
*/

var reSpan = /<span class="([^"]*)">/;
var reSpanEnd = /<\/span>/;

onmessage = function onmessage(ev) {
  console.log("highlight:worker:onmessage: ev.data=", ev.data);

  var obj = ev.data;
  
  var result = self.hljs.highlightAuto(obj.text);

  //console.log("highlight:worker:onmessage: result=", result);

  //console.log("highlight:worker:onmessage: rootNode=" + JSON.stringify(result.emitter.rootNode, null, 2));

  // Note: rootNode might get breaking changes so use the generated HTML instead!

  console.log("highlight:worker:onmessage: html=" + result.value);

  var rows = result.value.split(/\r\n|\n/);

  var colors = [];

  console.log("highlight:worker:onmessage: rows=" + JSON.stringify(rows, null, 2));
  var grid = new Array(rows.length);
  var types = [];
  var col = 0;
  var lastLength = 0;
  var nextLength = 0;
  
  var classes;
  var matchStart, matchEnd;
  for (var row=0; row<rows.length; row++) {
    col = 0;
    lastLength = 0;
    nextLength = 0;
    classes = [];

    rows[row] = rows[row].replace(/&quot;/g, '"');

    walk(rows, row);

  }

  function walk(rows, row) {
    
    console.log("highlight:worker:onmessage:walk: row=" + row + " col=" + col + " row:" + rows[row]);

    var matchStart = rows[row].match(reSpan);
    var matchEnd = rows[row].match(reSpanEnd);

    console.log("highlight:worker:onmessage: matchStart=", matchStart);
    console.log("highlight:worker:onmessage: matchEnd=", matchEnd);

    if(matchStart && matchEnd && matchStart.index < matchEnd.index || matchStart && !matchEnd) {
      
      console.log("highlight:worker:onmessage:walk: Found class=" + matchStart[1]);

      classes.push(matchStart[1]);
      col += matchStart.index;
      rows[row] = rows[row].slice(matchStart.index + matchStart[0].length);
      nextLength = matchStart[0].length;
    }
    else if(matchStart && matchEnd && matchStart.index > matchEnd.index || !matchStart && matchEnd) {
      var len = matchEnd.index;
      if(len > 0) {
        console.log("highlight:worker:onmessage:walk: Added color on row=" + row + " col=" + col + " len=" + len + "");
        colors.push(  { row:row, col:col, len:len, styles:classes.slice() }  );
      }
      col += matchEnd.index;
      
      var removedClass = classes.pop();
      console.log("highlight:worker:onmessage:walk: Ended class=" + removedClass + " on col=" + col + " len=" + len);
      
      rows[row] = rows[row].slice(matchEnd.index + matchEnd[0].length);
    }
    else if(!matchStart && !matchEnd) {
      // done
      return;
    }
    else {
      throw new Error( "matchStart=" + JSON.stringify(matchStart) + " matchEnd=" + JSON.stringify(matchEnd) );
    }

    walk(rows, row);

  }

  console.log("highlight:worker:onmessage: colors=" + JSON.stringify(colors, null, 2));

  postMessage({colors: colors, path: obj.path});
}

console.log("highlight: highlightjs_worker.js ready!");