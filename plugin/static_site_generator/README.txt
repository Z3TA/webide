Static Site Generator for JZedit
================================

Make web pages in HTML, Markdown or place a Microsoft Word file in the site folder, and it will be compiled to a html web page!

See demo/ folder for an example site.

Show interface: Ctrl + F9
Preview site: F9
Publish site: Ctrl + Shift + F9

Scripting
---------

Files named: index.htm, index.html, default.htm, default.html, *.xml, or *.nodejs will be seached for <?JS ?> tags for evaluation/compiling.

Write to the document using: document.write("string")

NodeJS modules can be accessed via: require("Module name or path")

Data about the document can be found in the document.* object:

document.title =   The title tag, or the first H1 tag if no title exist.
document.language, 
document.keywords, 
document.created,
document.changed, 
document.url, 

document.all    Array of all pages on the site
document.alert  Sends an alert to the editor, used for debugging <!-- implement!
document.root   
document.folder
document.lead   The content of the <abstract> tag, or <meta description> if no abstract tag is found. Or the first paragraph if neither is found.



You can have multiple body-onloads, title, meta keyword, and script tags, for example in both header.htm and the some_new_page.htm. Then they will be uniquely merged. 

