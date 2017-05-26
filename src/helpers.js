/* @flow */

import Path from 'path'
import coolTrim from 'cool-trim'
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

export function splitEnv(contents: string) {
  return contents.split(contents.includes('\0') ? '\0' : '\n')
}

export function identifyEnvironment() {
  const { command, parameters, options } = getCommand()
  options.timeout = SPAWN_TIMEOUT
  return splitEnv(spawnSync(command, parameters, options).stdout.toString())
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
    childProcess.stdin.end(options.input)
    childProcess.stdout.on('data', function(chunk) {
      stdout.push(chunk)
    })
    childProcess.on('close', function() {
      clearTimeout(timer)
      resolve(splitEnv(stdout.join('')))
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
      const key = chunk.slice(0, index)
      const value = chunk.slice(index + 1)
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
  environment.PWD = process.cwd()
  environment.OLDPWD = environment.PWD
  return environment
}

const pythonCode = 'import os;print("\0".join(map("=".join, dict(os.environ).items())))'
export function getCommand(): { command: string, options: Object, parameters: Array<string> } {
  const shellScript = coolTrim`
    if [ "$(which python)" != "" ]; then
      python -c '${pythonCode}'
    elif [ "$(which python3)" != "" ]; then
      python3 -c '${pythonCode}'
    elif [ "$(which python2.7)" != "" ]; then
      python2.7 -c '${pythonCode}'
    else
      env
    fi
  `
  const command = process.env.SHELL || 'sh'
  const options: Object = { encoding: 'utf8' }
  const stdin = []

  const shell = Path.basename(command)
  if (shell === 'bash') {
    stdin.push('source ~/.bashrc 2>/dev/null')
    stdin.push('source ~/.bash_profile 2>/dev/null')
  } else if (shell === 'zsh') {
    stdin.push('source ~/.zshrc 2>/dev/null')
  } else if (shell === 'fish') {
    stdin.push('source ~/.config/fish/config.fish 2>/dev/null')
  }
  stdin.push(shellScript)
  stdin.push('exit')
  options.input = stdin.join('\n')

  return { command, parameters: [], options }
}
