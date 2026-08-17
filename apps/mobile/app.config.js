const { loadProjectEnv } = require('@expo/env');

loadProjectEnv(__dirname, { silent: true });

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  if (!googleMapsApiKey) {
    const message =
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is required to build the customer Android map.';
    // Still fail hard for real (EAS) builds so we never ship an app with a broken map.
    if (process.env.EAS_BUILD === 'true') {
      throw new Error(message);
    }
    // In local dev, warn and start anyway so the rest of the app is testable without
    // a Maps key (the customer map screen won't render until the key is set).
    console.warn(`⚠️  ${message} Continuing without the map (dev only).`);
    return { ...config };
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
