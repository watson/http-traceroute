#!/usr/bin/env node
'use strict'

var url = require('url')
var normalizeUrl = require('normalize-url')
var chalk = require('chalk')
var arg = normalizeUrl(process.argv[2])
var http = require(arg.indexOf('https://') === 0 ? 'https' : 'http')

var start = Date.now()
follow(arg, start)

function follow (u, ms) {
  var opts = url.parse(u)
  opts.method = 'HEAD'
  var req = http.request(opts, function (res) {
    var diff = Date.now() - ms
    console.log(chalk.green('[' + res.statusCode + '] ') + chalk.gray(opts.method) + ' ' + u + chalk.cyan(' (' + diff + ' ms)'))
    switch (res.statusCode) {
      case 301:
      case 303:
      case 307:
        follow(res.headers.location, Date.now())
        break
      default:
        diff = Date.now() - start
        console.log('Trace finished in ' + chalk.cyan(diff + ' ms'))
        process.exit(0)
    }
  })
  req.end()
}
