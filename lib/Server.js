
var childProcess = require('child_process');
var fs            = require('fs');

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

  var serverProcess;

  this.start = function(serverStartedCallback) {
    var stdio = !config.log ? 'inherit' : 'pipe';

    if (config.log && config.log.silent) {
      stdio = 'ignore';
    }

    serverProcess = childProcess.fork(config.path, config.args || [], { stdio: stdio });

    serverProcess.on('error', function(err) {
      console.error('Error while running the server at ['+config.path+']');
      throw(err);
    });

    serverProcess.on('message', function(message) {
      if (message.action == 'started') {
        serverStartedCallback();
      }
    });

    if (stdio == 'pipe') {
      serverProcess.stdout.on('data', function(data) {
        process.stdout.write(config.log.prefix + data.toString('utf8'));
      });
      serverProcess.stderr.on('data', function(data) {
        process.stderr.write(config.log.prefix + data.toString('utf8'));
      });
    }
  };

  function exit() {
    if(serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  }

  process.on('exit', exit);

  this.stop = exit;
}

module.exports = Server;
