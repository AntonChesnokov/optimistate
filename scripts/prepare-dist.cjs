#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageJsonPath = path.join(rootDir, 'package.json');

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  license: pkg.license,
  keywords: pkg.keywords,
  author: pkg.author,
  homepage: pkg.homepage,
  repository: pkg.repository,
  bugs: pkg.bugs,
  sideEffects: pkg.sideEffects ?? false,
  type: 'module',
  main: './public-api.js',
  module: './public-api.js',
  types: './public-api.d.ts',
  exports: {
    '.': {
      types: './public-api.d.ts',
      import: './public-api.js',
      default: './public-api.js',
    },
    './package.json': './package.json',
  },
  dependencies: pkg.dependencies ?? {},
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(distPkg, null, 2) + '\n');

const readmePath = path.join(rootDir, 'README.md');
if (fs.existsSync(readmePath)) {
  fs.copyFileSync(readmePath, path.join(distDir, 'README.md'));
}
