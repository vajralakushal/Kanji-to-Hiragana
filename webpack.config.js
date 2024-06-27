const path = require('path');
const CopyPlugin = require('copy-webpack-plugin'); // Add this line

module.exports = {
  entry: {
    content: './src/content.js', 
    popup: './src/popup.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    fallback: {
      "path": require.resolve("path-browserify")
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "dict", to: "dict" },
        { from: "manifest.json", to: "manifest.json" },
        { from: "popup.html", to: "popup.html" }, // Adjust this path if needed
        // Add any other files or folders you need to copy
      ],
    }),
  ],
};
