const path = require('path');

/** @type {import('webpack').WebpackOptions} */
const config = {
	target: 'node',

	entry: './src/extension.ts',
	output: {
		path: path.join(__dirname, 'out'),
		filename: 'extension.js',
		libraryTarget: 'commonjs'
	},
	externals: {
		vscode: 'commonjs vscode'
	},
	resolve: {
		extensions: ['.ts', '.js']
	},
	module: {
		rules: [{
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader',
				options: {
					compilerOptions: {
						declaration: false
					}
				}
			}]
		}]
	}
};

module.exports = config;
