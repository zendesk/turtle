describe('Remote testing the server behaviour', function() {

  it('$.get should return "ok"', function(done) {

    $.get('http://localhost:4201/')
      .success(function(data) {
        if(data === 'ok') {
          done();
        } else {
          done(new Error('Expected the returned data to be "ok" but it was "'+data+'"'));
        }
      })
      .fail(function(err) {
        done(new Error(JSON.stringify(err)));
      })

  })

})