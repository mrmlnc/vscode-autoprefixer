# VS Code Plugin for Autoprefixer

> This plugin for VS Code provides an interface to [autoprefixer](https://github.com/postcss/autoprefixer).

![VS Code plugin](https://cloud.githubusercontent.com/assets/7034281/16823311/da82a3c6-496b-11e6-8d95-0bebbf0b9607.gif)

## Install

Plugin installation is performed in several stages:

  1. Install **autoprefixer** use `npm i -D autoprefixer` or `npm i -g autoprefixer`.
  2. Press `F1` and select `Extensions: Install Extensions`.
  3. Search and choose `vscode-autoprefixer`.

See the [extension installation guide](https://code.visualstudio.com/docs/editor/extension-gallery) for details.

## Usage

Press `F1` and run the command named `Autoprefixer CSS`.

## Supported languages

  * CSS
  * Less (experimental support)
  * SCSS

## Supported settings

**autoprefixer.browsers**

  * Type: `Array`
  * Default: `["last 2 versions"]`
  * Example: `["ie >= 10"]`

Which browsers you need to support.

**autoprefixer.prefixOnSave**

  * Type: `Boolean`
  * Default: `false`

Add vendor prefixes to CSS when you save a file.

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
