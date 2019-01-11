var module_fs = require("fs");

function copyFile(source, target, cb) {
var cbCalled = false;

var rd = module_fs.createReadStream(source);
rd.on("error", function(err) {
done(err);
});
var wr = module_fs.createWriteStream(target);
wr.on("error", function(err) {
done(err);
});
wr.on("close", function(ex) {
done();
});
rd.pipe(wr);

function done(err) {
if (!cbCalled) {
cb(err);
cbCalled = true;
}
}
}

module.exports = copyFile;
