
var turtle = require('./testEnvironment.js');

turtle.client('jQuery').
  test({
    path: __dirname + "/client",
    filter: /\.test1\.client\.js$/im
  });

turtle.client('globalVariable').
  test({
    path: __dirname + "/client/global_variable.test2.client.js"
  });

turtle.run();