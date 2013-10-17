## What it is

Turtles handles server start/shutdown and client side test in a headless browser (mocha-phantomjs).


## Requirements

- run client code in a browser (or a simulated one) & tests independent of node.js context
- have client and server run in different contexts
- Have 2 clients run in different contexts

## Usage

Allows to start multiple clients, with multiple templates (optional).


```
  var Turtle = require('turtle');
  new Turtle()

    .server({ // server is optional
      path: __dirname + 'node_modules/radar/server.js',
      args: ['--port', '10000']
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

## turtle.server(options)

A server is a child process started before the tests.

### parameters
#### options:Object

- path:String the file path of the node.js server entry point.
- args:Array a list of arguments to pass to the child process. The format is the same as arguments in childProcess.spawn()
- log:Object
  - prefix:String prefix the server logs with this string
  - silent:Boolean do not show the server logs in stdout or stderr

## turtle.client()

A client is an instance of headless browser. There is always one default client. Each client is started in a forked
process. They are independent and there is no guaranty that they will run at exactly the same time.

## turtle.template(options)

A template is a HTML wrapper that embeds tests. It should include all the javascript libraries that are needed by the
tests.

### parameters
#### options:Object

- path:String the file path of the template

### example

```
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="../node_modules/mocha/mocha.css" />
  </head>
  <body>
    <div id="mocha"></div>
    <script src="../lib/custom_library1.js"></script>
    <script src="../lib/custom_library2.js"></script>
    <script src="../node_modules/mocha/mocha.js"></script>
    <script>
      mocha.ui('exports');
    </script>
    {{#each .}}
      <script>{{.}}</script>
    {{/each}}
    <script>
      if (window.mochaPhantomJS) { mochaPhantomJS.run(); }
      else { mocha.run(); }
    </script>
    </body>
  </html>
```

Turtle currently uses ```mocha-phantomjs``` so you should always at least include mocha in your template. The following
snippet is very important as it tells turtle where to insert your tests:

```
  {{#each .}}
    <script>{{.}}</script>
  {{/each}}
```

In the background, turtle will generate the test file in the same directory as your template. This file is automatically
deleted when turtle is done.

Templates are tied to a client. If you define only one template, every client will use the same template but you could
declare a different template for each client.

## turtle.test(options)

Add one or several tests to the current client.

### parameters
#### options:Object

- path:String directory or filename
- match:RegExp a regular expression against which file names are tested. Matching files are included.

## turtle.run([callback])

Effectively run the tests.

### parameters
#### callback (optional)

The callback takes one argument which is an exit code. If zero, all tests are successful. If different than zero, at
least one of the tests failed.

When no callback is defined the process will exit with an exit code different than zero if there is a test failure.


## TODO

- support for multiple servers, more tests