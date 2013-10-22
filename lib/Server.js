
var child_process = require('child_process');
var fs            = require('fs');

var DEFAULT_SERVER_STARTED_CONDITION = 1000;

function Server(config) {
  if(!config) {
    throw new Error('config is a required argument to declare a server');
  }
  if(!config.path) {
    throw new Error('config.path is a required argument to declare a server');
  }

  if(!fs.existsSync(config.path)) {
    throw new Error('Cannot create a server because the path used could not be found ['+config.path+']');
  }

  var childProcess;

  this.start = function(serverStartedCallback) {

      var options = [config.path];

      if(options.args) {
        for(var i = 0 ; i < options.args.length ; i++) {
          options.push(options.args[i]);
        }
      }

    childProcess = child_process.spawn('node', options, {cwd: process.cwd(), env: process.env});

    childProcess.on('error', function(err) {
      console.error('Error while running the server at ['+config.path+']');
      throw(err);
    });

    attachToLogs(options.log);

    switch(typeof config.started) {
      case 'object':
        if(config.started instanceof RegExp) {
          listenForStartedRegExp(childProcess, config.started, function() {
            serverStartedCallback();
          })
        } else {
          throw new Error('Expected the server.started option to be a regular expression');
        }
        break;
      case 'number':
        setTimeout(serverStartedCallback, config.started);
        break;
      default:
        setTimeout(serverStartedCallback, DEFAULT_SERVER_STARTED_CONDITION);
        break;
    }
  };

  this.stop = function() {
    if(childProcess) {
      childProcess.kill();
      childProcess = null;
    }
  };

  function attachToLogs(logOptions) {

    var serverLogsPrefix = '';
    if(logOptions && logOptions.prefix) {
      serverLogsPrefix = logOptions.prefix;
    }

    childProcess.stdout.on('data', function(data) {
      if(!logOptions || !logOptions.silent) {
        process.stdout.write(serverLogsPrefix + data.toString('utf8'));
      }
    })
    childProcess.stderr.on('data', function(data) {
      if(!logOptions || !logOptions.silent) {
        process.stderr.write(serverLogsPrefix + data.toString('utf8'));
      }
    })
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
}

module.exports = Server;
