// This is a hack so we can get dirname in the nw.js context
var dirname = __dirname.replace("node_modules/dirname", "").replace("node_modules\\dirname", "");

dirname = dirname.substring(0, dirname.length - 1); // Remove last dir delimiter

module.exports = dirname;