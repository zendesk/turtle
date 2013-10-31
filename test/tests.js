var Turtle = require('../index.js');

var turtle = new Turtle();

turtle.server({
  path: __dirname + '/server/always_ok_server.js',
  args: ['--port', '4200']
});

turtle.client().
  template({
    path: __dirname + '/template/jQueryTemplate.html'
  }).
  test({
    path: __dirname + '/client',
    filter: /\.test1\.client\.js$/im
  });

turtle.client().
  template({
    path: __dirname + '/template/globalVariableTemplate.html'
  }).
  test({
    path: __dirname + '/client/global_variable.test2.client.js'
  });

turtle.run();
