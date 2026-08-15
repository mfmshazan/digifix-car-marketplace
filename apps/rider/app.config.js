const { loadProjectEnv } = require('@expo/env');

loadProjectEnv(__dirname, { silent: true });

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  if (!googleMapsApiKey) {
    throw new Error(
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is required to build the Rider Android map.'
    );
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
