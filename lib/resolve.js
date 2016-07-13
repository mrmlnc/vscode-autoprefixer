'use strict';

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

function pathsExists(filepath) {
  return new Promise((resolve) => {
    fs.stat(filepath, (err) => {
      resolve(!err);
    });
  });
}

function isWindows() {
  return process.platform === 'win32';
}

function resolveModule(workspaceRoot, moduleName, currentPath) {
  const nodePath = [];
  return new Promise((resolve, reject) => {
    if (currentPath) {
      resolve(currentPath);
    }

    if (workspaceRoot) {
      nodePath.push(path.join(workspaceRoot, 'node_modules'));
    }

    exec('npm config get prefix', (err, stdout) => {
      if (err) {
        reject(err);
      }

      const globalPath = stdout.toString().replace(/[\s\r\n]+$/, '');
      if (globalPath.length > 0) {
        if (isWindows()) {
          nodePath.push(path.join(globalPath, 'node_modules'));
        } else {
          nodePath.push(path.join(globalPath, 'lib', 'node_modules'));
        }
      }

      resolve(nodePath);
    });
  }).then((paths) => {
    if (typeof paths === 'string') {
      return paths;
    }

    return Promise.all(paths.map((filepath) => pathsExists(path.join(filepath, moduleName))));
  }).then((results) => {
    if (typeof results === 'string') {
      return results;
    }

    for (let index = 0; index < results.length; index++) {
      if (results[index]) {
        return path.join(nodePath[index], moduleName);
      }
    }

    return undefined;
  });
}

module.exports = resolveModule;
