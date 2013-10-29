
var fs              = require('fs');
var path            = require('path');
var wrench          = require('wrench');
var handlebars      = require('handlebars');
var child_processes = require('child_process');

function Client() {

  var template;
  var tests = [];
  var keepTestFile = false;

  var self = this;

  /** Defines the html template to run the tests into.
   *
   * default: the default template only includes the mocha library.
   *
   * @param options:
   *                path - the path to the template file to use
   * @returns {Turtle}
   */
  this.template = function(options) {
    if(!template) {
      if(!options || !options.path) throw new Error('template options must contain a path.')
      template = options;
    } else {
      throw new Error('This client already has a template. Templates should always be declared after a client');
    }
    return this;
  }

  this.hasTests = function() {
    return (tests.length > 0);
  }

  /** adds a test to the suite
   *
   * @param test:
   *            path - file path or directory path. If a directory, the lookup is recursive
   *            filter - an 'include' RegExp object. Files which match will be added to the executed tests
   *
   * @returns {Turtle}
   */
  this.test = function(test) {
    tests.push(test);
    return this;
  }

  this.keepTestFile = function() {
    keepTestFile = true;
    return this;
  }

  /**
   *
   * @param callback(exitCode)
   */
  this.run = function(callback) {

    if(self.hasTests()) {

      var generatedTemplateFilePath = generateHtmlWrapper(template, tests);

      var processHandle = child_processes.spawn(
        __dirname + '/../node_modules/mocha-phantomjs/bin/mocha-phantomjs',
        [
          generatedTemplateFilePath,
          '-s',
          'webSecurityEnabled=false',
          '-s',
          'localToRemoteUrlAccessEnabled=true',
          '--path',
          __dirname + '/../node_modules/phantomjs/bin/phantomjs',
          '-C'
        ],
        {
          cwd: process.cwd(),
          stdio: 'inherit'
        }
      );

      processHandle.on('error', function(err) {
        console.error('Error executing the client with template ['+template.path+']');
        console.error(err)
      })

      processHandle.on('close', function (code) {
        // TODO: Automate keepTestFile: only delete file on test success then on test failure, rename file so that we don't keep creating a new one for each failed test
        if(!keepTestFile) {
          fs.unlinkSync(generatedTemplateFilePath);
        }
        callback(code);
      });

    } else {
      console.log('skipping client because it contains no test');
      setImmediate(callback);
    }
  }

  function extractFilesContent(fileOrDirPath, regExp) {
    var contents = [];
    if(fileOrDirPath) {

      var fileOrDirPath = path.normalize(fileOrDirPath);
      var stats = fs.statSync(fileOrDirPath);

      console.log('Looking for tests into path ['+fileOrDirPath+']');

      if(stats.isFile() && (!regExp || (regExp instanceof RegExp && regExp.test(fileOrDirPath)))) {

        console.log('File ['+fileOrDirPath+'] is included')
        contents.push(new handlebars.SafeString(fs.readFileSync(fileOrDirPath, 'utf8')));

      } else if(stats.isDirectory()) {

        var fileNames = wrench.readdirSyncRecursive(fileOrDirPath);

        for(var i = 0 ; i < fileNames.length ; i++) {
          // TODO: I don't like this duplication of code but don't care much right now.

          var filePath = path.normalize(fileOrDirPath + path.sep + fileNames[i]);
          stats = fs.statSync(filePath);

          if(stats.isFile() && (!regExp || regExp.test(filePath))) {

            console.log('File ['+filePath+'] is included')
            contents.push(new handlebars.SafeString(fs.readFileSync(filePath, 'utf8')));

          }
        }

      } else {
        // TODO: log.debug() that either this file is unsupported or does not match regexp
      }

    }
    return contents;


  }

  /** Transforms filename.ext into filename.N.ext where N starts at 1 and ends when the file name does not already exist.
   * The reason for this is to prevent a template from being overwritten when it is used by multiple tests at the same
   * time.
   */
  function getUnusedFileName(originalFileName, count) {

    var newFileName = originalFileName;

    if(count) {

      var dirName = path.dirname(originalFileName);
      var extension = path.extname(originalFileName);
      newFileName = dirName + path.sep + path.basename(originalFileName, extension) + '.' + count + extension;
      count++;

    } else {
      count = 1;
    }

    if(fs.existsSync(newFileName)) {
      return getUnusedFileName(originalFileName, count);
    } else {
      return newFileName;
    }
  }

  function generateHtmlWrapper(templateOptions, tests) {

    var testContents = [];

    // retrieve all the tests referenced
    for(var i = 0 ; i < tests.length ; i++) {
      if(tests[i] && tests[i].path) {
        testContents = testContents.concat(extractFilesContent(tests[i].path, tests[i].filter));
      }
    }

    var testWrapperTemplate = fs.readFileSync(templateOptions.path, 'utf8');

    var aggregatedHTMLTests = handlebars.compile(testWrapperTemplate)(testContents);//{tests: testContents});

    var templateDirName = path.dirname(templateOptions.path);
    var extension = path.extname(templateOptions.path);
    var compiledFileName = getUnusedFileName(templateDirName + path.sep + 'safe_to_delete.' + path.basename(templateOptions.path, extension) + '.turtle' + extension);

    fs.writeFileSync(compiledFileName, aggregatedHTMLTests, 'utf8');

    return compiledFileName;
  }

}

module.exports = Client;