var Turtle = require("../index.js");


var tests = [];

new Turtle().server({
    path: __dirname + '/server/always_ok_server.js',
    args: ['--port', '4200'],
    started: /^Server started/img
  })
  .template({
    path: __dirname + '/template/jQueryTemplate.html'
  })
  .test({
    path: __dirname + "/client",
    filter: /\.test1\.client\.js$/im
  })

  .client()
  .template({
    path: __dirname + '/template/globalVariableTemplate.html'
  })
  .test({
    path: __dirname + "/client/global_variable.test2.client.js"
  })
  .debug()
  .run();