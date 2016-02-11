#!/usr/bin/env node
'use strict'

var http = require('http')
var https = require('https')
var parseUrl = require('url').parse
var normalizeUrl = require('normalize-url')
var chalk = require('chalk')
var Cookies = require('cookie-manager')

var prevUrl
var start = Date.now()
var hops = 0
var cookies = new Cookies()

follow(process.argv[2], start)

function setCookie (url, headers) {
  var cookieHeader = headers['set-cookie']
  if (!cookieHeader) return 0
  cookieHeader.forEach(function (value) {
    cookies.store(url, value)
  })
  return cookieHeader.length
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
    Cookie: cookies.prepare(url)
  }

  var protocol = opts.protocol === 'https:' ? https : http

  var req = protocol.request(opts, function (res) {
    var diff = Date.now() - ms
    var newCookies = setCookie(url, res.headers)

    console.log(
      chalk.green('[' + res.statusCode + ']'),
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
