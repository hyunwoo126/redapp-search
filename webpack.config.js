const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './public/src/entry.js',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname+'/public/', 'dist')
    },
    devServer: {
        publicPath:"/dist/",
        contentBase: path.resolve(__dirname+'/public/', 'dist'),
        port: 3000,
        proxy: {
            "/search": {
                target: "http://localhost:5000/search",
                secure: false,
                pathRewrite: { '^/search': '' }
            }
        }
    },
    module: {
        loaders: [
          {
            test: /.jsx?$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            query: {
              presets: ['es2015', 'react']
            }
          }
        ]
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin()
      ],
  };