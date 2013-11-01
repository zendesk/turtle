## What it is

Turtles handles server start/shutdown and client side test in a headless browser (mocha-phantomjs).

This module is still work in progress.


## Requirements

- run client code in a browser (or a simulated one) & tests independent of node.js context
- have client and server run in different contexts
- Have 2 clients run in different contexts

## Usage

Allows to start multiple clients, with multiple templates (optional).


```
  var Turtle = require('turtle');

  var turtle = new Turtle();

  turtle.server({
    path: __dirname + '/server/always_ok_server.js',
    args: ['--port', '4200'],
    started: /^Server started/img
  });

  turtle.template({
    name: 'myJQueryTemplate',
    scripts: [
      __dirname + '/lib/jQuery.js'
    ]
  });

  turtle.client('myJQueryTemplate').
    test({
      path: __dirname + "/client",
      filter: /\.test1\.client\.js$/im
    });

  turtle.client('myJQueryTemplate').
    test({
      path: __dirname + "/client/global_variable.test2.client.js"
    });

  turtle.run();
```

## Turtle

This is the main test runner

### turtle.server(options)

A server is a child process started before the tests.

#### parameters
##### options:Object

- path:String the file path of the node.js server entry point.
- args:Array a list of arguments to pass to the child process. The format is the same as arguments in
childProcess.spawn()
- log:Object
  - prefix:String prefix the server logs with this string
  - silent:Boolean do not show the server logs in stdout or stderr

### turtle.client(templateName)
#### parameters

- templateName:String the name of the template to use for this client. Templates are declared for each turtle instance

Creates and returns the new client for chaining.

A ```Client``` is an instance of headless browser. There is always one default client. Each client is started in a
forked process. They are independent and there is no guaranty that they will run at exactly the same time.

### turtle.template(options)

A template is a HTML wrapper that embeds tests. It should include all the javascript libraries that are needed by the
tests.

In the background, turtle will generate the test file in the tmp directory of your OS. This file is automatically
deleted when turtle is done.

Templates are tied to a client. If you define only one template, every client will use the same template but you could
declare a different template for each client.

Turtle automatically embeds mocha and uses the 'bdd' test format.

#### parameters
##### definition:Object

- name: A name for this template
- css: any CSS script to embed in the template. The order may matter and will be respected by turtle
- scripts: any JS script to embed in the template. The order may matter and will be respected by turtle

##### override:String

The name of a template to override. Any file added will be appended to the already defined ones.

#### example

```
  turtle.template({
    name: 'templateName',
    css: [
      'maybe/a/path/to/mocha.css'
    ],
    scripts: [
      '../path/to/my/included/library.js',
      './another/path/to/another/lib.js'
    ]
  })
```

Then the override:

```
  turtle.template({
    name: 'overridenTemplateName',
    override: 'templateName',
    scripts: [
      './another/path/to/another/lib.js'
    ]
  })
```

### turtle.export(module)

Exports itself to the module passed in parameter. It allows to reuse templates and server definitions. See the tests for
an example.

### turtle.run([callback])

Effectively run the tests.

#### parameters
##### callback (optional)

The callback takes one argument which is an exit code. If zero, all tests are successful. If different than zero, at
least one of the tests failed.

When no callback is defined the process will exit with an exit code different than zero if there is a test failure.

## Client

### client.test(options)

Add one or several tests to the current client.

#### parameters
##### options:Object

- path:String directory or filename
- match:RegExp a regular expression against which file names are tested. Matching files are included.

### client.keepTestFile()

Do not delete the html test files after the tests have ended. Using this will output the path of the test files in the
console.


## TODO

- support for multiple servers, more tests


## Copyright and License

Copyright 2013, Zendesk Inc.
Licensed under the Apache License Version 2.0, http://www.apache.org/licenses/LICENSE-2.0