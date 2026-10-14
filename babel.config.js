module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Unistyles rewrites styles in every file under src/ so they update without re-renders.
    plugins: [['react-native-unistyles/plugin', { root: 'src' }]],
  };
};
