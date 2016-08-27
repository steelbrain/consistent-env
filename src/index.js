/* @flow */

import Path from 'path'
import { CACHE_KEY, KNOWN_SHELLS, assign, parse, applySugar, identifyEnvironment, identifyEnvironmentAsync } from './helpers'

module.exports = function(): Object {
  if (process.platform === 'win32' || !process.env.SHELL) {
    return assign({}, process.env)
  }
  if (global[CACHE_KEY]) {
    return assign({}, global[CACHE_KEY])
  }
  const shellName = Path.basename(process.env.SHELL)
  if (KNOWN_SHELLS.indexOf(shellName) === -1) {
    return assign({}, process.env)
  }
  try {
    const environment = applySugar(parse(identifyEnvironment()))
    global[CACHE_KEY] = environment
    return environment
  } catch (error) {
    console.error('[consistent-env] Unable to determine environment', error)
    return assign({}, process.env)
  }
}

module.exports.async = function(): Promise<Object> {
  return new Promise(function(resolve) {
    if (process.platform === 'win32' || !process.env.SHELL) {
      resolve(assign({}, process.env))
    } else if (global[CACHE_KEY]) {
      resolve(assign({}, global[CACHE_KEY]))
    } else {
      const shellName = Path.basename(process.env.SHELL)
      if (KNOWN_SHELLS.indexOf(shellName) === -1) {
        resolve(assign({}, process.env))
      } else {
        resolve(identifyEnvironmentAsync().then(parse).then(applySugar).then(function(environment) {
          global[CACHE_KEY] = environment
          return environment
        }))
      }
    }
  }).catch(function(error) {
    console.error('[consistent-env] Unable to determine environment', error)
    return assign({}, process.env)
  })
}
