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
  return spawnSync(command, parameters, options).stdout.toString().split('\0')
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
      resolve(stdout.join('').split('\0'))
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

export function getCommand(): { command: string, options: Object, parameters: Array<string> } {
  // Print the environment separated by \0 in a POSIX compatible (!) way.
  // Only environment variable names that consist only of alphanumeric
  // characters and underscores, and begin with an alphabetic character or an
  // underscore are included.
  const shScript = ('env|' +
                    'sed -n -e "s/^\\([A-Za-z_][A-Za-z0-9_]*\\)=.*/\\1/p"|' +
                    'while read name;' +
                    'do ' +
                    '[ "$name" != "_" -a -n "$(eval "printf \\"%s\\" \\"\\${$name+x}\\"")" ]&&' + // eslint-disable-line no-template-curly-in-string
                    'value="$(eval "printf \\"%s\\" \\"\\${$name}\\"")"&&' + // eslint-disable-line no-template-curly-in-string
                    'printf "%s=%s\\0" "$name" "$value";' +
                    'done;' +
                    'exit;')
  // Wrap the script with sh for incompatible shells.
  const wrappedShScript = 'sh -c \'' + shScript + '\';exit;'
  const command = process.env.SHELL || 'sh'
  const options = { encoding: 'utf8' }
  let parameters = ['-c', wrappedShScript]

  const shell = Path.basename(command)
  if (shell === 'bash') {
    parameters = ['-c', 'source ~/.bashrc;source ~/.bash_profile;' + shScript]
  } else if (shell === 'zsh') {
    parameters = ['-c', 'source ~/.zshrc;' + shScript]
  } else if (shell === 'fish') {
    parameters = ['-c', 'source ~/.config/fish/config.fish;' + wrappedShScript]
  } else if (shell === 'sh' || shell === 'ksh') {
    parameters = ['-c', shScript]
  }

  return { command, parameters, options }
}
