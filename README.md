
Requirements:
- run client code in a browser (or a simulated one) & tests independent of node.js context
- have client and server run in different contexts
- Have 2 clients run in different contexts


## Usage


### API, step 1

Multiple clients live in the same browser:

```
  var TR = require('TestRunner');
  new TR().template({
      path: 'node_modules/radar_client/test/lib/default_wrapper.html'
    })
    .server({
      path: __dirname + '../server.js'
    })
    .test({ path: <path_to_test_directory1>, match: /filesFilterRegExp/i })
    .run();
```

### API, step 2

This allows to run 2 clients in parallel in different browser contexts

```
  var TR = require('TestRunner');
  var testRunner = new TR();
  testRunner.server({ // server is optional
      path: __dirname + '../server.js'
    })
    .client() // the two clients are run simultaneously in different child processes
      .test({ path: <path_to_mocha_test_client1> })
    .client()
      .test({ path: <path_to_mocha_test_client2> })
      .test({ path: <path_to_test_directory>, match: /filesFilterRegExp/i }) // these tests are run sequentially
    .run();
```

### API, step 3

This allows to start multiple servers. Later, we could start radar and chat_manager this way.

```
  var TR = require('TestRunner');
  var testRunner = new TR();
  testRunner
    .server({ // server is optional
      path: __dirname + 'node_modules/radar/server.js',
      args: ['--port', '10000']
    })
    .server({ // server is optional
      path: __dirname + 'node_modules/chat-manager/server.js'
    })
    .client() // Each client is started in a different phantomjs instances.
      .test({ path: <path_to_mocha_test_client1> })
    .client()
      .test({ path: <path_to_mocha_test_client2> })                           // these two tests
      .test({ path: <path_to_test_directory>, match: /filesFilterRegExp/i })  // are run in the same browser
    .run();
```