
function makeFolderPicker(inputPath, options) {
 // Returns a new div where folder suggestions will show
 
 var suggestedFolderButtons = {};
 var lastKeyDownCode = 0;
 
 if(inputPath == undefined || typeof inputPath.nodeName == "undefined") throw new Error("First argument to makeFolderPicker (inputPath=" + inputPath + ") needs to be a input element!"); 
 if(inputPath.nodeName != "INPUT" && inputPath.nodeName != "TEXTAREA") throw new Error("First argument to makeFolderPicker needs to be either an input or textarea element! (inputPath.nodeName=" + inputPath.nodeName + ")"); 
 // Are there any other elements that allows text input !?
 
 if(options == undefined) options = {};
 
 inputPath.addEventListener("keydown", pathKeyDown); // input value has not been updated
 inputPath.addEventListener("input", pathKeyInput); // input value HAS been updated! Also captures most changes.

 
 var folderPicker = document.createElement("div");
 folderPicker.classList.add("folderPicker");
 
 suggestFolders(inputPath.value);
 
 
 
 return folderPicker;
 
 
 function setCaretPosition(el, caretPos) {
  
  el.value = el.value;
  // ^ this is used to not only get "focus", but
  // to make sure we don't have it everything -selected-
  // (it causes an issue in chrome, and having it doesn't hurt any other browser)
  
  if (el !== null) {
   
   if (el.createTextRange) {
    var range = el.createTextRange();
    range.move('character', caretPos);
    range.select();
    return true;
   }
   
   else {
    // (el.selectionStart === 0 added for Firefox bug)
    if (el.selectionStart || el.selectionStart === 0) {
     el.focus();
     el.setSelectionRange(caretPos, caretPos);
     return true;
    }
    
    else  { // fail city, fortunately this never happens (as far as I've tested) :)
     el.focus();
     return false;
    }
   }
  }
 }
 
 function pathKeyDown(keyDownEvent) {
  //console.log("makeFolderPicker: pathKeyDown: inputPath.value=" + inputPath.value);
  var keyTab = 9;
  // Autocomplete the path when pressing tab
  // Allow user to go to previous input element using shift+tab,
  // But he/she needs to press tab two times in a row to go to the next element
  if(keyDownEvent.keyCode == keyTab && !keyDownEvent.shiftKey && lastKeyDownCode != keyTab) {
   lastKeyDownCode = keyTab;
   
   var text = inputPath.value;
   if(text.length == 0) return ALLOW_DEFAULT;
   
   var caretPos = inputPath.selectionStart;
   
   if(caretPos != text.length) {
    var afterCaret = text.slice(caretPos);
    text = text.slice(0, caretPos);
    //console.log("makeFolderPicker: pathKeyDown: afterCaret=" + afterCaret);
    //console.log("makeFolderPicker: pathKeyDown: text=" + text);
   }
   
   if(text == "") return ALLOW_DEFAULT;
   
   EDITOR.autoCompletePath({path: text, onlyDirectories: true}, function(err, path) {
    if(err && err.code != "ENOENT") return alertBox(err.message);
    else if(!err && path != inputPath.value) {
     
     if(afterCaret) {
      inputPath.value = path + afterCaret;
      setCaretPosition(inputPath, path.length);
     }
     else {
inputPath.value = path;
     }
     
     inputPath.dispatchEvent(new Event('change'));
     
     if(UTIL.isDirectory(path)) suggestFolders(path);
    }
   });
   keyDownEvent.preventDefault();
   return PREVENT_DEFAULT;
  }
  
  lastKeyDownCode = keyDownEvent.keyCode;
  
  return ALLOW_DEFAULT;
 }
 
 function pathKeyInput(inputEvent) {
  //console.log("makeFolderPicker: pathKeyInput: inputPath.value=" + inputPath.value);
  
  suggestFolders(inputPath.value);
  return ALLOW_DEFAULT;
 }
 
 var oldPath = "", currentPath = "", oldFolder = "", currentFolder = "";
 function suggestFolders(pathValue) {
  // Does the path match any of the path-pickers ?
  
  //console.log("makeFolderPicker: suggestFolders: pathValue=" + pathValue);
  if(!pathValue) {
   //console.warn("makeFolderPicker: suggestFolders: pathValue=" + pathValue);
   return;
  }
  
  oldPath = currentPath;
  currentPath = pathValue;
  
  if(oldPath == currentPath) return; // Path didn't change
  
  oldFolder = currentFolder;
  currentFolder = UTIL.getDirectoryFromPath(currentPath);
  
  var pathIsFolder = UTIL.isDirectory(pathValue);
  
  if(oldFolder != currentFolder) {
   // Folder did change!?
   var pathToFolder = currentFolder;
   if(pathIsFolder) {
    // We want to show folders in the parent path !?
   }
   updateFolderPicker(pathToFolder, highLight);
  }
  else highLight(null);
  
  function highLight(err) {
   
   if(err) {
// There's something wrong with the path... Unable to list files!
    console.error(err);
    inputPath.value = EDITOR.workingDirectory;
    return;
   }
   
   if(pathIsFolder) return;
   
   var suggestedFolders = Object.keys(suggestedFolderButtons);
   
   for (var i=0, part; i<suggestedFolders.length; i++) {
    part = suggestedFolders[i].slice(0, pathValue.length)
    //console.log("makeFolderPicker: highLight: (" + suggestedFolders[i] + ") " + part + " == " + pathValue + " ? " + (part==pathValue));
    if(part == pathValue) {
     //console.log("makeFolderPicker: highLight: Highlight: " + suggestedFolders[i]);
     suggestedFolderButtons[suggestedFolders[i]].classList.add("highlighted");
    }
    else {
     suggestedFolderButtons[suggestedFolders[i]].classList.remove("highlighted");
    }
   }
  }
 }
 
 function updateFolderPicker(pathToFolder, callback) {
  while(folderPicker.firstChild)folderPicker.removeChild(folderPicker.firstChild);
  
  addFolder("../");
  
  for(var path in suggestedFolderButtons) delete suggestedFolderButtons[path];
  
  EDITOR.listFiles(pathToFolder, function fileList(err, files) {
   
   if(err) {
    if(callback) return callback(err);
    else throw err;
   }
   
   var folderCount = 0;
   var maxFolders = 40; // Limit folder so they don't cover the whole screen
   
   if(files) {
    for (var i=0; i<files.length; i++) {
     if(files[i].type=="d") {
      if(++folderCount < maxFolders) addFolder(files[i].name);
     }
    }
    if(folderCount > maxFolders) {
     folderPicker.appendChild(document.createTextNode(" " + (folderCount-maxFolders) + " more..."));
    }
   }
   
   if(callback) callback(null);
   
   EDITOR.resizeNeeded();
   
  });
  
  return ALLOW_DEFAULT;
  
  function addFolder(name) {
   //console.log("makeFolderPicker: addFolder: Adding folder button name=" + name);
   
   var fullPath = UTIL.resolvePath(pathToFolder, name);
   fullPath = UTIL.trailingSlash(fullPath);
   
   var button = document.createElement("button");
   button.classList.add("folder");
   button.innerText = name;
   button.onclick = function clickButton() {
    inputPath.value = fullPath;
    suggestFolders(fullPath);
    if(options.focus !== false) inputPath.focus();
    
    try {
     var evt = new Event('change');
    }
    catch(err) {
     // IE 11
     var evt = document.createEvent("HTMLEvents");
     evt.initEvent("change", false, true);
    }

    inputPath.dispatchEvent(evt);
   }
   
   suggestedFolderButtons[fullPath] = button;
   
   folderPicker.appendChild(button);
  }
  
 }
 
}


