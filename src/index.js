'use strict'

import { CACHE_KEY, assign, parse, applySugar, identifyEnvironment } from './helpers'

module.exports = function() {
  if (process.platform === 'win32') {
    return assign({}, process.env)
  }
  if (global[CACHE_KEY]) {
    return assign({}, global[CACHE_KEY])
  }
  const environment = applySugar(parse(identifyEnvironment()))
  global[CACHE_KEY] = environment
  return environment
}
