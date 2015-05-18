#!/usr/bin/env node

// var shelljs = require('shelljs')
// shelljs.exec('force-dedupe-git-modules')
var fs = require('fs')
var find = require('findit')
var finder = require('findit')('./node_modules')
var path = require('path');

var hackers = [
  {
    name: 'fs',
    regex: [
      /formidable\/package\.json/,
      /mkdirp\/package\.json/,
      /tradle-utils\/package\.json/,
      /create-torrent\/package\.json/,
      /form-data\/package\.json/,
      /blockloader\/package\.json/,
      /chained-obj\/package\.json/
    ],
    handler: function(file, contents) {
      var pkg = JSON.parse(contents)
      pkg.browser = pkg.browser || {}
      if (pkg.browser.fs !== 'react-native-level-fs') {
        pkg.browser.fs = 'react-native-level-fs'
        return JSON.stringify(pkg, null, 2)
      }
    }
  },
  {
    name: 'dgram',
    regex: [
      /bittorrent-dht\/package\.json/,
      /zlorp\/package\.json/,
      /dns\.js\/package\.json/
    ],
    handler: function(file, contents) {
      var pkg = JSON.parse(contents)
      pkg.browser = pkg.browser || {}
      if (pkg.browser.dgram !== 'react-native-udp') {
        pkg.browser.dgram = 'react-native-udp'
        return JSON.stringify(pkg, null, 2)
      }
    }
  },
  {
    name: 'simpleget',
    regex: [
      /simple\-get\/index\.js/
    ],
    handler: function(file, contents) {
      var hack = ";res.headers = res.headers || {};"
      contents = contents.toString()
      if (contents.indexOf(hack) !== -1) return

      return contents.replace(
        "if (['gzip', 'deflate'].indexOf(res.headers['content-encoding']) !== -1) {",
          hack +
          "if (['gzip', 'deflate'].indexOf(res.headers['content-encoding']) !== -1) {"
      )
    }
  }
]

finder.on('file', function (file) {
  hackers.some(function(hacker) {
    if (hacker.regex.some(function(regex) { return regex.test(file) })) {
      file = path.resolve(file)
      fs.readFile(file, function(err, buf) {
        if (err) throw err

        var hacked = hacker.handler(file, buf)
        if (hacked) {
          console.log('hacking', file)
          fs.writeFile(file, hacked)
        }
      })

      return true
    }
  })
});