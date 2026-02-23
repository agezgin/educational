module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@types': './src/types',
          '@theme': './src/theme',
          '@core': './src/core',
          '@store': './src/store',
          '@components': './src/components',
          '@screens': './src/screens',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@utils': './src/utils',
          '@i18n': './src/i18n',
        },
      },
    ],
  ],
};
