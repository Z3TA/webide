Static Site Generator (SSG) for JZedit
======================================

Show interface: Ctrl + F9
Preview site: F9
Publish site: Ctrl + Shift + F9

See example site in demo/ folder.

To make a new page or blog entry: 
Create a new .htm file and place it in the demo/source/ folder.
Or click the "New Page" button in the interface to use a template.


Uploading images
================
Drag and drop images into the editor


How the static site generators build the pages
==============================================

Files named *.htm, *.html, *.docx, *.md will be converted to HTML and have header(s) and footer(s) inserted.
All other files like images .js and .css files will be copied as is.

Multiple body-onloads, title, meta keyword, and script tags, will be uniquely merged.


Absolute vs Relative paths
--------------------------
When linking to .css files, images etc, all src and href attribute paths inside header and footer files needs to translate from root (have an / infront) !
They will then be converted ro relative paths by the SSG.

src and href attributes inside normal pages (not header or footer files) need to have relative paths!

Scripting
=========

Files named: index.htm, index.html, default.htm, default.html, *.xml, or *.nodejs 
will be seached for <?JS ?> tags for evaluation/compiling.

Write to the document using: document.write("string")

NodeJS modules can be used with "require", and have to be installed in the parent of the source folder. 

Data about the document can be found in the document object:

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

Each branch in the tree like object has a documents, and folders object.

The folder objects have a .latest(n) method that returns an array of all documents in the folder sorted by document.created.


Collaborating
=============

When working with many developers, you should use version control like Git or Mercurial.
Share the root folder in a repository (the "demo" folder in the included example).



