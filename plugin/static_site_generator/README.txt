Static Site Generator for JZedit
================================

See demo/ folder for an example site.

Select site: Ctrl + F9

Preview site: F9

Scripting
---------

Files named: index.htm, index.html, default.htm, default.html, *.xml, *.nodejs
Will be seached for <?JS ?> tags for eval.

Write to the document using: document.write("string")

Data about the document can be found in the document object. Examples: documet.*
title, language, keywords, lead, created, changed, url, folder, root, alert, all

document.all    Array of all pages on the site
document.alert  Sends an alert to the editor, used for debugging <!-- implement!
document.root   
document.folder
document.lead   Takes data from eaither meta description or abstract html tag.

NodeJS modules can be accessed via: require("Module name or path")


