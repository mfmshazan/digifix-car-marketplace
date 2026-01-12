import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export function Loading({ message, fullScreen = false, size = 'large' }: LoadingProps) {
  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color="#4285F4" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
