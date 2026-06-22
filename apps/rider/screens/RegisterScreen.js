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
import { Button, Input, Dropdown, SurfaceCard } from '../components/Common';
import { authAPI } from '../services/api';
import { saveTokens, saveUserData } from '../services/storage';
import { colors, spacing, typography, radii } from '../styles/theme';

export default function RegisterScreen({ navigation }) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        vehicleType: '',
        vehicleNumber: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async () => {
        setError('');
        if (!formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all required fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one symbol.');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.register({
                ...formData,
                name: formData.fullName,
                role: 'DELIVERY_PARTNER'
            });
            const { partner, accessToken, refreshToken } = response.data.data;

            await saveTokens(accessToken, refreshToken);
            await saveUserData(partner);

            Alert.alert('Success', 'Account created successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
                    }
                }
            ]);
        } catch (error) {
            const errorData = error.response?.data;
            const message = errorData?.error
                ? `${errorData.message}: ${errorData.error}`
                : (errorData?.message || 'Please try again');

            Alert.alert(
                'Registration Failed',
                message
            );
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
                    <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
                        <View style={styles.backButton}>
                            <Ionicons name="arrow-back" size={20} color={colors.text} />
                        </View>
                        <Text style={styles.backText}>Back to sign in</Text>
                    </TouchableOpacity>

                    <View style={styles.hero}>
                        <View style={styles.heroGlow} />
                        <View style={styles.heroIcon}>
                            <Ionicons name="person-add-outline" size={24} color={colors.surface} />
                        </View>
                        <Text style={styles.heroEyebrow}>JOIN THE RIDER NETWORK</Text>
                        <Text style={styles.title}>Build your delivery partner profile.</Text>
                        <Text style={styles.subtitle}>
                            Add your contact and vehicle information so dispatch can identify and assign you correctly.
                        </Text>
                    </View>

                    <SurfaceCard style={styles.formCard}>
                        <Text style={styles.formEyebrow}>ACCOUNT SETUP</Text>
                        <Text style={styles.formTitle}>Personal details</Text>
                        <Text style={styles.formSubtitle}>Use accurate information that suppliers can verify.</Text>

                        {error ? (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <Input
                            label="Full Name"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                        />
                        <Input
                            label="Email"
                            placeholder="partner@delivery.com"
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Input
                            label="Phone"
                            placeholder="Enter your phone number"
                            value={formData.phone}
                            onChangeText={(text) => setFormData({ ...formData, phone: text })}
                            keyboardType="phone-pad"
                        />

                        <View style={styles.formDivider}>
                            <View style={styles.dividerIcon}>
                                <Ionicons name="lock-closed-outline" size={18} color={colors.secondary} />
                            </View>
                            <View style={styles.dividerCopy}>
                                <Text style={styles.dividerTitle}>Secure credentials</Text>
                                <Text style={styles.dividerText}>Use at least eight characters with upper/lowercase, a number and symbol.</Text>
                            </View>
                        </View>

                        <Input
                            label="Password"
                            placeholder="Create a password"
                            value={formData.password}
                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                            secureTextEntry={!showPassword}
                            rightAccessory={
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7} style={styles.eyeButton}>
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.textSecondary} />
                                </TouchableOpacity>
                            }
                        />
                        <Input
                            label="Confirm Password"
                            placeholder="Re-enter your password"
                            value={formData.confirmPassword}
                            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                            secureTextEntry={!showConfirmPassword}
                            rightAccessory={
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7} style={styles.eyeButton}>
                                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.textSecondary} />
                                </TouchableOpacity>
                            }
                        />

                        <View style={styles.formDivider}>
                            <View style={styles.dividerIcon}>
                                <Ionicons name="bicycle-outline" size={19} color={colors.accent} />
                            </View>
                            <View style={styles.dividerCopy}>
                                <Text style={styles.dividerTitle}>Delivery vehicle</Text>
                                <Text style={styles.dividerText}>This appears to suppliers when they select a rider.</Text>
                            </View>
                        </View>

                        <Dropdown
                            label="Vehicle Type"
                            placeholder="Select vehicle type"
                            value={formData.vehicleType}
                            onSelect={(text) => setFormData({ ...formData, vehicleType: text })}
                            options={['Car', 'Motorcycle', 'Bicycle']}
                        />
                        <Input
                            label="Vehicle Number"
                            placeholder="Registration or identifier"
                            value={formData.vehicleNumber}
                            onChangeText={(text) => setFormData({ ...formData, vehicleNumber: text })}
                        />

                        <Button
                            title="Create Rider Account"
                            icon="checkmark-circle-outline"
                            onPress={handleRegister}
                            loading={loading}
                            style={styles.primaryAction}
                        />
                    </SurfaceCard>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    backText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    hero: {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: colors.primaryDark,
        borderRadius: radii.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    heroGlow: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: 'rgba(59,130,246,0.2)',
        right: -80,
        top: -90,
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
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
        maxWidth: 310,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textOnDarkMuted,
    },
    formCard: {
        padding: spacing.lg,
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
        marginBottom: spacing.lg,
        marginTop: spacing.xs,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderRadius: radii.sm,
        padding: spacing.md,
        backgroundColor: colors.dangerSoft,
        borderWidth: 1,
        borderColor: '#FECACA',
        marginBottom: spacing.md,
    },
    errorText: {
        ...typography.bodySmall,
        color: colors.dangerDark,
        flex: 1,
    },
    formDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        marginBottom: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
    },
    dividerIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: colors.backgroundAccent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dividerCopy: {
        flex: 1,
    },
    dividerTitle: {
        ...typography.bodySmall,
        color: colors.text,
        fontWeight: '800',
    },
    dividerText: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    eyeButton: {
        padding: 6,
    },
    primaryAction: {
        marginTop: spacing.sm,
    },
});
