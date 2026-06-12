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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <StatusBadge label="New Partner" tone="warning" />
                    <Text style={styles.title}>Create a driver profile that feels ready on day one.</Text>
                    <Text style={styles.subtitle}>
                        Set up your account, vehicle details, and secure credentials to join the delivery network.
                    </Text>
                </View>

                <SurfaceCard style={styles.formCard}>
                    <Text style={styles.formTitle}>Create Account</Text>
                    <Text style={styles.formSubtitle}>Required fields are marked and saved securely.</Text>

                    {error ? (
                        <Text style={{ color: '#FF3B30', marginBottom: 16 }}>{error}</Text>
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
                    <Input
                        label="Password"
                        placeholder="Create a password"
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        secureTextEntry={!showPassword}
                        rightAccessory={
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7} style={{ padding: 4 }}>
                                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={colors.textMuted || '#6b7280'} />
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
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7} style={{ padding: 4 }}>
                                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color={colors.textMuted || '#6b7280'} />
                            </TouchableOpacity>
                        }
                    />
                    <Input
                        label="Vehicle Type"
                        placeholder="Motorcycle, car, bicycle"
                        value={formData.vehicleType}
                        onChangeText={(text) => setFormData({ ...formData, vehicleType: text })}
                    />
                    <Input
                        label="Vehicle Number"
                        placeholder="Registration or identifier"
                        value={formData.vehicleNumber}
                        onChangeText={(text) => setFormData({ ...formData, vehicleNumber: text })}
                    />

                    <Button
                        title="Create Account"
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.primaryAction}
                    />

                    <Button
                        title="Back to Sign In"
                        onPress={() => navigation.goBack()}
                        variant="outline"
                    />
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
    },
    hero: {
        backgroundColor: colors.primaryDark,
        borderRadius: radii.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h1,
        color: colors.surface,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.body,
        color: 'rgba(255,255,255,0.82)',
    },
    formCard: {
        padding: spacing.lg,
        marginBottom: spacing.lg,
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
});
