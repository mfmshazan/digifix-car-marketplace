import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, SurfaceCard, StatusBadge } from '../components/Common';
import { authAPI } from '../services/api';
import { saveTokens, saveUserData } from '../services/storage';
import { colors, spacing, typography, radii } from '../styles/theme';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.login({ email, password });
            const { partner, accessToken, refreshToken } = response.data.data;

            await saveTokens(accessToken, refreshToken);
            await saveUserData(partner);
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Please check your credentials';
            console.error('Login failed:', {
                message,
                status: error.response?.status,
                data: error.response?.data,
            });
            Alert.alert('Login Failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <StatusBadge label="Delivery Partner" tone="info" />
                    <Text style={styles.title}>Professional dispatch at your fingertips.</Text>
                    <Text style={styles.subtitle}>
                        Sign in to manage routes, proofs, and live delivery updates from one polished workspace.
                    </Text>
                </View>

                <SurfaceCard style={styles.formCard}>
                    <Text style={styles.formTitle}>Welcome back</Text>
                    <Text style={styles.formSubtitle}>Use your partner account to continue.</Text>

                    <Input
                        label="Email"
                        placeholder="partner@delivery.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Input
                        label="Password"
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        rightAccessory={
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7} style={{ padding: 4 }}>
                                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textMuted || '#6b7280'} />
                            </TouchableOpacity>
                        }
                    />

                    <Button
                        title="Sign In"
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.primaryAction}
                    />

                    <View style={styles.footerContainer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.footerLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

                </SurfaceCard>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    hero: {
        backgroundColor: colors.primary,
        borderRadius: radii.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.hero,
        color: colors.surface,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: 'rgba(255,255,255,0.86)',
    },
    formCard: {
        padding: spacing.lg,
    },
    formTitle: {
        ...typography.h2,
        marginBottom: spacing.xs,
    },
    formSubtitle: {
        ...typography.bodySmall,
        marginBottom: spacing.lg,
    },
    primaryAction: {
        marginBottom: spacing.sm,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
    },
    footerText: {
        ...typography.body,
        color: colors.textMuted || '#6b7280',
    },
    footerLink: {
        ...typography.body,
        color: colors.primary || '#1a1a1a',
        fontWeight: 'bold',
    },
});
