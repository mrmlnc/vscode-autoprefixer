const path = require('path');

const TerserPlugin = require('terser-webpack-plugin');

/** @type {import('webpack').Configuration} */
const config = {
	target: 'node',

	entry: './src/extension.ts',
	output: {
		path: path.join(__dirname, 'out'),
		filename: 'extension.js',
		libraryTarget: 'commonjs'
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				parallel: true,
				sourceMap: false,
				extractComments: false
			})
		]
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
