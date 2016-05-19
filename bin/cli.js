#!/usr/bin/env node
'use strict'

var http = require('http')
var https = require('https')
var spdy = require('spdy')
var parseUrl = require('url').parse
var normalizeUrl = require('normalize-url')
var chalk = require('chalk')
var Cookies = require('cookie-manager')

var prevUrl
var start = Date.now()
var hops = 0
var cookies = new Cookies()
var userAgent = 'Mozilla/5.0 AppleWebKit/537.36 Chrome/50.0.2653.0 Safari/537.36'

follow(process.argv[2], start)

function setCookie (url, headers) {
  if (!headers['set-cookie']) return 0
  headers['set-cookie'].forEach(function (value) {
    cookies.store(url, value)
  })
  return headers['set-cookie'].length
}

function setProtocol (res) {
  res.protocol = 'HTTP'
  if (res.socket._spdyState) {
    var spdyState = res.socket._spdyState.parent
    var protocol = spdyState.alpnProtocol || spdyState.npnProtocol
    var parts = protocol.match(/^([^\/\d]+)\/?(\d+)(?:\.(\d+))?/i)
    if (parts) {
      res.protocol = parts[1] === 'h' ? 'HTTP' : parts[1].toUpperCase()
      res.httpVersionMajor = parts[2]
      res.httpVersionMinor = parts[3] || 0
      res.httpVersion = res.httpVersionMajor + '.' + res.httpVersionMinor
    }
  }
}

function follow (url, ms) {
  url = normalizeUrl(url, { stripWWW: false })

  if (url === prevUrl) {
    console.log('Self-referencing redirect detected - aborting...')
    process.exit(1)
  }
  prevUrl = url

  var opts = parseUrl(url)
  opts.method = 'HEAD'
  opts.headers = {
    'Cookie': cookies.prepare(url),
    'User-Agent': userAgent
  }

  var protocol = opts.protocol === 'https:' ? https : http

  if (opts.protocol === 'https:') {
    opts.agent = spdy.createAgent({
      host: opts.hostname || opts.host,
      port: opts.port || 443
    })
  }

  var req = protocol.request(opts, function (res) {
    var diff = Date.now() - ms
    var newCookies = setCookie(url, res.headers)

    setProtocol(res)

    console.log(
      chalk.green('[' + res.statusCode + ']'),
      chalk.yellow(res.protocol + '/' + res.httpVersionMajor + '.' + res.httpVersionMinor),
      chalk.gray(opts.method),
      url,
      chalk.gray(newCookies ? '(cookies: ' + newCookies + ') ' : '') +
      chalk.cyan('(' + diff + ' ms)')
    )

    switch (res.statusCode) {
      case 301:
      case 302:
      case 303:
      case 307:
        hops++
        follow(res.headers.location, Date.now())
        break
      default:
        diff = Date.now() - start
        console.log('Trace finished in %s using %s', chalk.cyan(diff + ' ms'), chalk.cyan(hops + ' hop' + (hops > 1 ? 's' : '')))
        process.exit(0)
    }
  })

  req.on('error', function (err) {
    console.error('Error:', err.message)
    console.error('\nCould not connect to:\n%s', url)
    process.exit(1)
  })

  req.end()
}
