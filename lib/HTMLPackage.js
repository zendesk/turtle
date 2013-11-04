
var fs              = require('fs');
var path            = require('path');
var wrench          = require('wrench');
var temp            = require('temp');
//temp.track()

function HTMLPackage() {

  var tempDirPath = temp.mkdirSync('turtle_')
  var files = {};

  this.add = function(directory, filePath) {

    if(!files[directory]) {
      files[directory] = [];
    }

    var fileName = path.basename(filePath);

    var directoryFullPath = path.normalize(tempDirPath + '/' + directory);

    if(!fs.existsSync(directoryFullPath)) {
      wrench.mkdirSyncRecursive(directoryFullPath);
    }

    copyFile(filePath, directoryFullPath + '/' + fileName);
    return path.normalize(directory + '/' + fileName);
  }

  this.addContent = function(directory, fileName, content) {

    var directoryFullPath = path.normalize(tempDirPath + '/' + directory);

    fs.writeFileSync(directoryFullPath + '/' + fileName, content);

    return path.normalize(directory + '/' + fileName);
  }

  this.path = function() {
    return tempDirPath;
  }

  this.remove = function() {
    temp.cleanup();
  }
}

function copyFile(from, to) {
  fs.writeFileSync(to, fs.readFileSync(from));
}

module.exports = HTMLPackage