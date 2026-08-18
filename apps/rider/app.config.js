const { loadProjectEnv } = require('@expo/env');

loadProjectEnv(__dirname, { silent: true });

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  if (!googleMapsApiKey) {
    // EAS secrets are not available when EAS CLI reads this config locally.
    // The real key is injected from EAS secrets during the cloud build.
    console.warn('⚠️  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set locally — expected to be injected by EAS secrets during cloud build.');
  }

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
