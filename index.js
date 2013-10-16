var fs              = require('fs');
var path            = require('path');
var temp            = require('temp');
var wrench          = require('wrench');
var cluster         = require('cluster');
var handlebars      = require('handlebars');
var child_processes = require('child_process');

var DEFAULT_SERVER_STARTED_CONDITION = 1000;

// do not run temp.track() because the temp files may be useful for debugging purposes. Let the OS do the temp directory
// cleanup as it wishes.

/**
 *
 * @param options:
 *                server - the path to the server entry point
 *                testDir - the directory containing the UI tests to run
 *                template - the path to the template
 *
 * @constructor
 */
function Turtle() {

  var generatedTemplateFilePath = '.itw.test.template.html';
  var defaultTemplateOptions  = {
    path: './default.template.html'
  };
  var defaultTestDirectory = './default.template.html';
  var defaultServerPath = 'server.js';

  var tests = [];
  var serverOptions;
  var templateOptions;

  var serverHandle;

  process.on('exit', function() {
    stopServer();
  });

  function startServer(serverOptions, serverStartedCallback) {
    if(serverOptions && serverOptions.path) {
      cluster.settings = {
        exec: 'server.js',
        silent: false
      };

      serverHandle = child_processes.spawn('node', [serverPath], {cwd: process.cwd(), env: process.env, stdio: 'inherit'});

      switch(typeof serverOptions.started) {
        case 'object':
          // TODO: support regexp
          break;
        case 'number':
          setTimeout(serverStartedCallback, serverOptions.started);
          break;
        default:
          setTimeout(serverStartedCallback, DEFAULT_SERVER_STARTED_CONDITION);
          break;
      }
    } else {
      // TODO: log server not started
      setImmediate(serverStartedCallback);
    }
  }

  function stopServer() {
    if(serverHandle) {
      serverHandle.kill();
    }
  }

  function runTests(templateOptions, tests, callback) {

    if(tests && tests.length > 0 && templateOptions && templateOptions.path) {

      generateHtmlWrapper(templateOptions, tests, function(err, generatedTemplateFilePath) {

        var processHandle = child_processes.spawn(
          'mocha-phantomjs',
          [
            generatedTemplateFilePath,
            '-s',
            'webSecurityEnabled=false',
            '-s',
            'localToRemoteUrlAccessEnabled=true'
          ],
          {
            cwd: process.cwd(),
            stdio: 'inherit'
          }
        );

        processHandle.on('close', function (code) {
          callback(code);
        });

      })
    } else {
      // TODO: log
      setImmediate(callback);
    }
  }

  /** Configure a server to be started before the tests
   *
   * @param options:
   *                path - the path to the node.js server file
   *                args - optional arguments to be passed. Format is the same as ChildProcess.spawn
   *                started - a condition for the server to be considered started. Can either be a number representing a
   *                          timeout in milliseconds or can be a RegExp which will be tested against both stdout and
   *                          stderr. Defaults to 1000.
   *
   * A server is run with your `cwd` and your current environment variables.
   *
   * @returns {Turtle}
   */
  this.server = function(options) {
    if(serverOptions) {
      throw new Error("Server can't be defined more than once, yet...");
    } else {
      serverOptions = options;
    }
    return this;
  }

  /** Defines the html template to run the tests into.
   *
   * default: the default template only includes the mocha library.
   *
   * @param options:
   *                path - the path to the template file to use
   * @returns {Turtle}
   */
  this.template = function(options) {
    if(templateOptions) {
      // TODO: allow definition of multiple templates & clients
      throw new Error("Template can't be defined more than once, yet...");
    } else {
      templateOptions = options;
    }
    return this;
  };

  /** adds a test to the suite
   *
   * @param options:
   *                path - file path or directory path. If a directory, the lookup is recursive
   *                filter - an 'include' RegExp object. Files which match will be added to the executed tests
   *
   * @returns {Turtle}
   */
  this.test = function(options) {
    tests.push(options);
    return this;
  };

  /** Actually run the tests
   *
   * @param callback(exitCode) - optional. The process will exit when all tests are done if there is no callback.
   *                            The exit code reflects the tests exit code: `0` on success.
   */
  this.run = function(callback) {
    startServer(function () {
      runTests(templateOptions, tests, function(exitCode) {
        stopServer();
        if(callback) {
          callback(exitCode);
        } else {
          process.exit(exitCode);
        }
      });
    });
  };
}

function generateHtmlWrapper(templateOptions, tests, callback) {

  var testContents = [];

  // retrieve all the tests referenced
  for(var i = 0 ; i < tests.length ; i++) {
    if(tests[i] && tests[i].path) {
      testContents = testContents.concat(extractFilesContent(tests[i].path, tests[i].filter));
    }
  }

  var testWrapperTemplate = fs.readFileSync(templateOptions.path, 'utf8');

  var aggregatedHTMLTests = handlebars.compile(testWrapperTemplate)({tests: testContents});

  // create a temporary file to store the generated template file
  temp.open('node-turtle', function(err, info) {

    if(err) {

      callback(err, undefined)

    } else {

      fs.write(info.fd, aggregatedHTMLTests);

      fs.close(info.fd, function(err) {
        callback(err, info.path);
      });

    }
  });
}

function extractFilesContent(path, regExp) {
  var contents = [];
  if(path) {

    var path = path.normalize(path);
    var stats = fs.statSync(path);

    if(stats.isFile() && (!regExp || regExp.test(path))) {

      contents.push(fs.readFileSync(path, 'utf8'));

    } else if(stats.isDirectory()) {

      var fileNames = wrench.readdirSyncRecursive(path);

      for(var i = 0 ; i < fileNames.length ; i++) {
        // TODO: I don't like this duplication of code but don't care much right now.

        path = path.normalize(fileNames[i]);
        stats = fs.statSync(path);

        if(stats.isFile() && (!regExp || regExp.test(path))) {

          contents.push(fs.readFileSync(path, 'utf8'));

        }
      }

      contents = contents.concat(childContents)

    } else {
      // TODO: log.debug() that either this file is unsupported or does not match regexp
    }

  }
  return contents;


}

module.exports = Turtle;