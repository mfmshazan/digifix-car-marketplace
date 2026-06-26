import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authAPI } from '../services/api';
import { colors, spacing, typography, radii } from '../styles/theme';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }) {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const otpInputRefs = useRef([]);

    // Step 1: Request OTP
    const handleRequestOtp = async () => {
        if (!email) {
            setError('Please enter your email');
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            await authAPI.requestOtp(email.trim().toLowerCase());
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to request OTP');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async () => {
        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter the 6-digit OTP');
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            const res = await authAPI.verifyOtp(email.trim().toLowerCase(), otpValue);
            if (res.data?.data?.resetToken) {
                setResetToken(res.data.data.resetToken);
                setStep(3);
            } else {
                throw new Error('No reset token received');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to verify OTP');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async () => {
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(password)) {
            setError(
                'Password must be at least 8 characters with uppercase, lowercase, number and symbol.'
            );
            return;
        }
        try {
            setIsLoading(true);
            setError(null);
            await authAPI.resetPassword(resetToken, password);
            setIsSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    const updateOtp = (index, value) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyPress = (index, key) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const handleBack = () => {
        if (step === 1) {
            navigation.goBack();
        } else {
            setStep(step - 1);
            setError(null);
        }
    };

    const isButtonDisabled =
        isLoading ||
        (step === 1 && !email) ||
        (step === 2 && otp.join('').length !== 6) ||
        (step === 3 && (!password || !confirmPassword));

    // Success screen
    if (isSuccess) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.successContainer}>
                    <View style={styles.successIconCircle}>
                        <Ionicons name="checkmark-circle" size={56} color={colors.success} />
                    </View>
                    <Text style={styles.successTitle}>Password Reset!</Text>
                    <Text style={styles.successSubtitle}>
                        Your password has been successfully updated. You can now sign in with your new password.
                    </Text>
                    <TouchableOpacity
                        style={[styles.primaryButton, styles.successPrimaryButton]}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.primaryButtonText}>Back to Sign In</Text>
                        <Ionicons name="arrow-forward" size={18} color={colors.surface} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const stepTitles = ['Forgot Password?', 'Verify Code', 'New Password'];
    const stepSubtitles = [
        "Enter your account email. We'll send you a 6-digit OTP.",
        `Enter the code sent to:\n${email}`,
        'Create a strong new password for your account.',
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={20} color={colors.text} />
                        <Text style={styles.backText}>{step === 1 ? 'Back to Sign In' : 'Back'}</Text>
                    </TouchableOpacity>

                    {/* Step indicator */}
                    <View style={styles.stepIndicator}>
                        {[1, 2, 3].map((s) => (
                            <View
                                key={s}
                                style={[
                                    styles.stepDot,
                                    s === step && styles.stepDotActive,
                                    s < step && styles.stepDotDone,
                                ]}
                            >
                                {s < step ? (
                                    <Ionicons name="checkmark" size={10} color={colors.surface} />
                                ) : null}
                            </View>
                        ))}
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        {/* Icon */}
                        <View style={styles.cardIconWrap}>
                            <Ionicons
                                name={
                                    step === 1
                                        ? 'lock-open-outline'
                                        : step === 2
                                        ? 'mail-open-outline'
                                        : 'shield-checkmark-outline'
                                }
                                size={28}
                                color={colors.secondary}
                            />
                        </View>

                        <Text style={styles.cardTitle}>{stepTitles[step - 1]}</Text>
                        <Text style={styles.cardSubtitle}>{stepSubtitles[step - 1]}</Text>

                        {/* Error */}
                        {error ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Step 1: Email */}
                        {step === 1 && (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="partner@delivery.com"
                                        placeholderTextColor={colors.textMuted}
                                        value={email}
                                        onChangeText={(t) => { setEmail(t); setError(null); }}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Step 2: OTP */}
                        {step === 2 && (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>VERIFICATION CODE</Text>
                                <View style={styles.otpRow}>
                                    {otp.map((digit, index) => (
                                        <TextInput
                                            key={index}
                                            ref={(el) => { otpInputRefs.current[index] = el; }}
                                            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                                            maxLength={1}
                                            keyboardType="number-pad"
                                            value={digit}
                                            onChangeText={(val) => updateOtp(index, val)}
                                            onKeyPress={({ nativeEvent }) =>
                                                handleOtpKeyPress(index, nativeEvent.key)
                                            }
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Step 3: New Password */}
                        {step === 3 && (
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                                <View style={[styles.inputWrapper, styles.inputSpacing]}>
                                    <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Min 8 chars, upper, lower, number, symbol"
                                        placeholderTextColor={colors.textMuted}
                                        value={password}
                                        onChangeText={(t) => { setPassword(t); setError(null); }}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Repeat your password"
                                        placeholderTextColor={colors.textMuted}
                                        value={confirmPassword}
                                        onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Primary Action Button */}
                        <TouchableOpacity
                            style={[styles.primaryButton, isButtonDisabled && styles.primaryButtonDisabled]}
                            disabled={isButtonDisabled}
                            onPress={() => {
                                if (step === 1) handleRequestOtp();
                                else if (step === 2) handleVerifyOtp();
                                else handleResetPassword();
                            }}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={colors.surface} />
                            ) : (
                                <>
                                    <Text style={styles.primaryButtonText}>
                                        {step === 1 && 'Send OTP'}
                                        {step === 2 && 'Verify Code'}
                                        {step === 3 && 'Update Password'}
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color={colors.surface} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
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
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.lg,
        alignSelf: 'flex-start',
        padding: spacing.xs,
    },
    backText: {
        ...typography.bodySmall,
        color: colors.text,
        fontWeight: '600',
    },
    stepIndicator: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepDotActive: {
        width: 28,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.secondary,
    },
    stepDotDone: {
        backgroundColor: colors.secondary,
        width: 10,
        height: 10,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    cardIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: colors.secondarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    cardTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    cardSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    fieldGroup: {
        marginBottom: spacing.md,
    },
    fieldLabel: {
        ...typography.overline,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        marginLeft: 2,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    inputSpacing: {
        marginBottom: spacing.md,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    otpBox: {
        width: width > 400 ? 50 : 42,
        height: 56,
        backgroundColor: colors.background,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radii.md,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
    },
    otpBoxFilled: {
        borderColor: colors.secondary,
        backgroundColor: colors.secondarySoft,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.secondary,
        borderRadius: radii.md,
        height: 52,
        marginTop: spacing.lg,
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonDisabled: {
        backgroundColor: colors.textMuted,
        shadowOpacity: 0,
        elevation: 0,
    },
    primaryButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '700',
    },

    // Success screen
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    successIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.successSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    successPrimaryButton: {
        minWidth: 240,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xxl,
    },
    successTitle: {
        ...typography.h1,
        color: colors.text,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    successSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
});
