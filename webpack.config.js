// Builds the extension into dist/, which is the folder you load unpacked
// in Chrome (chrome://extensions -> "Load unpacked" -> select dist/).
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    content: './src/content.ts',
    popup: './src/popup.ts',
    background: './src/background.ts',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // wipe stale files from previous builds
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      // kuromoji references Node's "path" module; shim it for the browser.
      path: require.resolve('path-browserify'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  plugins: [
    // Static assets that ship alongside the bundles.
    new CopyPlugin({
      patterns: [
        { from: 'dict', to: 'dict' }, // kuromoji dictionary data
        { from: 'images', to: 'images' },
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup.html', to: 'popup.html' },
      ],
    }),
  ],
};
