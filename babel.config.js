module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Unistyles rewrites styles in every file under src/ so they update without re-renders.
      ['react-native-unistyles/plugin', { root: 'src' }],
      // Drizzle migrations (src/db/migrations/*.sql) are imported as strings.
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
