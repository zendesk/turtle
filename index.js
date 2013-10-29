var fs              = require('fs');
var serial          = require('serial');
var Server          = require('./lib/Server.js');
var Client          = require('./lib/Client.js');

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

  process.on('exit', function() {
    if(server) {
      server.stop();
    }
  });

  var server;

  var clients = [];

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
    if(server) {
      throw new Error('Server cannot be defined more than once.');
    } else {
      server = new Server(options);
    }
    return this;
  }

  /** Declares a new client.
   * All subsequent test() calls will add test to the latest declared client.
   */
  this.client = function() {
    var client = new Client();
    clients.push(client);
    return client;
  }

  /** Actually run the tests
   *
   * @param callback(exitCode) - optional. The process will exit when all tests are done if there is no callback.
   *                            The exit code reflects the tests exit code: `0` on success.
   */
  this.run = function(callback) {

    server.start(function () {

      var r = new serial.ParallelRunner();

      var previousTemplate; // we want to propagate templates to the subsequent clients unless they have their own template

      for(var i = 0 ; i < clients.length ; i++) {

        if(!clients[i].template) {
          clients[i].template = previousTemplate;
        } else {
          previousTemplate = clients[i].template;
        }

        r.add(clients[i].run);

      }

      r.run(function(exitCodes) {

        server.stop();

        // don't actually care about the worse exit code. Just need to know if there was at least one failure.
        var worseExistCode = 0;
        if(exitCodes) {
          for(var i = 0 ; i < exitCodes.length ; i++) {
            if(exitCodes[i] !== 0) {
              worseExistCode = exitCodes[i];
              break;
            }
          }
        }

        if(callback) {
          callback(worseExistCode);
        } else {
          process.exit(worseExistCode);
        }
      });
    });
  }

}


module.exports = Turtle;