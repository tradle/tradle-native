#!/usr/bin/env node

// var shelljs = require('shelljs')
// shelljs.exec('force-dedupe-git-modules')
var fs = require('fs')
var find = require('findit')
var path = require('path')
// var thisPkg = require('./package.json')

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
  // {
  //   name: 'fssync',
  //   regex: [
  //     /webtorrent\/lib\/fs-storage\.js/
  //   ],
  //   hack: function(file, contents) {
  //     contents = contents.toString()
  //     var fixed = contents.replace(/fs\.existsSync\([^\)]*\)/g, 'false')
  //     return contents === fixed ? null : fixed
  //   }
  // },
  {
    name: 'non-browser',
    regex: [
      /level-jobs\/package\.json$/
    ],
    hack: function(file, contents) {
      var pkg
      try {
        pkg = JSON.parse(contents)
      } catch (err) {
        console.log('failed to parse:', file)
        return
      }

      if (pkg.browser) {
        delete pkg.browser
        return JSON.stringify(pkg, null, 2)
      }
    }
  },
  {
    name: 'browser_field',
    regex: [
      /package\.json$/
    ],
    hack: function (file, contents) {
      var pkg
      try {
        pkg = JSON.parse(contents)
      } catch (err) {
        console.log('failed to parse:', file)
        return
      }

      if (pkg.browser && typeof pkg.browser === 'object') {
        var fixed
        for (var left in pkg.browser) {
          if (left[0] === '.' && !/\.[a-z]{0,4}$/i.test(left)) {
            fixed = true
            pkg.browser[left + '.js'] = pkg.browser[left]
            delete pkg.browser[left]
          }
        }

        if (fixed) return JSON.stringify(pkg, null, 2)
      }
    }
  },
  // {
  //   name: 'net',
  //   regex: [
  //     /bittorrent-swarm\/package\.json$/,
  //     /portfinder\/package\.json$/
  //   ],
  //   hack: function (file, contents) {
  //     var pkg
  //     try {
  //       pkg = JSON.parse(contents)
  //     } catch (err) {
  //       console.log('failed to parse:', file)
  //       return
  //     }

  //     rewireMain(pkg)
  //     if (pkg.browser.net !== 'utp') {
  //       pkg.browser.net = 'utp'
  //       return JSON.stringify(pkg, null, 2)
  //     }
  //   }
  // },
  // {
  //   name: 'fs',
  //   regex: [
  //     /bitkeeper-js\/package\.json$/,
  //     /glob\/package\.json$/,
  //     /random-access-file\/package\.json$/,
  //     /chained-chat\/package\.json$/,
  //     /pump\/package\.json$/,
  //     /mime\/package\.json$/,
  //     /walk\/package\.json$/,
  //     /is-file\/package\.json$/,
  //     /rimraf\/package\.json$/,
  //     /webtorrent\/package\.json$/,
  //     /formidable\/package\.json$/,
  //     /mkdirp\/package\.json$/,
  //     /load-ip-set\/package\.json$/,
  //     /portfinder\/package\.json$/,
  //     /tradle-utils\/package\.json$/,
  //     /create-torrent\/package\.json$/,
  //     /form-data\/package\.json$/,
  //     /blockloader\/package\.json$/,
  //     /chained-obj\/package\.json$/
  //   ],
  //   hack: function (file, contents) {
  //     var pkg
  //     try {
  //       pkg = JSON.parse(contents)
  //     } catch (err) {
  //       console.log('failed to parse:', file)
  //       return
  //     }

  //     rewireMain(pkg)
  //     if (pkg.browser.fs !== 'react-native-level-fs') {
  //       pkg.browser.fs = 'react-native-level-fs'
  //       return JSON.stringify(pkg, null, 2)
  //     }
  //   }
  // },
  // {
  //   name: 'dgram',
  //   regex: [
  //     /sock-plex\/package\.json$/,
  //     /utp\/package\.json$/,
  //     /bittorrent-dht\/package\.json$/,
  //     /zlorp\/package\.json$/,
  //     /dns\.js\/package\.json$/
  //   ],
  //   hack: function (file, contents) {
  //     var pkg
  //     try {
  //       pkg = JSON.parse(contents)
  //     } catch (err) {
  //       console.log('failed to parse:', file)
  //       return
  //     }

  //     rewireMain(pkg)
  //     if (pkg.browser.dgram !== 'react-native-udp') {
  //       pkg.browser.dgram = 'react-native-udp'
  //       return JSON.stringify(pkg, null, 2)
  //     }
  //   }
  // },
  {
    name: 'simpleget',
    regex: [
      /simple\-get\/index\.js$/
    ],
    hack: function (file, contents) {
      var hack = ';res.headers = res.headers || {};'
      if (contents.indexOf(hack) !== -1) return

      return contents.replace(
        "if (['gzip', 'deflate'].indexOf(res.headers['content-encoding']) !== -1) {",
        hack +
        "if (['gzip', 'deflate'].indexOf(res.headers['content-encoding']) !== -1) {"
      )
    }
  }
]

function hackFiles () {
  var finder = find('./node_modules')

  finder.on('file', function (file) {
    if (!/\.(js|json)$/.test(file)
      || /\/tests?\//.test(file)) return

    // var parts = file.split('/')
      // var idx = 0
      // // var idx = parts.indexOf(path.basename(__dirname))
      // while ((idx = parts.indexOf('node_modules', idx)) !== -1) {
      //   var dep = parts[idx + 1]
      //   var parentPkgPath = idx === 0 ? './package.json' :
      //     path.join(parts.slice(0, idx).join('/'), 'package.json')
      //   parentPkgPath = path.resolve(parentPkgPath)
      //   var parentPkg = require(parentPkgPath)
      //   if (!(dep in parentPkg.dependencies)) return

    //   parts.unshift() // node_modules
      //   parts.unshift() // dep
      // }

    var matchingHackers = hackers.filter(function (hacker) {
      return hacker.regex.some(function (regex) {
        return regex.test(file)
      })
    })

    if (!matchingHackers.length) return

    file = path.resolve(file)
    // if (/\.json$/.test(file)) {
    //   try {
    //     var json = JSON.parse(require(file))
    //     onread(null, json)
    //   } catch (err) {
    //     console.warn('failed to parse:', file)
    //   }
    // }
    // else {
    fs.readFile(file, { encoding: 'utf8' }, onread)
    // }

    function onread (err, str) {
      if (err) throw err

      var hacked = matchingHackers.reduce(function (hacked, hacker) {
        return hacker.hack(file, hacked || str) || hacked
      }, str)

      if (hacked && hacked !== str) {
        console.log('hacking', file)
        fs.writeFile(file, hacked)
      }
    }
  })
}

function rewireMain (pkg) {
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
