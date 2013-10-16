
Requirements:
- run client code in a browser (or a simulated one) & tests independent of node.js context
- have client and server run in different contexts
- Have 2 clients run in different contexts


## Usage

Allows to start multiple clients, with multiple templates (optional).

TODO: support for multiple servers, more tests

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
      .template({
        path: 'node_modules/radar_client/test/lib/custom_wrapper1.html'
      })
      .test({ path: <path_to_mocha_test_client1> })

    .client()
      .template({
        path: 'node_modules/radar_client/test/lib/custom_wrapper2.html'
      })
      .test({ path: <path_to_mocha_test_client2> })                           // these two tests
      .test({ path: <path_to_test_directory>, match: /filesFilterRegExp/i })  // are run in the same browser.client()

    .client() // this client will use the previously defined template
      .test({ path: <path_to_test_directory>, match: /filesFilterRegExp/i })
    .run();
```