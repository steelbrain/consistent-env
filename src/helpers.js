'use strict'

import Path from 'path'
import { spawn, spawnSync } from 'child_process'

const LOCAL_BIN_PATH = '/usr/local/bin'
export const CACHE_KEY = '__STEELBRAIN_CONSISTENT_ENV_V1'
export const assign = Object.assign || function (target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key]
    }
  }
  return target
}

export function identifyEnvironment() {
  let environment
  try {
    environment = spawnSync(process.env.SHELL, ['-ic', 'env; exit']).stdout.toString().trim().split('\n')
  } catch (_) {
    throw new Error('Unable to determine environment')
  }
  return environment
}

export function identifyEnvironmentAsync() {
  return new Promise(function(resolve, reject) {
    const childProcess = spawn(process.env.SHELL, ['-ic', 'env; exit'])
    const stdout = []
    const timer = setTimeout(function() {
      childProcess.kill()
      reject()
    }, 2000)
    childProcess.stdout.on('data', function(chunk) {
      stdout.push(chunk)
    })
    childProcess.on('close', function() {
      clearTimeout(timer)
      resolve(stdout.join('').trim().split('\n'))
    })
    childProcess.on('error', function(error) {
      reject(error)
    })
  }).catch(function() {
    throw new Error('Unable to determine environment')
  })
}

export function parse(rawEnvironment) {
  const environment = {}
  for (const chunk of rawEnvironment) {
    const index = chunk.indexOf('=')
    if (index !== -1) {
      const key = chunk.slice(0, index).trim()
      const value = chunk.slice(index + 1).trim()
      environment[key] = value
    }
  }
  return environment
}

export function applySugar(environment) {
  let path = process.env.PATH ? process.env.PATH.split(':') : []
  if (environment.PATH) {
    for (const chunk of environment.PATH.split(':')) {
      if (chunk && path.indexOf(chunk) === -1) {
        path.push(chunk)
      }
    }
  }
  if (path.indexOf(LOCAL_BIN_PATH) === -1) {
    path = [LOCAL_BIN_PATH].concat(path)
  }
  if (!environment.USER) {
    if (process.env.USER) {
      environment.USER = process.env.USER
    } else if (environment.HOME) {
      environment.USER = Path.basename(environment.HOME)
    }
  }

  environment.PATH = path.join(':')
  environment.PWD = environment.OLDPWD = process.cwd()
  return environment
}
