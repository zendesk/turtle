describe('Testing the template', function() {

  it('global variable exists in the template', function() {

    if(typeof globalVariable == 'undefined') {
      throw new Error("Missing globalVariable");
    }

  });

});