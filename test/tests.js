
var turtle = require('./testEnvironment.js');

turtle.client('jQuery').
  setName('jQuery').
  test({
    path: __dirname + "/client",
    filter: /\.test1\.client\.js$/im
  });

turtle.client('globalVariable').
  setName('globalVariable').
  test({
    path: __dirname + "/client/global_variable.test2.client.js"
  });

//turtle.stayUpWhenDone();

turtle.run();
