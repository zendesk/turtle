var fs              = require('fs');
var path            = require('path');
var wrench          = require('wrench');
var serial          = require('serial');
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

  var serverOptions;
  var currentTemplate;

  var serverProcess;

  process.on('exit', function() {
    stopServer();
  });

  // Array of array of tests.
  // - the first dimension represents a single client
  // - the second dimension (nested) is the list of tests to be run in this client
  var clients = [];
  var currentClient = {
    template: null,
    tests: []
  };
  clients.push(currentClient);

  function startServer(serverOptions, serverStartedCallback) {
    if(serverOptions && serverOptions.path) {

      debug('Starting server');

      var options = [serverOptions.path];

      if(serverOptions.args) {

        for(var i = 0 ; i < serverOptions.args.length ; i++) {

          options.push(serverOptions.args[i]);

        }

      }

      serverProcess = child_processes.spawn('node', options, {cwd: process.cwd(), env: process.env});

      var serverLogsPrefix = '';
      if(serverOptions.log && serverOptions.log.prefix) {
        serverLogsPrefix = serverOptions.log.prefix;
      }

      serverProcess.stdout.on('data', function(data) {
        if(!serverOptions.log || !serverOptions.log.silent) {
          process.stdout.write(serverLogsPrefix + data.toString('utf8'));
        }
      })
      serverProcess.stderr.on('data', function(data) {
        if(!serverOptions.log || !serverOptions.log.silent) {
          process.stderr.write(serverLogsPrefix + data.toString('utf8'));
        }
      })

      switch(typeof serverOptions.started) {
        case 'object':
          if(serverOptions.started instanceof RegExp) {
            listenForStartedRegExp(serverProcess, serverOptions.started, function() {
              serverStartedCallback();
            })
          } else {
            throw new Error('Expected the server.started option to be a regular expression');
          }
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

  // this is ugly. close your eyes.
  function listenForStartedRegExp(serverProcess, startedRegExp, callback) {
    var stdout = '';
    var stderr = '';
    register = false;

    serverProcess.stdout.on('data', listenStdout)
    serverProcess.stderr.on('data', listenStderr)

    function done() {
      stdout = null;
      stderr = null;
      serverProcess.stdout.removeListener('data', listenStdout);
      serverProcess.stderr.removeListener('data', listenStderr);
      callback();
    }

    function listenStdout(data) {
      stdout += data.toString('utf8');
      if(startedRegExp.test(stdout)) {
        done()
      }
    }

    function listenStderr(data) {
      stderr += data.toString('utf8');
      if(startedRegExp.test(stderr)) {
        done()
      }
    }
  }

  function stopServer() {
    if(serverProcess) {
      serverProcess.kill();
    }
  }

  function runTests(templateOptions, tests, callback) {

    if(tests && tests.length > 0 && templateOptions && templateOptions.path) {

      var generatedTemplateFilePath = generateHtmlWrapper(templateOptions, tests);

      var processHandle = child_processes.spawn(
        __dirname + '/node_modules/mocha-phantomjs/bin/mocha-phantomjs',
        [
          generatedTemplateFilePath,
          '-s',
          'webSecurityEnabled=false',
          '-s',
          'localToRemoteUrlAccessEnabled=true',
          '--path',
          __dirname + '/node_modules/phantomjs/bin/phantomjs',
          '-C'
        ],
        {
          cwd: process.cwd(),
          stdio: 'inherit'
        }
      );

      processHandle.on('close', function (code) {
        // TODO: Automate keepTestFile: only delete file on test success then on test failure, rename file so that we don't keep creating a new one for each failed test
        if(!keepTestFile) {
          fs.unlinkSync(generatedTemplateFilePath);
        }
        callback(code);
      });

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
   *                log
   *                    prefix - prefix server's logs with this string (don't forget a trailing space)
   *                    silent - do not output server's logs
   *
   * A server is run with your `cwd` and your current environment variables.
   *
   * @returns {Turtle}
   */
  this.server = function(options) {
    if(serverOptions) {
      throw new Error('Server cannot be defined more than once.');
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
    currentTemplate = options;
    if(!currentClient.template) {
      currentClient.template = currentTemplate;
    } else {
      throw new Error('The current client already has a template. Templates should always be declared after a client');
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
    currentClient.tests.push(options);
    return this;
  };

  /** Declares a new client.
   * All subsequent test() calls will add test to the latest declared client.
   */
  this.client = function() {
    if(!currentClient.template) {

      throw new Error('You need to declare a template before declaring a new client');

    } else if(currentClient.tests.length > 0) { // we do not want to create clients with no test because it does not make sense

      currentClient = {
        tests: []
      };
      clients.push(currentClient);

    }
    return this;
  }

  /** Actually run the tests
   *
   * @param callback(exitCode) - optional. The process will exit when all tests are done if there is no callback.
   *                            The exit code reflects the tests exit code: `0` on success.
   */
  this.run = function(callback) {

    if(currentTemplate !== currentClient.template) {
      throw new Error('A template was declared but there is no subsequent client to use this template. Either remove this template or declare a new client to use with this template.');
    }
    if(currentClient.tests.length === 0) {
      throw new Error('There is no tests associated with the latest client (could be the default client if you did not explicitely declared a client)');
    }

    startServer(serverOptions, function () {

      var r = new serial.ParallelRunner();

      var previousTemplate; // we want to propagate templates to the subsequent clients unless they have their own template

      for(var i = 0 ; i < clients.length ; i++) {
        debug('running client ['+i+']')
        if(!clients[i].template) {
          clients[i].template = previousTemplate;
        } else {
          previousTemplate = clients[i].template;
        }

        if(clients[i].tests.length > 0) {
          r.add(runTests, clients[i].template, clients[i].tests);
        }

      }

      r.run(function(exitCodes) {
        stopServer();

        // don't actually care about the worse exit code. Just need to know if there was one failure.
        var worseExistCode = 0;
        for(var i = 0 ; i < exitCodes.length ; i++) {
          if(exitCodes[i] > 0) {
            worseExistCode = exitCodes[i];
            break;
          }
        }

        if(callback) {
          callback(worseExistCode);
        } else {
          process.exit(worseExistCode);
        }
      });

    });
  };

  this.debug = function() {
    debugEnabled = true;
    return this;
  };

  var keepTestFile = false;
  this.keepTestFile = function() {
    keepTestFile = true;
    return this;
  };

  var debugEnabled = false;

  function debug(msg) {
    if(debugEnabled) {
      console.log('turtle - ' + msg);
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

  function extractFilesContent(fileOrDirPath, regExp) {
    var contents = [];
    if(fileOrDirPath) {

      var fileOrDirPath = path.normalize(fileOrDirPath);
      var stats = fs.statSync(fileOrDirPath);

      debug('Looking for tests into path ['+fileOrDirPath+']');

      if(stats.isFile() && (!regExp || (regExp instanceof RegExp && regExp.test(fileOrDirPath)))) {

        debug('File ['+fileOrDirPath+'] is included')
        contents.push(new handlebars.SafeString(fs.readFileSync(fileOrDirPath, 'utf8')));

      } else if(stats.isDirectory()) {

        var fileNames = wrench.readdirSyncRecursive(fileOrDirPath);

        for(var i = 0 ; i < fileNames.length ; i++) {
          // TODO: I don't like this duplication of code but don't care much right now.

          var filePath = path.normalize(fileOrDirPath + path.sep + fileNames[i]);
          stats = fs.statSync(filePath);

          if(stats.isFile() && (!regExp || regExp.test(filePath))) {

            debug('File ['+filePath+'] is included')
            contents.push(new handlebars.SafeString(fs.readFileSync(filePath, 'utf8')));

          } else {
            debug('Path ['+filePath+'] is excluded')
          }
        }

      } else {
        // TODO: log.debug() that either this file is unsupported or does not match regexp
      }

    }
    return contents;


  }

}


module.exports = Turtle;