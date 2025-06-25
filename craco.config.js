const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.experiments = {
        asyncWebAssembly: true,
        topLevelAwait: true,
        layers: true,
      };

      webpackConfig.output = {
        ...webpackConfig.output,
        environment: {
          ...webpackConfig.output?.environment,
          asyncFunction: true,
        },
      };

      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fallback: {
          stream: require.resolve('stream-browserify'),
          buffer: require.resolve('buffer/'),
          crypto: require.resolve('crypto-browserify'),
          process: require.resolve('process/browser'),
          path: require.resolve('path-browserify'),
          fs: false,
        },
      };

      webpackConfig.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });

      // Add this for CSS modules support
      webpackConfig.module.rules.forEach(rule => {
        if (rule.oneOf) {
          rule.oneOf.unshift({
            test: /\.module\.css$/,
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: {
                  modules: true,
                },
              },
              'postcss-loader',
            ],
          });
        }
      });
      return webpackConfig;
    },
  },
  style: {
    // postcss: {
    //   plugins: [require('tailwindcss'), require('autoprefixer')],
    // },
    postcss: {
      mode: 'extends',
      loaderOptions: {
        postcssOptions: {
          config: path.resolve(__dirname, 'postcss.config.js'),
        },
      },
      },
  },
};
