var Turtle = require("../");

var turtle = new Turtle();

turtle.server({
  path: __dirname + '/server/always_ok_server.js',
  args: ['--port', '4200'],
  started: /^Server started/img
});

turtle.template({
  name: 'jQuery',
  scripts: [
    __dirname + '/lib/jQuery.js'
  ]
});

turtle.template({
  name: 'globalVariable',
  scripts: [
    __dirname + '/lib/globalVariable.js'
  ]
});

turtle.export(module);