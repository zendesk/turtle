
var fs              = require('fs');
var path            = require('path');
var wrench          = require('wrench');
var handlebars      = require('handlebars');
var child_processes = require('child_process');
var logger          = require('./Logger.js')('turtle');

var DEFAULT_TEMPLATE_PATH = __dirname + '/../default_template.html';

function Client(options) {

  if(!options.template) {
    throw new Error('options.template is required');
  }

  var template;
  var tests = [];
  var keepTestFile = false;
  var referencedFiles = {};

  var self = this;

  this.hasTests = function() {
    return (tests.length > 0);
  };

  this.getTemplateName = function() {
    return options.template;
  };

  this.getName = function() {
    return options.name;
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

  this.hasFile = function(path) {
    return referencedFiles[path];
  };

  this.getRepresentation = function() {

    var referencedFiles = [];
    var templateContext = {
      css: [],
      scripts: [],
      tests: []
    };

    var fileReferencePrefix = options.name + '?file=';

    var cssFiles = template.css ? template.css.slice() : [];
    cssFiles.unshift(process.cwd() + '/node_modules/mocha/mocha.css');

    var scriptFiles = template.scripts ? template.scripts.slice() : [];
    scriptFiles.unshift(process.cwd() + '/node_modules/mocha/mocha.js');

    var testsFiles = [];

    var i, filePath;

    // retrieve all the tests referenced
    for(i = 0 ; i < tests.length ; i++) {
      if(tests[i] && tests[i].path) {
        testsFiles = testsFiles.concat(lookupTestFiles(tests[i].path, tests[i].filter));
      }
    }

    // build the template context

    for(i = 0 ; i < testsFiles.length ; i++) {
      filePath = path.normalize(testsFiles[i].path);

      templateContext.tests.push({ path: fileReferencePrefix + filePath });
      referencedFiles.push(filePath);
    }

    for(i = 0 ; i < scriptFiles.length ; i++) {
      filePath = path.normalize(scriptFiles[i]);
      templateContext.scripts.push({ path: fileReferencePrefix + filePath });
      referencedFiles.push(filePath);
    }

    for(i = 0 ; i < cssFiles.length ; i++) {
      filePath = path.normalize(cssFiles[i]);
      templateContext.css.push({ path: fileReferencePrefix + filePath });
      referencedFiles.push(filePath);
    }

    var testWrapperTemplate = fs.readFileSync(DEFAULT_TEMPLATE_PATH, 'utf8');

    var htmlContent = handlebars.compile(testWrapperTemplate)(templateContext);

    var representation = {
      html: htmlContent,
      referencedFiles: referencedFiles
    };

    return representation;
  };

  /**
   *
   * @param callback(exitCode)
   */
  this.run = function(serverPath, callback) {

    console.log('running test');

    if(self.hasTests()) {

      var processHandle = child_processes.spawn(
        __dirname + '/../node_modules/mocha-phantomjs/bin/mocha-phantomjs',
        [
          serverPath + '/client/'+options.name,
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
          stdio: 'pipe'
        }
      );

      processHandle.stdout.on('data', function(data) {
        data.toString().split('\n').forEach(function(line) {
          console.log('<' + options.name + '> ', line);
        });
      });

      processHandle.stderr.on('data', function(data) {
        data.toString().split('\n').forEach(function(line) {
          console.log('[' + options.name + '] ', line);
        });
      });

      processHandle.on('error', function(err) {
        logger.error('Error executing the client with template ['+template.path+']');
        logger.error(err);
      });

      processHandle.on('close', function (code) {
        callback(code);
      });

    } else {
      logger.info('skipping client because it contains no test');
      setImmediate(callback);
    }
  };

  function lookupTestFiles(fileOrDirPath, regExp) {
    var testFiles = [];
    if(fileOrDirPath) {

      fileOrDirPath = path.normalize(fileOrDirPath);
      var stats = fs.statSync(fileOrDirPath);

      logger.info('Looking for tests into path ['+fileOrDirPath+']');

      if(stats.isFile() && (!regExp || (regExp instanceof RegExp && regExp.test(fileOrDirPath)))) {

        logger.info('File ['+fileOrDirPath+'] is included');
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

            logger.info('File ['+filePath+'] is included');
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
