Static Site Generator for JZedit
================================

See demo/ folder for an example site.

To make a new page or "blog post", create a new .htm file and place it in the demo/source/ folder.

Show interface: Ctrl + F9
Preview site: F9
Publish site: Ctrl + Shift + F9

When linking to css files and images etc in headers and footers,
all src and href paths needs to translate from root (have an / infront) !

Files named *.htm, *.html, *.docx, *.md will be converted to HTML and have header(s) and footer(s) inserted.
All other files like images *.js and *.css will be copied as is. 

Multiple body-onloads, title, meta keyword, and script tags, will be uniquely merged. 


Scripting
=========

Files named: index.htm, index.html, default.htm, default.html, *.xml, or *.nodejs 
will be seached for <?JS ?> tags for evaluation/compiling.

Write to the document using: document.write("string")

NodeJS modules can be accessed via: require("Module name or path")
Node modules have to be installed in the parent of the source folder. 

Data about the document can be found in the document.* object:

document.title    = Document title taken from title tag, H1 tag, or first paragraph. 
document.lead     = Lead/intro taken from abstract, meta description or first paragraph.
document.language = Document language as specified in a html tag
document.keywords = Document keywords from meta keywords
document.created  = Date when the page/file was created
document.changed  = Date when the page/file was last changed
document.url      = The relative URL of the page.

document.all      = An array of all pages on the site
document.root     = A tree like object of the whole site
document.folder   = A tree like object of the current folder

Each branch in the tree like object, has a documents, and folders object.

The folder objects have a .latest() method that returns an array of all documents in the folder sorted by document.created.



