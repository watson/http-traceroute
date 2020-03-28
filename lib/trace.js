'use strict'

var Stream = require('readable-stream')
var inherit = require('util').inherits
var http = require('http')
var https = require('https')
var http2 = require('http2')
var URL = require('url').URL
var normalizeUrl = require('normalize-url')
var Cookies = require('cookie-manager')

/**
 * Trace
 * @constructor
 * @return {Trace}
 */
function Trace (url, options) {
  if (!(this instanceof Trace)) {
    return new Trace(url, options)
  }

  options = options != null ? options : {}
  options.objectMode = true

  Stream.Readable.call(this, options)

  this.hops = 0
  this.maxHops = options.maxHops || 10
  this.start = 0
  this.time = 0
  this.url = url
  this.currentUrl = url
  this.prevUrl = null
  this.statusCode = 0
  this.cookies = new Cookies()
  this.userAgent = options.userAgent || Trace.userAgent
}

/**
 * User-Agent string to be used in requests
 * @type {String}
 */
Trace.userAgent = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/50.0.2653.0 Safari/537.36'

inherit(Trace, Stream.Readable)

Object.assign(Trace.prototype, {

  _setCookie: function (url, headers) {
    if (!headers['set-cookie']) return 0
    var cookieCount = headers['set-cookie'].length
    for (var i = 0; i < cookieCount; i++) {
      this.cookies.store(url, headers['set-cookie'][0])
    }
    return cookieCount
  },

  _requestPlain: function (options, callback) {
    var self = this
    var url = new URL(options.url)
    var protocol = url.protocol === 'https:' ? https : http

    options = Object.assign({
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        Cookie: self.cookies.prepare(options.url),
        'User-Agent': self.userAgent
      }
    }, options)

    var req = protocol.request(options.url, options, function (res) {
      var diff = Date.now() - options.time
      var newCookies = self._setCookie(options.url, res.headers)

      self.statusCode = res.statusCode

      self.push({
        remoteAddress: res.socket.remoteAddress,
        protocol: 'HTTP',
        protocolVersionMajor: res.httpVersionMajor,
        protocolVersionMinor: res.httpVersionMinor,
        method: options.method || 'GET',
        url: options.url,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        cookies: self.cookies.length,
        newCookies: newCookies,
        time: diff,
        headers: res.headers,
        hop: self.hops
      })

      switch (res.statusCode) {
        case 301: case 302: case 303: case 307:
          self.hops++
          self._follow(res.headers.location, Date.now())
          break
        default:
          diff = Date.now() - self.start
          self.time = diff
          self.push(null)
          break
      }

      res.once('end', function () {
        if (options.agent) {
          options.agent.close()
        }
        callback()
      })

      res.resume()
    })

    req.on('error', function (error) {
      callback(error)
    })

    req.end()
  },

  _request: function (options, callback) {
    var self = this
    var url = new URL(options.url)

    if (url.protocol === 'http:') {
      return this._requestPlain(options, callback)
    }

    var client = http2.connect(url.origin, {
      rejectUnauthorized: false
    })

    var onError = function (error) {
      if (onError.wasCalled) return
      else onError.wasCalled = true

      client.close()

      if (error.code === 'ERR_HTTP2_ERROR') {
        options.time = Date.now()
        self._requestPlain(options, callback)
      } else {
        callback(error)
      }
    }

    client.on('error', onError)

    client.on('connect', function () {
      var req = client.request({
        ':method': options.method || 'GET',
        ':path': url.pathname,
        cookie: self.cookies.prepare(options.url),
        'user-agent': self.userAgent
      })

      req.on('error', onError)

      req.on('response', function (headers, flags) {
        var diff = Date.now() - options.time
        var newCookies = self._setCookie(options.url, headers)
        var statusCode = headers[':status']
        var statusMessage = http.STATUS_CODES[statusCode] || ''

        self.statusCode = statusCode

        self.push({
          remoteAddress: client.socket.remoteAddress,
          protocol: 'HTTP',
          protocolVersionMajor: 2,
          protocolVersionMinor: 0,
          method: options.method || 'GET',
          url: options.url,
          statusCode: statusCode,
          statusMessage: statusMessage,
          cookies: self.cookies.length,
          newCookies: newCookies,
          time: diff,
          headers: headers,
          hop: self.hops
        })

        switch (headers[':status']) {
          case 301: case 302: case 303: case 307:
            self.hops++
            self._follow(headers.location, Date.now())
            break
          default:
            diff = Date.now() - self.start
            self.time = diff
            self.push(null)
            break
        }
      })

      req.on('end', function () {
        client.close()
        callback()
      })

      req.end()
      req.resume()
    })
  },

  _follow: function (url, ms) {
    var self = this

    if (this.hops > this.maxHops) {
      self.emit('error', new Error('Too many redirects (>' + this.maxHops + ')'))
      return
    }

    this.currentUrl = normalizeUrl(url, {
      stripWWW: false,
      removeQueryParameters: false,
      removeTrailingSlash: false
    })

    if (this.currentUrl === this.prevUrl) {
      this.emit('error', new Error('Self-referencing redirect: ' + this.currentUrl))
      return
    }

    this.prevUrl = this.currentUrl

    this._request({
      method: 'HEAD',
      url: this.currentUrl,
      userAgent: this.userAgent,
      time: ms
    }, function (error) {
      if (error) {
        self.emit('error', error)
      }
    })
  },

  _read: function (size) {
    if (this.start === 0) {
      this.start = Date.now()
      this._follow(this.url, this.start)
    }
  }

})

module.exports = Trace
