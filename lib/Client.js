
var fs              = require('fs');
var path            = require('path');
var wrench          = require('wrench');
var handlebars      = require('handlebars');
var child_processes = require('child_process');
var logger          = require('./Logger.js')('turtle');

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

  this.getName = function() {
    return this.name;
  }

  this.setName = function(name) {
    this.name = name;
    return this;
  }

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

  this.html = function() {
    return generateHtmlWrapper(template, tests);
  };

  /**
   *
   * @param callback(exitCode)
   */
  this.run = function(testPath, callback) {

    if(self.hasTests()) {

      var processHandle = child_processes.spawn(
        __dirname + '/../node_modules/mocha-phantomjs/bin/mocha-phantomjs',
        [
          testPath,
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
        logger.error('Error executing the client with template ['+template.path+']');
        logger.error(err)
      });

      processHandle.on('close', function (code) {
        callback(code);
      });

    } else {
      logger.info('skipping client because it contains no test');
      setImmediate(callback);
    }
  };

  function generateHtmlWrapper(templateOptions, tests) {

    var templateContext = {
      css: [],
      scripts: [],
      tests: []
    };

    var cssFiles = templateOptions.css ? templateOptions.css : [];
    cssFiles.unshift(process.cwd() + '/node_modules/mocha/mocha.css');

    var scriptFiles = templateOptions.scripts ? templateOptions.scripts : [];
    scriptFiles.unshift(process.cwd() + '/node_modules/mocha/mocha.js');

    var testsFiles = [];

    // retrieve all the tests referenced
    for(var i = 0 ; i < tests.length ; i++) {
      if(tests[i] && tests[i].path) {
        testsFiles = testsFiles.concat(lookupTestFiles(tests[i].path, tests[i].filter));
      }
    }

    // build the template context
    templateContext.tests = testsFiles;

    for(var i = 0 ; i < scriptFiles.length ; i++) {
      templateContext.scripts.push({ path: scriptFiles[i] });
    }

    for(var i = 0 ; i < cssFiles.length ; i++) {
      templateContext.css.push({ path: cssFiles[i] });
    }

    var testWrapperTemplate = fs.readFileSync(DEFAULT_TEMPLATE_PATH, 'utf8');

    var aggregatedHTMLTests = handlebars.compile(testWrapperTemplate)(templateContext);

    return aggregatedHTMLTests;
  }

  function lookupTestFiles(fileOrDirPath, regExp) {
    var testFiles = [];
    if(fileOrDirPath) {

      var fileOrDirPath = path.normalize(fileOrDirPath);
      var stats = fs.statSync(fileOrDirPath);

      logger.info('Looking for tests into path ['+fileOrDirPath+']');

      if(stats.isFile() && (!regExp || (regExp instanceof RegExp && regExp.test(fileOrDirPath)))) {

        logger.info('File ['+fileOrDirPath+'] is included')
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

            logger.info('File ['+filePath+'] is included')
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
