var fs      = require('fs');
var url     = require('url');
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
    console.log('adding client ['+client.getName()+'] to fileserver')
    clients[client.getName()] = client;
  };

  app.get("/", function(req, res) {

    res.write('<html><body>');
    res.write('<ul>');
    for(var clientName in clients) {
      res.write('<li><a href="/client/'+clientName+'">'+clientName+'</a></li>');
    }
    res.write('</ul>');
    res.write('</body></html>');

    res.end();

  })

  app.get("/client/:clientName", function(req, res) {
    var clientName = req.param('clientName')


    var query = url.parse(req.url, true).query;

    if(clients[clientName]) {
      var clientData = clients[clientName].getRepresentation();

      if(!query.file) {
        res.send(clientData.html);
      } else {
        var idx = clientData.referencedFiles.indexOf(query.file)
        if(idx > -1) {
          res.sendfile(clientData.referencedFiles[idx])
        } else {
          logger.error('unregistered file path referenced ['+query.file+']');
          res.send('unregistered file. available files are: '+JSON.stringify(clientData.referencedFiles), 404);
        }
      }

    } else {

      res.write('Could not find client ['+clientName+']');
      res.write('<br/>');
      res.write('<br/>');
      res.write('The available clients are:');
      res.write('<br/>');
      for(var clientName in clients) {
        res.write('- ' + clientName);
        res.write('<br/>');
      }

      res.end(404);
    }
  });
}

module.exports = FileServer;