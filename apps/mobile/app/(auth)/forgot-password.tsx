import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { requestOtp, verifyOtp, resetPassword } from '../../src/api/auth';

const { width } = Dimensions.get('window');

export default function ForgotPassword() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  const handleRequestOtp = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      await requestOtp(email);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await verifyOtp(email, otpValue);
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setStep(3);
      } else {
        throw new Error('No reset token received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await resetPassword(resetToken, password);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOtp = (index: number, value: string) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  if (isSuccess) {
    return (
        <View style={styles.container}>
            <View style={[styles.card, styles.successCard]}>
                <View style={[styles.iconCircle, styles.successIconCircle]}>
                    <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                </View>
                <Text style={styles.title}>Success!</Text>
                <Text style={styles.subtitle}>
                    Your password has been successfully reset.
                </Text>
                <TouchableOpacity 
                    style={styles.primaryButton}
                    onPress={() => router.replace('/login')}
                >
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
  }

  const isButtonDisabled = isLoading || 
    (step === 1 && !email) || 
    (step === 2 && otp.join('').length !== 6) || 
    (step === 3 && (!password || !confirmPassword));

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
            <View style={styles.logoArea}>
                <View style={styles.logoBox}>
                    <Text style={styles.logoText}>D</Text>
                </View>
            </View>

            <View style={styles.headerArea}>
                <Text style={styles.title}>
                    {step === 1 && "Forgot Password?"}
                    {step === 2 && "Verify Code"}
                    {step === 3 && "Secure Account"}
                </Text>
                <Text style={styles.subtitle}>
                    {step === 1 && "Enter your email address and we'll send you a 6-digit OTP to reset your password."}
                    {step === 2 && `Enter the code sent to:\n${email}`}
                    {step === 3 && "Create a strong new password to protect your account."}
                </Text>
            </View>

            {error && (
                <View style={styles.errorArea}>
                    <Ionicons name="alert-circle" size={18} color="#EF4444" style={styles.errorIcon} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.inputArea}>
                {step === 1 && (
                    <View>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={(text) => { setEmail(text); setError(null); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.otpWrapper}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(el) => { otpInputRefs.current[index] = el; }}
                                style={styles.otpInput}
                                maxLength={1}
                                keyboardType="number-pad"
                                value={digit}
                                onChangeText={(val) => updateOtp(index, val)}
                                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                            />
                        ))}
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <View style={styles.inputSpacing}>
                            <Text style={styles.inputLabel}>New Password</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Min 6 characters"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={(text) => { setPassword(text); setError(null); }}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View>
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Repeat your password"
                                    placeholderTextColor="#9CA3AF"
                                    value={confirmPassword}
                                    onChangeText={(text) => { setConfirmPassword(text); setError(null); }}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.primaryButton, isButtonDisabled && styles.disabledButton]}
                    disabled={isButtonDisabled}
                    onPress={() => {
                        if (step === 1) handleRequestOtp();
                        else if (step === 2) handleVerifyOtp();
                        else if (step === 3) handleResetPassword();
                    }}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View style={styles.buttonContent}>
                            <Text style={styles.primaryButtonText}>
                                {step === 1 && "Send OTP"}
                                {step === 2 && "Verify OTP"}
                                {step === 3 && "Update Password"}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color="white" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={styles.footerLink}
                onPress={() => {
                    if (step === 1) router.replace('/login');
                    else setStep(step - 1 as any);
                }}
            >
                <Text style={styles.footerText}>
                    {step === 1 ? "Remember your password? " : "Go back to "}
                    <Text style={styles.footerBold}>
                        {step === 1 ? "Sign In" : "previous step"}
                    </Text>
                </Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  successCard: {
    alignItems: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 56,
    height: 56,
    backgroundColor: '#00002E',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00002E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  errorArea: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputArea: {
    width: '100%',
  },
  inputLabel: {
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputSpacing: {
    marginBottom: 16,
  },
  otpWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otpInput: {
    width: width > 400 ? 50 : 40,
    height: 56,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00002E',
  },
  primaryButton: {
    backgroundColor: '#00002E',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  footerLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  footerBold: {
    color: '#00002E',
    fontWeight: '700',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  successIconCircle: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
});
