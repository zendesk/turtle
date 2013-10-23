describe('Remote testing the http server', function() {

  it('prerequisites: jQuery ($) should exist', function() {

    if(typeof $ == 'undefined') {
      throw new Error("Missing jQuery ($)");
    }

  })

  it('$.get should return with no failure', function(done) {

    $.get('http://localhost:4200/')
      .success(function(data) {
        console.log(data);
        done();
      })
      .fail(function(err) {
        done(new Error(JSON.stringify(err)));
      })

  })

})