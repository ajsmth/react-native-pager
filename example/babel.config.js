module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@crowdlinker/react-native-pager': '../src/index',
        },
      },
    ],
  ],
};
