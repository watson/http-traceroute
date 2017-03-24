var test = require('tape')
var Trace = require('..')

test('URL Shorteners', function (t) {
  t.skip('Twitter (t.co)', function (t) {
    t.test('should receive 3xx redirect for "https://t.co/fW61qZgOWm"', function () {
      new Trace('https://t.co/fW61qZgOWm')
        .resume().once('end', function () {
          t.ok(this.statusCode < 400 && this.statusCode >= 300, 'HTTP ' + this.statusCode)
          t.end()
        })
    })

    t.test('should receive 3xx redirect for "t.co/fW61qZgOWm"', function () {
      new Trace('t.co/fW61qZgOWm')
        .resume().once('end', function () {
          t.ok(this.statusCode < 400 && this.statusCode >= 300, 'HTTP ' + this.statusCode)
          t.end()
        })
    })
  })

  t.test('New York Times (nyti.ms)', function (t) {
    t.test('should see tracking cookies from "nyti.ms/1QETHgV"', function () {
      new Trace('nyti.ms/1QETHgV')
        .resume().once('end', function () {
          t.equal(this.statusCode, 200)
          t.end()
        })
    })
  })

  t.test('Bit.ly', function (t) {
    t.test('should see 1 more hop after "http://bit.ly/berlin-nodejs-meetup"', function () {
      var hops = 0
      new Trace('bit.ly/berlin-nodejs-meetup')
        .on('data', function () { hops++ })
        .once('end', function () {
          t.equal(this.statusCode, 200)
          t.ok(hops > 1)
          t.end()
        })
    })
  })
})

test('Workarounds', function (t) {
  t.test('User-Agent', function (t) {
    t.test('Facebook should not redirect to "facebook.com/unsupportedbrowser"', function () {
      var lastHop = null
      new Trace('facebook.com')
        .on('data', function (hop) {
          t.ok(/facebook.com\/unsupportedbrowser/.test(hop) === false)
          lastHop = hop
        })
        .once('end', function () {
          t.equal(this.statusCode, 200)
          t.equal('https://www.facebook.com', lastHop.url)
          t.end()
        })
    })
  })
})
