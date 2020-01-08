# VS Code Plugin for Autoprefixer

> This plugin for VS Code provides an interface to [autoprefixer](https://github.com/postcss/autoprefixer).

![VS Code plugin](https://cloud.githubusercontent.com/assets/7034281/16823311/da82a3c6-496b-11e6-8d95-0bebbf0b9607.gif)

## Donate

If you want to thank me, or promote your issue.

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/mrmlnc)

> :heart: I will be glad to see your support and PR's.

## Install

Plugin installation is performed in several stages:

  1. Press `F1` and select `Extensions: Install Extensions`.
  2. Search and choose `vscode-autoprefixer`.

See the [extension installation guide](https://code.visualstudio.com/docs/editor/extension-gallery) for details.

## Usage

Press `F1` and run the command named `Autoprefixer: Run`.

## Supported languages

* CSS
* Less
* SCSS

## Supported settings

### autoprefixer.findExternalAutoprefixer

* Type: `Boolean`
* Default: `false`

Use an external Autoprefixer package instead of built-in version.

You must install Autoprefixer using:

* `npm i -D autoprefixer`
* `npm i -g autoprefixer`

> **About first run with this option**
>
> When you first start the plugin is looking for an installed Autoprefixer. Therefore, the first run may take a long time. Subsequent runs are much faster.

### autoprefixer.options

* Type: `Object`
* Default: `{}`

Any options supported by autoprefixer — [documentation](https://github.com/postcss/autoprefixer#options).

### autoprefixer.formatOnSave

* Type: `Boolean`
* Default: `false`

Add vendor prefixes to CSS when you save a file.

### autoprefixer.ignoreFiles

* Type: `Array`
* Default: `[]`
* Example: `["variables.less", "mixins/**/*"]`

An optional array of glob-patterns to ignore files.

## Keyboard shortcuts

For changes keyboard shortcuts, create a new rule in `File -> Preferences -> Keyboard Shortcuts`:

```json
{
  "key": "ctrl+shift+c",
  "command": "autoprefixer.execute"
}
```

## Changelog

See the [Releases section of our GitHub project](https://github.com/mrmlnc/vscode-autoprefixer/releases) for changelogs for each release version.

## License

This software is released under the terms of the MIT license.
