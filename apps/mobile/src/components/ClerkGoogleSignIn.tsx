import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { clerkGoogleCallback } from '../api/auth';

// Warm up the browser for smooth OAuth flow
WebBrowser.maybeCompleteAuthSession();

export const ClerkGoogleSignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [loading, setLoading] = React.useState(false);

  // Handle Google OAuth sign-in
  const onGooglePress = useCallback(async () => {
    if (!isLoaded) return;

    try {
      setLoading(true);

      // Start OAuth flow
      const { createdSessionId, setActive: setClerkSession } = await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: 'your-app://oauth-callback', // Update to your scheme
        additionalScopes: ['profile', 'email'],
      });

      // If we have a session, set it as active
      if (createdSessionId) {
        await setClerkSession({ session: createdSessionId });

        // Get the session token
        const session = await signIn.getSession({ sessionId: createdSessionId });
        const clerkToken = await session?.getToken();

        if (clerkToken) {
          // Send token to your backend
          const response = await clerkGoogleCallback(clerkToken);

          if (response.success && response.data?.token) {
            // Token is automatically saved by clerkGoogleCallback
            Alert.alert('Success', 'Signed in with Google!');
            // Navigate to home screen
            // navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
          }
        }
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signIn, setActive]);

  if (!isLoaded || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.googleButton}
      onPress={onGooglePress}
      disabled={loading}
    >
      <Text style={styles.googleButtonText}>
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
