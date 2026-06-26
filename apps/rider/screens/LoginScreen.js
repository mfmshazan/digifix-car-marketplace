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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, SurfaceCard } from '../components/Common';
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
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.brandRow}>
                        <View style={styles.brandMark}>
                            <Ionicons name="bicycle" size={24} color={colors.surface} />
                        </View>
                        <View>
                            <Text style={styles.brandName}>DIGIFIX RIDER</Text>
                            <Text style={styles.brandTagline}>Delivery partner workspace</Text>
                        </View>
                    </View>

                    <View style={styles.hero}>
                        <View style={styles.heroGlowLarge} />
                        <View style={styles.heroGlowSmall} />
                        <View style={styles.heroIcon}>
                            <Ionicons name="navigate" size={25} color={colors.surface} />
                        </View>
                        <Text style={styles.heroEyebrow}>READY FOR THE ROAD</Text>
                        <Text style={styles.title}>Your route command center.</Text>
                        <Text style={styles.subtitle}>
                            Receive delivery offers, navigate every stop, and close orders with verified proof.
                        </Text>
                        <View style={styles.heroFeatures}>
                            <HeroFeature icon="radio-outline" label="Live offers" />
                            <HeroFeature icon="map-outline" label="Road routes" />
                            <HeroFeature icon="shield-checkmark-outline" label="Proof capture" />
                        </View>
                    </View>

                    <SurfaceCard style={styles.formCard}>
                        <View style={styles.formHeading}>
                            <Text style={styles.formEyebrow}>PARTNER ACCESS</Text>
                            <Text style={styles.formTitle}>Welcome back</Text>
                            <Text style={styles.formSubtitle}>Sign in to start receiving delivery work.</Text>
                        </View>

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
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7} style={styles.eyeButton}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.textSecondary} />
                                </TouchableOpacity>
                            }
                        />

                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword')}
                            style={styles.forgotPasswordLink}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <Button
                            title="Sign In"
                            icon="arrow-forward"
                            iconPosition="right"
                            onPress={handleLogin}
                            loading={loading}
                            style={styles.primaryAction}
                        />

                        <View style={styles.footerContainer}>
                            <Text style={styles.footerText}>New delivery partner?</Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Register')}
                                style={styles.createAccountButton}
                            >
                                <Text style={styles.footerLink}>Create account</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
                            </TouchableOpacity>
                        </View>

                    </SurfaceCard>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function HeroFeature({ icon, label }) {
    return (
        <View style={styles.heroFeature}>
            <Ionicons name={icon} size={16} color="#BFDBFE" />
            <Text style={styles.heroFeatureText}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        justifyContent: 'center',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    brandMark: {
        width: 44,
        height: 44,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondary,
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    brandName: {
        ...typography.overline,
        color: colors.text,
    },
    brandTagline: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    hero: {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: colors.primary,
        borderRadius: radii.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    heroGlowLarge: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: 'rgba(59,130,246,0.18)',
        right: -70,
        top: -95,
    },
    heroGlowSmall: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(139,92,246,0.15)',
        right: 45,
        bottom: -62,
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        marginBottom: spacing.lg,
    },
    heroEyebrow: {
        ...typography.overline,
        color: '#93C5FD',
        marginBottom: spacing.sm,
    },
    title: {
        ...typography.h1,
        color: colors.surface,
        marginBottom: spacing.sm,
        maxWidth: 290,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textOnDarkMuted,
        maxWidth: 330,
    },
    heroFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    heroFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    heroFeatureText: {
        ...typography.caption,
        color: colors.textOnDark,
    },
    formCard: {
        padding: spacing.lg,
        borderColor: colors.border,
    },
    formHeading: {
        marginBottom: spacing.lg,
    },
    formEyebrow: {
        ...typography.overline,
        color: colors.secondary,
        marginBottom: 6,
    },
    formTitle: {
        ...typography.h2,
    },
    formSubtitle: {
        ...typography.bodySmall,
        marginTop: spacing.xs,
    },
    primaryAction: {
        marginBottom: spacing.sm,
    },
    eyeButton: {
        padding: 6,
    },
    forgotPasswordLink: {
        alignSelf: 'flex-end',
        paddingVertical: spacing.xs,
        marginTop: -spacing.xs,
        marginBottom: spacing.xs,
    },
    forgotPasswordText: {
        ...typography.bodySmall,
        color: colors.secondary,
        fontWeight: '700',
    },
    footerContainer: {
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
    },
    footerText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    createAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        padding: spacing.xs,
    },
    footerLink: {
        ...typography.bodySmall,
        color: colors.secondary,
        fontWeight: '800',
    },
});
