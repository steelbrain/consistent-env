/* @flow */

import Path from 'path'
import uniqueArray from 'lodash.uniq'
import { spawn, spawnSync } from 'child_process'

const SPAWN_TIMEOUT = 4000
const DEFAULT_PATHS = ['/bin', '/sbin', '/usr/bin', '/usr/sbin', '/usr/local/bin', '/usr/local/sbin']
export const KNOWN_SHELLS = ['zsh', 'bash', 'fish']
export const CACHE_KEY = '__STEELBRAIN_CONSISTENT_ENV_V1'
export const assign = Object.assign || function (target, source) {
  for (const key in source) {
    if ({}.hasOwnProperty.call(source, key)) {
      target[key] = source[key]
    }
  }
  return target
}

export function identifyEnvironment() {
  const { command, parameters, options } = getCommand()
  options.timeout = SPAWN_TIMEOUT
  return spawnSync(command, parameters, options).stdout.toString().trim().split('\n')
}

export function identifyEnvironmentAsync() {
  return new Promise(function(resolve, reject) {
    const { command, parameters, options } = getCommand()
    const childProcess = spawn(command, parameters, options)
    const stdout = []
    const timer = setTimeout(function() {
      childProcess.kill()
      reject(new Error('Process execution timed out'))
    }, SPAWN_TIMEOUT)
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
  })
}

export function parse(rawEnvironment: Array<string>): Object {
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

export function applySugar(environment: Object) {
  let path = process.env.PATH ? process.env.PATH.split(':') : []
  if (environment.PATH) {
    for (const chunk of environment.PATH.split(':')) {
      if (chunk && path.indexOf(chunk) === -1) {
        path.push(chunk)
      }
    }
  }
  for (const entry of DEFAULT_PATHS) {
    if (path.indexOf(entry) === -1) {
      path = [entry].concat(path)
    }
  }
  if (!environment.USER) {
    if (process.env.USER) {
      environment.USER = process.env.USER
    } else if (environment.HOME) {
      environment.USER = Path.basename(environment.HOME)
    }
  }

  environment.PATH = uniqueArray(path).join(':')
  environment.PWD = environment.OLDPWD = process.cwd()
  return environment
}

export function getCommand(): { command: string, options: Object, parameters: Array<string> } {
  const command = process.env.SHELL || 'sh'
  const options = { encoding: 'utf8' }
  let parameters = ['-c', 'env;exit']

  const shell = Path.basename(command)
  if (shell === 'bash') {
    parameters = ['-c', 'source ~/.bashrc;source ~/.bash_profile;env;exit']
  } else if (shell === 'zsh') {
    parameters = ['-c', 'source ~/.zshrc;env;exit']
  } else if (shell === 'fish') {
    parameters = ['-c', 'source ~/.config/fish/config.fish;env;exit']
  }

  return { command, parameters, options }
}
