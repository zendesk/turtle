
var fs              = require('fs');
var path            = require('path');
var wrench          = require('wrench');
var handlebars      = require('handlebars');
var child_processes = require('child_process');
var HTMLPackage     = require('./HTMLPackage.js');

var DEFAULT_TEMPLATE_PATH = __dirname + '/../default_template.html'

function Client(templateName) {

  if(!templateName) {
    throw new Error('templateName is required');
  }

  var template;
  var tests = [];
  var keepTestFile = false;

  var self = this;

  this.hasTests = function() {
    return (tests.length > 0);
  };

  this.getTemplateName = function() {
    return templateName;
  };

  this.setTemplate = function(templateDef) {
    template = templateDef;
  };

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
  };

  this.keepTestFile = function() {
    keepTestFile = true;
    return this;
  };

  /**
   *
   * @param callback(exitCode)
   */
  this.run = function(callback) {

    if(self.hasTests()) {

      var htmlPackage = generateHtmlWrapper(template, tests);

      var indexFilePath = htmlPackage.path() + '/index.html'

      var processHandle = child_processes.spawn(
        __dirname + '/../node_modules/mocha-phantomjs/bin/mocha-phantomjs',
        [
          indexFilePath,
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
        if(!keepTestFile && code === 0) {
          htmlPackage.remove()
        } else {
          console.log('The test is at ['+indexFilePath+']')
        }
        callback(code);
      });

    } else {
      console.log('skipping client because it contains no test');
      setImmediate(callback);
    }
  };

  function generateHtmlWrapper(templateOptions, tests) {

    var htmlPackage = new HTMLPackage();
    var templateContext = {
      css: [],
      scripts: [],
      tests: []
    };

    var cssFiles = templateOptions.css ? templateOptions.css : [];
    cssFiles.unshift(__dirname + '/../node_modules/mocha/mocha.css');

    var scriptFiles = templateOptions.scripts ? templateOptions.scripts : [];
    scriptFiles.unshift(__dirname + '/../node_modules/mocha/mocha.js');

    var testsFiles = [];

    // retrieve all the tests referenced
    for(var i = 0 ; i < tests.length ; i++) {
      if(tests[i] && tests[i].path) {
        testsFiles = testsFiles.concat(extractFilesContent(tests[i].path, tests[i].filter));
      }
    }

    // build the template context
    for(var i = 0 ; i < scriptFiles.length ; i++) {
      templateContext.scripts.push({ path: htmlPackage.add('scripts', scriptFiles[i]) });
    }
    for(var i = 0 ; i < testsFiles.length ; i++) {
      templateContext.tests.push({ path: htmlPackage.add('tests', testsFiles[i].path) });
    }
    for(var i = 0 ; i < cssFiles.length ; i++) {
      templateContext.css.push({ path: htmlPackage.add('css', cssFiles[i]) });
    }

    var testWrapperTemplate = fs.readFileSync(DEFAULT_TEMPLATE_PATH, 'utf8');

    var aggregatedHTMLTests = handlebars.compile(testWrapperTemplate)(templateContext);

    htmlPackage.addContent('', 'index.html', aggregatedHTMLTests);

    return htmlPackage;
  }

  function extractFilesContent(fileOrDirPath, regExp) {
    var testFiles = [];
    if(fileOrDirPath) {

      var fileOrDirPath = path.normalize(fileOrDirPath);
      var stats = fs.statSync(fileOrDirPath);

      console.log('Looking for tests into path ['+fileOrDirPath+']');

      if(stats.isFile() && (!regExp || (regExp instanceof RegExp && regExp.test(fileOrDirPath)))) {

        console.log('File ['+fileOrDirPath+'] is included')
        testFiles.push({
          fileName: path.basename(fileOrDirPath),
          path: fileOrDirPath
        });

      } else if(stats.isDirectory()) {

        var fileNames = wrench.readdirSyncRecursive(fileOrDirPath);

        for(var i = 0 ; i < fileNames.length ; i++) {
          // TODO: I don't like this code duplication but don't care much right now.

          var filePath = path.normalize(fileOrDirPath + path.sep + fileNames[i]);
          stats = fs.statSync(filePath);

          if(stats.isFile() && (!regExp || regExp.test(filePath))) {

            console.log('File ['+filePath+'] is included')
            testFiles.push({
              fileName: path.basename(filePath),
              path: filePath
            });

          }
        }

      } else {
        // TODO: log.debug() that either this file is unsupported or does not match regexp
      }

    }
    return testFiles;
  }

}

module.exports = Client;