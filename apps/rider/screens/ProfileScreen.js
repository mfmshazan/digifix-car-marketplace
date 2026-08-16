import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input, Dropdown, SurfaceCard, SectionHeader, StatusBadge } from '../components/Common';
import { partnerAPI, authAPI, reviewsAPI } from '../services/api';
import { clearTokens, getRefreshToken } from '../services/storage';
import { colors, spacing, typography, radii } from '../styles/theme';

const formatRating = (value) => {
    const rating = Number(value);
    return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
};

const createProfileForm = (profile) => ({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    vehicle_type: profile?.vehicle_type || '',
    vehicle_number: profile?.vehicle_number || '',
    profile_photo_url: profile?.profile_photo_url || '',
    bio: profile?.bio || '',
    address: profile?.address || '',
    emergency_contact_name: profile?.emergency_contact_name || '',
    emergency_contact_phone: profile?.emergency_contact_phone || '',
});

export default function ProfileScreen({ navigation }) {
    const [partner, setPartner] = useState(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formData, setFormData] = useState(createProfileForm());
    const [feedbackSummary, setFeedbackSummary] = useState(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const profileRes = await partnerAPI.getProfile();
            const profile = profileRes.data.data;
            setPartner(profile);
            setFormData(createProfileForm(profile));
        } catch (error) {
            Alert.alert('Error', 'Failed to load profile');
        }
        // Load feedback summary separately so it never blocks the profile page
        try {
            const feedbackRes = await reviewsAPI.getDriverSummary();
            setFeedbackSummary(feedbackRes.data?.data || null);
        } catch (_) {
            // Silently ignore — feedback is optional
        }
    };

    const handleChange = (key, value) => {
        setFormData((current) => ({ ...current, [key]: value }));
    };

    const handlePhotoPick = async () => {
        if (!editing) return;

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert('Permission needed', 'Photo library permission is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            handleChange('profile_photo_url', result.assets[0].uri);
        }
    };

    const handleRemovePhoto = () => {
        if (!editing) return;
        handleChange('profile_photo_url', '');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await partnerAPI.updateProfile({
                fullName: formData.full_name,
                phone: formData.phone,
                vehicleType: formData.vehicle_type,
                vehicleNumber: formData.vehicle_number,
                profilePhotoUrl: formData.profile_photo_url,
                bio: formData.bio,
                address: formData.address,
                emergencyContactName: formData.emergency_contact_name,
                emergencyContactPhone: formData.emergency_contact_phone,
            });

            const updatedProfile = response?.data?.data || {
                ...partner,
                ...formData,
            };

            setPartner(updatedProfile);
            setFormData(createProfileForm(updatedProfile));
            setEditing(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProfile = async () => {
        Alert.alert(
            'Delete Profile',
            'This will remove your partner profile and sign you out. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await partnerAPI.deleteProfile();
                            await clearTokens();
                            Alert.alert('Profile Deleted', 'Your profile was removed successfully.', [
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        navigation.reset({
                                            index: 0,
                                            routes: [{ name: 'Login' }],
                                        });
                                    }
                                }
                            ]);
                        } catch (error) {
                            Alert.alert(
                                'Error',
                                error.response?.data?.message || 'Failed to delete profile'
                            );
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const refreshToken = await getRefreshToken();
                        await authAPI.logout(refreshToken);
                    } catch (error) {
                        console.error('Logout error:', error);
                    } finally {
                        await clearTokens();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                },
            },
        ]);
    };

    if (!partner) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const photoUri = editing ? formData.profile_photo_url : partner.profile_photo_url;
    const initials = (partner.full_name || 'DP')
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <SurfaceCard style={styles.heroCard}>
                <View style={styles.heroGlowLarge} />
                <View style={styles.heroGlowSmall} />
                <View style={styles.heroTopRow}>
                    <Text style={styles.heroEyebrow}>RIDER PROFILE</Text>
                    <StatusBadge
                        label={partner.status || 'online'}
                        tone={partner.status === 'offline' ? 'danger' : 'success'}
                    />
                </View>

                <View style={styles.profileHeader}>
                    <View style={styles.avatarWrap}>
                        {photoUri ? (
                            <Image source={{ uri: photoUri }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.heroCopy}>
                        <Text style={styles.heroTitle}>{partner.full_name}</Text>
                        <Text style={styles.heroSubtitle}>{partner.email}</Text>
                        <Text style={styles.heroMeta}>
                            {partner.vehicle_type || 'Vehicle not set'}
                            {partner.vehicle_number ? ` • ${partner.vehicle_number}` : ''}
                        </Text>
                    </View>
                </View>

                <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                        <View style={styles.heroStatIcon}>
                            <Ionicons name="checkmark-done-outline" size={17} color="#A7F3D0" />
                        </View>
                        <View>
                            <Text style={styles.heroStatValue}>{partner.total_deliveries || 0}</Text>
                            <Text style={styles.heroStatLabel}>Deliveries</Text>
                        </View>
                    </View>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                        <View style={styles.heroStatIcon}>
                            <Ionicons name="star" size={17} color="#FDE68A" />
                        </View>
                        <View>
                            <Text style={styles.heroStatValue}>{formatRating(partner.rating)}</Text>
                            <Text style={styles.heroStatLabel}>Rating</Text>
                        </View>
                    </View>
                </View>

                {editing ? (
                    <View style={styles.photoActions}>
                        <Button
                            title="Change Photo"
                            icon="camera-outline"
                            onPress={handlePhotoPick}
                            variant="outline"
                            style={styles.photoButton}
                        />
                        <Button
                            title="Remove Photo"
                            icon="trash-outline"
                            onPress={handleRemovePhoto}
                            variant="ghost"
                            style={styles.photoButton}
                        />
                    </View>
                ) : null}
            </SurfaceCard>

            <SectionHeader
                eyebrow="Partner information"
                title="Account Details"
                subtitle="Keep your contact, vehicle, and emergency information accurate for delivery operations."
            />

            <SurfaceCard style={styles.formCard}>
                <View style={styles.formSectionTitle}>
                    <View style={styles.formSectionIcon}>
                        <Ionicons name="person-outline" size={19} color={colors.secondary} />
                    </View>
                    <View style={styles.formSectionCopy}>
                        <Text style={styles.formSectionHeading}>Personal & vehicle information</Text>
                        <Text style={styles.formSectionCaption}>
                            {editing ? 'Fields are unlocked for editing.' : 'Tap Edit Profile to update these details.'}
                        </Text>
                    </View>
                </View>
                <Input
                    label="Full Name"
                    value={formData.full_name}
                    onChangeText={(text) => handleChange('full_name', text)}
                    editable={editing}
                />
                <Input label="Email" value={formData.email} editable={false} />
                <Input
                    label="Phone"
                    placeholder="7x xxx xxxx"
                    value={(() => {
                        let displayVal = formData.phone || '';
                        if (displayVal.startsWith('+94')) displayVal = displayVal.slice(3);
                        else if (displayVal.startsWith('0')) displayVal = displayVal.slice(1);
                        
                        const cleaned = displayVal.replace(/\D/g, '').slice(0, 9);
                        let formatted = cleaned;
                        if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + ' ' + cleaned.slice(2);
                        if (cleaned.length > 5) formatted = cleaned.slice(0, 2) + ' ' + cleaned.slice(2, 5) + ' ' + cleaned.slice(5);
                        return formatted ? `+94 ${formatted}` : '';
                    })()}
                    onChangeText={(text) => {
                        const cleaned = text.replace(/\D/g, '');
                        let actualNumber = cleaned;
                        if (actualNumber.startsWith('94')) actualNumber = actualNumber.slice(2);
                        if (actualNumber.length <= 9) {
                            handleChange('phone', actualNumber);
                        }
                    }}
                    editable={editing}
                    keyboardType="phone-pad"
                />
                <Dropdown
                    label="Vehicle Type"
                    placeholder="Select vehicle type"
                    value={formData.vehicle_type}
                    onSelect={(text) => handleChange('vehicle_type', text)}
                    options={['Car', 'Motorcycle', 'Lorry']}
                    disabled={!editing}
                />
                <Input
                    label="Vehicle Number"
                    value={formData.vehicle_number}
                    onChangeText={(text) => handleChange('vehicle_number', text.toUpperCase().replace(/[\s-]/g, ''))}
                    editable={editing}
                />
                <Input
                    label="Bio"
                    value={formData.bio}
                    onChangeText={(text) => handleChange('bio', text)}
                    editable={editing}
                    multiline
                    numberOfLines={4}
                />
                <Input
                    label="Address"
                    value={formData.address}
                    onChangeText={(text) => handleChange('address', text)}
                    editable={editing}
                    multiline
                    numberOfLines={3}
                />
                <Input
                    label="Emergency Contact Name"
                    value={formData.emergency_contact_name}
                    onChangeText={(text) => handleChange('emergency_contact_name', text)}
                    editable={editing}
                />
                <Input
                    label="Emergency Contact Phone"
                    value={formData.emergency_contact_phone}
                    onChangeText={(text) => handleChange('emergency_contact_phone', text)}
                    editable={editing}
                />
            </SurfaceCard>


            <View style={styles.statsRow}>
                <SurfaceCard style={styles.statCard}>
                    <Text style={styles.statValue}>{partner.total_deliveries}</Text>
                    <Text style={styles.statLabel}>Total Deliveries</Text>
                </SurfaceCard>
                <SurfaceCard style={styles.statCard}>
                    <Text style={styles.statValue}>{formatRating(partner.rating)}</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                </SurfaceCard>
            </View>

            {/* Feedback Summary */}
            {!editing && feedbackSummary && (
                <View style={styles.feedbackSection}>
                    <SectionHeader
                        title="Customer Feedback"
                        subtitle="Recent ratings and comments from your deliveries"
                    />
                    {feedbackSummary.recentFeedback?.length > 0 ? (
                        feedbackSummary.recentFeedback.map((review, index) => (
                            <SurfaceCard key={index} style={styles.feedbackCard}>
                                <View style={styles.feedbackHeader}>
                                    <View style={styles.starsRow}>
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Text key={s} style={{ color: s <= review.rating ? '#FFB800' : '#E2E8F0', fontSize: 16 }}>★</Text>
                                        ))}
                                    </View>
                                    <Text style={styles.feedbackDate}>
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                {review.comment ? (
                                    <Text style={styles.feedbackComment}>"{review.comment}"</Text>
                                ) : (
                                    <Text style={styles.feedbackCommentEmpty}>No comment provided</Text>
                                )}
                            </SurfaceCard>
                        ))
                    ) : (
                        <Text style={styles.noFeedbackText}>No recent feedback.</Text>
                    )}
                </View>
            )}


            {editing ? (
                <View style={styles.actions}>
                    <Button
                        title="Save Details"
                        icon="checkmark-circle-outline"
                        onPress={handleSave}
                        loading={saving}
                        style={styles.actionButton}
                    />
                    <Button
                        title="Cancel"
                        icon="close-outline"
                        onPress={() => {
                            setEditing(false);
                            setFormData(createProfileForm(partner));
                        }}
                        variant="outline"
                    />
                </View>
            ) : (
                <View style={styles.actions}>
                    <Button
                        title="Edit Profile"
                        icon="create-outline"
                        onPress={() => setEditing(true)}
                        style={styles.actionButton}
                    />
                    <Button title="Logout" icon="log-out-outline" onPress={handleLogout} variant="outline" />
                    <Button
                        title="Delete Profile"
                        icon="trash-outline"
                        onPress={handleDeleteProfile}
                        variant="danger"
                        loading={deleting}
                    />
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 120,
    },
    heroCard: {
        position: 'relative',
        backgroundColor: colors.primary,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        borderColor: colors.primary,
        padding: spacing.lg,
    },
    heroGlowLarge: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: 'rgba(59,130,246,0.18)',
        right: -70,
        top: -100,
    },
    heroGlowSmall: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(139,92,246,0.14)',
        right: 55,
        bottom: -75,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroEyebrow: {
        ...typography.overline,
        color: '#93C5FD',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    avatarWrap: {
        width: 88,
        height: 88,
        borderRadius: radii.pill,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.22)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    avatarInitials: {
        ...typography.h2,
        color: colors.surface,
    },
    heroCopy: {
        flex: 1,
    },
    heroTitle: {
        ...typography.h2,
        color: colors.surface,
    },
    heroSubtitle: {
        ...typography.bodySmall,
        color: 'rgba(255,255,255,0.8)',
        marginTop: spacing.xs,
    },
    heroMeta: {
        ...typography.bodySmall,
        color: 'rgba(255,255,255,0.72)',
        marginTop: spacing.xs,
    },
    heroStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    heroStat: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    heroStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.09)',
    },
    heroStatValue: {
        ...typography.h3,
        color: colors.textOnDark,
    },
    heroStatLabel: {
        ...typography.caption,
        color: colors.textOnDarkMuted,
    },
    heroStatDivider: {
        width: 1,
        height: 34,
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginHorizontal: spacing.md,
    },
    photoActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    photoButton: {
        flex: 1,
    },
    formCard: {
        marginBottom: spacing.lg,
        padding: spacing.lg,
    },
    formSectionTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingBottom: spacing.md,
        marginBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },
    formSectionIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondarySoft,
    },
    formSectionCopy: {
        flex: 1,
    },
    formSectionHeading: {
        ...typography.body,
        color: colors.text,
        fontWeight: '800',
    },
    formSectionCaption: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    actions: {
        gap: spacing.sm,
    },
    actionButton: {
        marginBottom: 0,
    },
    feedbackSection: {
        marginBottom: spacing.xl,
    },
    feedbackCard: {
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    feedbackHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },
    feedbackDate: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    feedbackComment: {
        ...typography.bodyMedium,
        fontStyle: 'italic',
        color: colors.text,
    },
    feedbackCommentEmpty: {
        ...typography.bodyMedium,
        fontStyle: 'italic',
        color: colors.textLight,
    },
    noFeedbackText: {
        ...typography.bodyMedium,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});
