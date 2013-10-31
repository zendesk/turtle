var Turtle = require('../index.js');

var turtle = new Turtle();

turtle.server({
  path: __dirname + '/server/always_ok_server.js',
  args: ['--port', '4200']
});

console.log('*************************** START');
console.log('The following 1 error is OK');

turtle.client().
  template({
    path: __dirname + '/template/globalVariableTemplate.html'
  }).
  test({
    path: __dirname + '/client/global_variable.test2.client.js'
  });

turtle.client().
  template({
    path: __dirname + '/template/jQueryTemplate.html'
  }).
  // use delayed booby trap to make sure that this test finished after the successful one
  test({
    path: __dirname + '/client/delayed.booby.trap.js'
  });

turtle.run(function(exitCode) {

  console.log('The previous 1 error is OK');
  console.log('************************** END');

  if(exitCode != 1) {
    throw new Error('Exit code expected to be (1) but was ('+exitCode+')');
  }

});
