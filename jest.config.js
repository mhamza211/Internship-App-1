module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-url-polyfill|@react-navigation|react-native-screens|react-native-safe-area-context|@react-native-async-storage|@supabase|react-native-image-picker|react-native-fs|react-native-share|@react-native-community)/)',
  ],
};
