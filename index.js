#!/usr/bin/env node
'use strict'

var http = require('http')
var https = require('https')
var parseUrl = require('url').parse
var normalizeUrl = require('normalize-url')
var chalk = require('chalk')

var url = normalizeUrl(process.argv[2])
var start = Date.now()
var hops = 0

follow(url, start)

function follow (url, ms) {
  var opts = parseUrl(url)
  opts.method = 'HEAD'

  var protocol = opts.protocol === 'https:' ? https : http

  var req = protocol.request(opts, function (res) {
    var diff = Date.now() - ms

    console.log('%s %s %s %s', chalk.green('[' + res.statusCode + ']'), chalk.gray(opts.method), url, chalk.cyan('(' + diff + ' ms)'))

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
        console.log('Trace finished in %s using %s', chalk.cyan(diff + ' ms'), chalk.cyan(hops + ' hops'))
        process.exit(0)
    }
  })
  req.end()
}
