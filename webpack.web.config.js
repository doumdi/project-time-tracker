const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/app/index-web.js',
  output: {
    path: path.resolve(__dirname, 'dist-web'),
    filename: 'bundle.js',
    publicPath: './'
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.wasm$/,
        type: 'javascript/auto',
        loader: 'file-loader',
        options: {
          publicPath: './'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/app/index-web.html',
      filename: 'index.html'
    }),
    new webpack.DefinePlugin({
      'process.env.WEB_MODE': JSON.stringify('true')
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      'fs': false,
      'path': false,
      'crypto': false
    }
  },
  externals: {
    'electron': 'commonjs electron',
    'sqlite3': 'commonjs sqlite3'
  }
};
