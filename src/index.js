'use strict'

import { assign, parse, applySugar, identifyEnvironment } from './helpers'

const CACHE_KEY = '__STEELBRAIN_CONSISTENT_ENV_V1'

module.exports = function() {
  if (process.platform === 'win32') {
    return assign({}, process.env)
  }
  if (global[CACHE_KEY]) {
    return assign({}, process.env)
  }
  const environment = applySugar(parse(identifyEnvironment()))
  global[CACHE_KEY] = environment
  return environment
}
