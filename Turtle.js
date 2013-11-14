var fs              = require('fs');
var serial          = require('serial');
var _               = require('underscore')
var Server          = require('./lib/Server.js');
var Client          = require('./lib/Client.js');
var FileServer      = require('./lib/FileServer.js');
var logger          = require('./lib/Logger.js')('turtle');
/**
 *
 * @param options:
 *                server - the path to the server entry point
 *                testDir - the directory containing the UI tests to run
 *                template - the path to the template
 *
 * @constructor
 */
function Turtle(port) {

  var templates = {};
  port = port || 8686;
  var stayUpWhenDone = false;

  var servers = [];
  var fileServer;
  var clients = [];

  process.on('exit', function() {
    stopServers()
  });

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
    servers.push(new Server(options));
    return this;
  };

  /** define a new template
   *
   * @param def the new template definition
   * @param override (optional) the name of the template to override
   */
  this.template = function(def) {
    if(!def.name) {
      throw new Error('[name] is a mandatory field');
    }
    if(templates.hasOwnProperty(def.name)) {
      throw new Error('A template with name ['+def.name+'] already exists. The names bust be unique in a turtle instance.');
    }
    if(def.override && !templates.hasOwnProperty(def.override)) {
      throw new Error('Could not find a template to override with the following name ['+def.override+']');
    }

    // it's cleaner code everywhere else if we ensure all templates have non undefined values
    if(!def.scripts) {
      def.scripts = [];
    }
    if(!def.css) {
      def.css = [];
    }

    if(def.override) {
      templates[def.name]         = _.clone(templates[def.override]);
      templates[def.name].name    = def.name;
      templates[def.name].scripts = templates[def.name].scripts.concat(def.scripts);
      templates[def.name].css     = templates[def.name].scripts.concat(def.css);
    } else {
      templates[def.name]         = def;
    }
  };

  /** Declares a new client.
   * All subsequent test() calls will add test to the latest declared client.
   */
  this.client = function(options) {
    if(!options.name) {
      options.name = 'client' + (clients.length + 1); // this is not for an array, we start at 1
    }
    var client = new Client(options);
    clients.push(client);
    return client;
  };

  this.export = function(module) {
    module.exports = this;
  };

  this.stayUpWhenDone = function() {
    stayUpWhenDone = true;
  };

  /** Actually run the tests
   *
   * @param callback(exitCode) - optional. The process will exit when all tests are done if there is no callback.
   *                            The exit code reflects the tests exit code: `0` on success.
   */
  this.run = function(callback) {

    startServers(function () {

      if(fileServer) {
        fileServer.stop()
      }
      fileServer = new FileServer(port);
      for(var i = 0 ; i < clients.length ; i++) {
        fileServer.addClient(clients[i])
      }
      fileServer.start(function() {

        var r = new serial.ParallelRunner();

        var previousTemplate; // we want to propagate templates to the subsequent clients unless they have their own template

        for(var i = 0 ; i < clients.length ; i++) {

          if(templates.hasOwnProperty(clients[i].getTemplateName())) {
            clients[i].setTemplate(templates[clients[i].getTemplateName()]);
          } else {
            throw new Error('client #'+i + ' is referencing an unregistered template named ['+clients[i].getTemplateName()+']. ' +
              'Register your templates with turtle.template({name: "'+clients[i].getTemplateName()+'", scripts: []})');
          }

          r.add(clients[i].run, 'http://localhost:'+port);

        }

        r.run(function(returnArguments) {


          // don't actually care about the worse exit code. Just need to know if there was at least one failure.
          var exitCode;

          if(returnArguments) {
            for(var i = 0 ; i < returnArguments.length ; i++) {

              exitCode = 1; // assume failure because in testing, false negative is better than false positive
              if(returnArguments[i] && returnArguments[i].length > 0) {

                var exitCode = returnArguments[i][0];

              }

              if(exitCode !== 0) {
                break;
              }
            }
          }

          if(callback) {

            stopServers();
            callback(exitCode);

          } else if(!stayUpWhenDone) {

            stopServers();
            process.exit(exitCode);

          } else {

            process.on('SIGINT', function() {
              stopServers();
              process.exit();
            });

            // TODO: print URLs
            logger.info('Tests are completed and are available at:');
            for(var i = 0 ; i < clients.length ; i++) {
              logger.info('http://localhost:' + port + '/');
            }
          }
        });
      });
    });
  };

  function startServers(callback) {
    // There may be dependencies between server. We want to support that therefore servers are started one after the
    // other
    var r = new serial.SerialRunner();

    for(var i = 0 ; i < servers.length ; i++) {
      r.add(servers[i].start)
    }

    r.run(function() {

      logger.info('Started ['+servers.length+'] server(s)');
      callback();
    });

  }

  function stopServers() {
    for(var i = 0 ; i < servers.length ; i++) {
      servers[i].stop();
    }
    if(fileServer) {
      fileServer.stop();
      fileServer = null;
    }
  }
}


module.exports = Turtle;
