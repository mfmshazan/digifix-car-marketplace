const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Mock @clerk/clerk-expo to prevent native module crashes in Expo Go
// Set ENABLE_CLERK=true in .env to use real Clerk (requires dev build)
const useRealClerk = process.env.ENABLE_CLERK === 'true';

if (!useRealClerk) {
    config.resolver.resolveRequest = (context, moduleName, platform) => {
        // Intercept @clerk/clerk-expo and expo-auth-session imports
        if (moduleName === '@clerk/clerk-expo' ||
            moduleName.startsWith('@clerk/clerk-expo/') ||
            moduleName === 'expo-auth-session' ||
            moduleName.startsWith('expo-auth-session/')) {
            // Return our mock module instead
            return {
                filePath: require.resolve('./src/lib/clerk-mock.tsx'),
                type: 'sourceFile',
            };
        }

        // Default resolution
        return context.resolveRequest(context, moduleName, platform);
    };

    console.log('📱 Metro: Using Clerk mock (Expo Go compatible)');
    console.log('   To enable real Clerk, set ENABLE_CLERK=true and use a dev build');
} else {
    console.log('🔐 Metro: Using real Clerk (requires dev build)');
}

module.exports = config;
