var http = require('http');

var port = 4200;

server = http.createServer(function(req, res) {
  res.write('ok');
  res.end();
});

server.listen(port, function() {
  console.log("Server started at port ["+port+"]");
});