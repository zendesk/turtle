

describe('booby trap', function() {

  // never call 'done' but put it as parameter for mocha to think the test is asynchronous
  it('should be a failing test', function(done) {
    setTimeout(function() {
      throw new Error("The test fell in the booby trap !!");
    }, 500);
  })

})
