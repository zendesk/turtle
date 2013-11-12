var fs      = require('fs');
var express = require('express');
var logger  = require('./Logger.js')('turtle');


function FileServer(port) {
  var app = express();
  var server;
  var clients = {};

  this.start = function(callback) {
    if(!server) {
      server = app.listen(port, function() {
        callback()
      });
    }
  };

  this.stop = function() {
    if(server) {
      server.close();
      server = null;
    }
  };

  this.addClient = function(client) {
    clients[client.name] = client;
  };

  app.get(new RegExp(".+"), function(req, res) {
    var path = req.url;

    logger.debug(req.url)

    if(clients[path.substr(1)]) {
      res.send(clients[path.substr(1)].html());
    } else if(fs.existsSync(path)) {
      res.sendfile(path);
    } else {
      res.send('Could not find file at ['+path+']', 404);
    }
  });

}

module.exports = FileServer;