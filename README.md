# http-traceroute

A command line tool for following and showing HTTP redirects for a given
URL. Similar to the `traceroute` unix tool.

[![Build status](https://travis-ci.org/watson/http-traceroute.svg?branch=master)](https://travis-ci.org/watson/http-traceroute)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Installation

Install globally:

```
npm install http-traceroute -g
```

## Usage

```
http-traceroute [url]
```

**Example:**

```
$ http-traceroute nyti.ms/1QETHgV
[301] HEAD http://nyti.ms/1QETHgV (230 ms)
[301] HEAD http://trib.al/CPCEesg (253 ms)
[301] HEAD http://nyti.ms/1Vsrnxp (198 ms)
[301] HEAD http://trib.al/YRVrqbr (242 ms)
[301] HEAD http://nyti.ms/1QDeeSW (213 ms)
[301] HEAD http://trib.al/HFpblHd (269 ms)
[303] HEAD http://www.nytimes.com/2016/01/27/nyregion/what-happened-to-jane-mayer-when-she-wrote-about-the-koch-brothers.html?smid=tw-nytimes&smtyp=cur (224 ms)
[302] HEAD http://www.nytimes.com/glogin?URI=http%3A%2F%2Fwww.nytimes.com%2F2016%2F01%2F27%2Fnyregion%2Fwhat-happened-to-jane-mayer-when-she-wrote-about-the-koch-brothers.html%3Fsmid%3Dtw-nytimes%26smtyp%3Dcur%26_r%3D0 (235 ms)
Trace finished in 1873 ms
```

## License

MIT
