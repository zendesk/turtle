
var turtle = require('./testEnvironment.js');

turtle.client({
    template: 'jQuery',
    name: 'jQuery'
  }).
  test({
    path: __dirname + "/client",
    filter: /\.test1\.client\.js$/im
  });

turtle.client({
    template: 'globalVariable',
    name: 'globalVariable'
  }).
  test({
    path: __dirname + "/client/global_variable.test2.client.js"
  });

//turtle.stayUpWhenDone();

turtle.run();
