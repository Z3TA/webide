importScripts('../highlight.js/highlight.min.js');

// https://github.com/highlightjs/highlight.js/blob/389245c170bc2361eff36e0550e05f72e5745708/src/lib/token_tree.js

onmessage = function onmessage(ev) {
  console.log("highlight:worker:onmessage: ev.data=", ev.data);

  var obj = ev.data;
  
  var result = self.hljs.highlightAuto(obj.text);
  postMessage({html: result.value, path: obj.path});
}

console.log("highlight: highlightjs_worker.js ready!");