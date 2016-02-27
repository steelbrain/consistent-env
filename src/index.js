'use strict'

import Path from 'path'
import { CACHE_KEY, KNOWN_SHELLS, assign, parse, applySugar, identifyEnvironment, identifyEnvironmentAsync } from './helpers'

module.exports = function() {
  if (process.platform === 'win32') {
    return assign({}, process.env)
  }
  if (global[CACHE_KEY]) {
    return assign({}, global[CACHE_KEY])
  }
  const shellName = Path.basename(process.env.SHELL)
  if (KNOWN_SHELLS.indexOf(shellName) === -1) {
    return assign({}, process.env)
  }
  const environment = applySugar(parse(identifyEnvironment()))
  global[CACHE_KEY] = environment
  return environment
}

module.exports.async = function() {
  return new Promise(function(resolve) {
    if (process.platform === 'win32') {
      resolve(assign({}, process.env))
    } else if (global[CACHE_KEY]) {
      resolve(assign({}, global[CACHE_KEY]))
    } else {
      const shellName = Path.basename(process.env.SHELL)
      if (KNOWN_SHELLS.indexOf(shellName) === -1) {
        return assign({}, process.env)
      }

      resolve(identifyEnvironmentAsync().then(parse).then(applySugar).then(function(environment) {
        global[CACHE_KEY] = environment
        return environment
      }))
    }
  })
}
