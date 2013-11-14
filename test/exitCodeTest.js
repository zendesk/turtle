
var turtle = require('./testEnvironment.js');

turtle.client({
    template: 'globalVariable'
  }).
  test({
    path: __dirname + "/client/global_variable.test2.client.js"
  });

turtle.client({
    template: 'jQuery'
  }).
  // use delayed booby trap to make sure that this test finished after the successful one
  test({
    path: __dirname + "/client/delayed.booby.trap.js"
  });

turtle.stayUpWhenDone();

console.log('*************************** START');
console.log('The following 1 error is OK');

turtle.run(function(exitCode) {

  console.log('The previous 1 error is OK');
  console.log('************************** END');

  if(exitCode != 1) {
    throw new Error('Exit code expected to be (1) but was ('+exitCode+')');
  }

});