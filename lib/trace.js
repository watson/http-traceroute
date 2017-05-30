'use strict'

var Stream = require('readable-stream')
var inherit = require('util').inherits
var http = require('http')
var https = require('https')
var spdy = require('spdy')
var parseUrl = require('url').parse
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

/**
 * Set `response.protocol` to the appropriate value
 * @param {http.IncomingMessage} res
 */
Trace.setProtocol = function (res) {
  res.protocol = 'HTTP'
  if (res.socket._spdyState) {
    var spdyState = res.socket._spdyState.parent
    var protocol = spdyState.alpnProtocol || spdyState.npnProtocol
    var parts = protocol.match(/^([^/\d]+)\/?(\d+)(?:\.(\d+))?/i)
    if (parts) {
      res.protocol = parts[1] === 'h' ? 'HTTP' : parts[1].toUpperCase()
      res.httpVersionMajor = parts[2]
      res.httpVersionMinor = parts[3] || 0
      res.httpVersion = res.httpVersionMajor + '.' + res.httpVersionMinor
    }
  }
}

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

  _follow: function (url, ms) {
    var self = this

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

    var opts = parseUrl(this.currentUrl)

    opts.method = 'HEAD'
    opts.headers = {
      'Cookie': this.cookies.prepare(this.currentUrl),
      'User-Agent': this.userAgent
    }

    var protocol = opts.protocol === 'https:' ? https : http

    if (opts.protocol === 'https:') {
      opts.agent = spdy.createAgent({
        host: opts.hostname || opts.host,
        port: opts.port || 443
      })

      // There's a case where spdy deadlocks, as it attempts to fall back to http/1.x;
      // see https://github.com/indutny/node-spdy/blob/v3.4.4/lib/spdy/agent.js#L121-L127,
      // https://github.com/indutny/node-spdy/blob/v3.4.4/lib/spdy/agent.js#L157-L160 and
      // https://github.com/indutny/node-spdy/blob/v3.4.4/lib/spdy/agent.js#L66
      // Fix: overwrite `.createSocket()` with node core's,
      // as spdy's `Agent.prototype._getCreateSocket()` is bugged
      opts.agent.createSocket = https.Agent.prototype.createSocket

      // If a custom agent is used, by default all connection-level
      // errors will result in an uncaught exception
      // (See https://github.com/indutny/node-spdy#usage)
      opts.agent.on('error', function (error) {
        error.url = self.currentUrl
        self.emit('error', error)
      })
    }

    var req = protocol.request(opts, function (res) {
      var diff = Date.now() - ms
      var newCookies = self._setCookie(self.currentUrl, res.headers)

      Trace.setProtocol(res)

      self.statusCode = res.statusCode

      self.push({
        protocol: res.protocol,
        protocolVersionMajor: res.httpVersionMajor,
        protocolVersionMinor: res.httpVersionMinor,
        method: opts.method || 'GET',
        url: self.currentUrl,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        cookies: self.cookies.length,
        newCookies: newCookies,
        time: diff,
        headers: res.headers,
        hop: self.hops
      })

      switch (res.statusCode) {
        case 301:
        case 302:
        case 303:
        case 307:
          self.hops++
          self._follow(res.headers.location, Date.now())
          break
        default:
          diff = Date.now() - self.start
          self.time = diff
          self.push(null)
          break
      }

      // For SPDY/H2 connections the agent needs to be closed,
      // to close all remaining TCP connections
      if (opts.agent) {
        res.once('end', function () {
          opts.agent.close()
        })
      }

      res.resume()
    })

    req.on('error', function (error) {
      self.emit('error', error)
    })

    req.end()
  },

  _read: function (size) {
    if (this.start === 0) {
      this.start = Date.now()
      this._follow(this.url, this.start)
    }
  }

})

module.exports = Trace
