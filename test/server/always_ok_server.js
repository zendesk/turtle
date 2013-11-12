var http = require('http');

var program = require('commander');

program
  .version('0.0.1')
  .option('-p, --port <n>', 'the listening port of the HTTP server', parseInt)
  .parse(process.argv);

var port = program.port || 4200;

server = http.createServer(function(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write('ok');
  res.end();
});

server.listen(port, function() {
  console.log("Server started at port ["+port+"]");
});