# http-traceroute

A command line tool for following and showing HTTP redirects for a given
URL. Similar to the `traceroute` unix tool.

![screen shot 2016-02-22 at 12 43 13](https://cloud.githubusercontent.com/assets/10602/13217317/ec317342-d961-11e5-9810-9773569387e0.png)

[![Build status](https://travis-ci.org/watson/http-traceroute.svg?branch=master)](https://travis-ci.org/watson/http-traceroute)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Installation

Install globally as a CLI:

```
npm install http-traceroute -g
```

Install as a module:

```
npm install --save http-traceroute
```

## CLI Usage

```
http-traceroute [url]
```

### Example

```console
$ http-traceroute www.cloudflare.com/website-optimization/http2/
[301 Moved Permanently] HTTP/1.1 HEAD 104.17.209.9 http://www.cloudflare.com/website-optimization/http2/ (cookies: 1) (48 ms)
[200 OK] HTTP/2.0 HEAD 104.17.209.9 https://www.cloudflare.com/website-optimization/http2/ (cookies: 1) (111 ms)
Trace finished in 165 ms using 1 hop
```

## Module Usage

```js
var TraceRoute = require('http-traceroute')
```

```js
var trace = new TraceRoute('https://github.com')

trace.on('readable', function () {
  var hop = null
  while (hop = this.read()) {
    console.log(hop)
  }
})

trace.on('error', function () {})
trace.on('end', function () {})
```

A `hop` object has the following properties:

```js
hop {
  // IP address of remote host
  remoteAddress: String,
  // Currently always 'HTTP'
  protocol: String,
  // Major HTTP protocol version
  protocolVersionMajor: Number,
  // Minor HTTP protocol version
  protocolVersionMinor: Number,
  // HTTP method
  method: String,
  // Current hop URL
  url: String,
  // HTTP status code
  statusCode: Number,
  // HTTP status message
  statusMessage: String,
  // Current cookie count
  cookies: Number,
  // Number of newly added cookies on this hop
  newCookies: Number,
  // Response time in milliseconds
  time: Number,
  // Response headers
  headers: Object,
  // Current hop number
  hop: Number,
}
```

## License

MIT
