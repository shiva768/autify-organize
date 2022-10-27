const path = require('path')
const GasPlugin = require('gas-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  context: __dirname,
  entry: {
    main: path.resolve(__dirname, 'src', 'index.ts')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.[tj]s$/,
        loader: 'babel-loader'
      }
    ]
  },
  // plugins: [new GasPlugin(), new Es3ifyPlugin()]
  plugins: [new GasPlugin(),new CopyWebpackPlugin({
    patterns: [{ from: 'src/appsscript.json', to: 'appsscript.json' }]
  })]
}