#!/usr/bin/env node
'use strict'

var Trace = require('..')
var chalk = require('chalk')

var trace = new Trace(process.argv[2])
  .once('error', function (error) {
    var url = error.url ? chalk.gray('- ' + error.url) : ''
    console.log(chalk.red('ERROR'), error.message, url)
    process.exit(0)
  })
  .once('end', function () {
    console.log('Trace finished in %s using %s', chalk.cyan(trace.time + ' ms'), chalk.cyan(trace.hops + ' hop' + (trace.hops > 1 ? 's' : '')))
  })
  .on('data', function (step) {
    console.log(
      chalk.green('[' + step.statusCode + ']'),
      chalk.yellow(step.protocol + '/' + step.protocolVersionMajor + '.' + step.protocolVersionMinor),
      chalk.gray(step.method),
      step.url,
      chalk.gray(step.newCookies ? '(cookies: ' + step.newCookies + ') ' : '') +
      chalk.cyan('(' + step.time + ' ms)')
    )
  })
