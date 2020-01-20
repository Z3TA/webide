
function makeFolderPicker(inputPath) {
 // Returns a new div where folder suggestions will show
 
 var suggestedFolderButtons = {};
 
 
 if(typeof inputPath.nodeName == "undefined") throw new Error("First argument to makeFolderPicker needs to be a input element!"); 
 if(inputPath.nodeName != "INPUT" && inputPath.nodeName != "TEXTAREA") throw new Error("First argument to makeFolderPicker needs to be either an input or textarea element!"); 
 // Are there any other elements that allows text input !?
 
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
  console.log("pathKeyDown: inputPath.value=" + inputPath.value);
  var keyTab = 9;
  // Autocomplete the path when pressing tab
  if(keyDownEvent.keyCode == keyTab) {
   var text = inputPath.value;
   if(text.length == 0) return ALLOW_DEFAULT;
   
   var caretPos = inputPath.selectionStart;
   
   if(caretPos != text.length) {
    var afterCaret = text.slice(caretPos);
    text = text.slice(0, caretPos);
    console.log("afterCaret=" + afterCaret);
    console.log("text=" + text);
   }
   
   EDITOR.autoCompletePath({path: text, onlyDirectories: true}, function(err, path) {
    if(err && err.code != "ENOENT") return alertBox(err.message);
    else if(!err && path != inputPath.value) {
     
     if(afterCaret) {
      inputPath.value = path + afterCaret;
      setCaretPosition(inputPath, path.length);
     }
     else inputPath.value = path;
     
     if(UTIL.isDirectory(path)) suggestFolders(path);
    }
   });
   keyDownEvent.preventDefault();
   return PREVENT_DEFAULT;
  }
  else return ALLOW_DEFAULT;
 }
 
 function pathKeyInput(inputEvent) {
  console.log("pathKeyInput: inputPath.value=" + inputPath.value);
  
  suggestFolders(inputPath.value);
  return ALLOW_DEFAULT;
 }
 
 var oldPath = "", currentPath = "", oldFolder = "", currentFolder = "";
 function suggestFolders(pathValue) {
  // Does the path match any of the path-pickers ?
  
  console.log("pathValue=" + pathValue);
  if(!pathValue) {
   console.warn("pathValue=" + pathValue);
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
    console.error(err);
    return;
   }
   
   if(pathIsFolder) return;
   
   var suggestedFolders = Object.keys(suggestedFolderButtons);
   
   for (var i=0, part; i<suggestedFolders.length; i++) {
    part = suggestedFolders[i].slice(0, pathValue.length)
    console.log("(" + suggestedFolders[i] + ") " + part + " == " + pathValue + " ? " + (part==pathValue));
    if(part == pathValue) {
     console.log("Highlight: " + suggestedFolders[i]);
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
   
   if(files) {
    for (var i=0; i<files.length; i++) {
     if(files[i].type=="d") addFolder(files[i].name);
    }
   }
   
   if(callback) callback(null);
   
   EDITOR.resizeNeeded();
   
  });
  
  return ALLOW_DEFAULT;
  
  function addFolder(name) {
   console.log("Adding folder button name=" + name);
   
   var fullPath = UTIL.resolvePath(pathToFolder, name);
   fullPath = UTIL.trailingSlash(fullPath);
   
   var button = document.createElement("button");
   button.classList.add("folder");
   button.innerText = name;
   button.onclick = function clickButton() {
    inputPath.value = fullPath;
    suggestFolders(fullPath);
    inputPath.focus();
   }
   
   suggestedFolderButtons[fullPath] = button;
   
   folderPicker.appendChild(button);
  }
  
 }
 
}


