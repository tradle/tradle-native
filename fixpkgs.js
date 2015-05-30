#!/usr/bin/env node

// var shelljs = require('shelljs')
// shelljs.exec('force-dedupe-git-modules')
var fs = require('fs')
var find = require('findit')
var path = require('path');
var thisPkg = require('./package.json')
var allDeps = {}

// function loadDeps() {
//   var pkgs = []
//   loadPkg('./package.json')

//   function loadPkg(pkgPath) {
//     var pkg = require(pkgPath)
//     for (var dep in pkg.dependencies) {
//       if (!allDeps[dep]) {
//         allDeps[dep] = true
//         pkgs.push.apply(pkgs, Object.keys(pkg.dependencies).map(function(name) {
//           return path.join(pkgPath, 'node_modules/' + name)
//         }))
//       }
//     }
//   }
// }

// loadDeps(hackFiles)

var hackers = [
  {
    name: 'fssync',
    regex: [
      /webtorrent\/lib\/fs-storage\.js/
    ],
    handler: function(file, contents) {
      contents = contents.toString()
      var fixed = contents.replace(/fs\.existsSync\([^\)]*\)/g, 'false')
      return contents === fixed ? null : fixed
    }
  },
  {
    name: 'version',
    regex: [
      /\.js$/
    ],
    handler: function(file, contents) {
      contents = contents.toString()

      var fixed = contents
      var matchPkg;
      do {
        matchPkg = fixed.match(/require\('?"?([^'"\)]*?package\.json)'?"?\)/)
        if (matchPkg) {
          var pkgPath = path.join(path.dirname(file), matchPkg[1])
          var pkg
          try {
            pkg = require(pkgPath)
          } catch (err) {
            console.warn('failed to hack', file)
            break;
          }

          fixed = fixed.replace(matchPkg[0], JSON.stringify(pkg))
        }
      } while (matchPkg)

      return contents === fixed ? null : fixed
    }
  },
  {
    name: 'fs',
    regex: [
      /bitkeeper-js\/package\.json/,
      /glob\/package\.json/,
      /random-access-file\/package\.json/,
      /pump\/package\.json/,
      /mime\/package\.json/,
      /walk\/package\.json/,
      /rimraf\/package\.json/,
      /webtorrent\/package\.json/,
      /formidable\/package\.json/,
      /mkdirp\/package\.json/,
      /tradle-utils\/package\.json/,
      /create-torrent\/package\.json/,
      /form-data\/package\.json/,
      /blockloader\/package\.json/,
      /chained-obj\/package\.json/
    ],
    handler: function(file, contents) {
      var pkg
      try {
        pkg = JSON.parse(contents)
      } catch (err) {
        console.log('failed to parse:', file)
        return
      }

      rewireMain(pkg)
      if (pkg.browser.fs !== 'react-native-level-fs') {
        pkg.browser.fs = 'react-native-level-fs'
        return JSON.stringify(pkg, null, 2)
      }
    }
  },
  {
    name: 'dgram',
    regex: [
      /sock-jack\/package\.json/,
      /utp\/package\.json/,
      /bittorrent-dht\/package\.json/,
      /zlorp\/package\.json/,
      /dns\.js\/package\.json/
    ],
    handler: function(file, contents) {
      var pkg
      try {
        pkg = JSON.parse(contents)
      } catch (err) {
        console.log('failed to parse:', file)
        return
      }

      rewireMain(pkg)
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

function hackFiles() {
  var finder = find('./node_modules')

  finder.on('file', function (file) {
    if (!/\.js$/.test(file)
      || /\/test\//.test(file)) return

    var parts = file.split('/')
    var idx = 0
    // var idx = parts.indexOf(path.basename(__dirname))
    while ((idx = parts.indexOf('node_modules', idx)) !== -1) {
      var dep = parts[idx + 1]
      var parentPkgPath = idx === 0 ? './package.json' :
        path.join(parts.slice(0, idx).join('/'), 'package.json')
      parentPkgPath = path.resolve(parentPkgPath)
      var parentPkg = require(parentPkgPath)
      if (!(dep in parentPkg.dependencies)) return

      parts = parts.slice(idx + 2)
    }

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
}

function rewireMain(pkg) {
  if (typeof pkg.browser === 'string') {
    var main = pkg.browser
    pkg.browser = {}
    pkg.browser[pkg.main] = main
  }
  else if (typeof pkg.browser === 'undefined') {
    pkg.browser = {}
  }
}

hackFiles()
