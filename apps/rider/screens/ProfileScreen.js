import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Dropdown, SurfaceCard, SectionHeader } from '../components/Common';
import { partnerAPI, authAPI, reviewsAPI } from '../services/api';

import { clearTokens, getRefreshToken } from '../services/storage';
import { colors, spacing, shadows } from '../styles/theme';

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

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await partnerAPI.getProfile();
            const profile = response.data.data;
            setPartner(profile);
            setFormData(createProfileForm(profile));
        } catch (error) {
            Alert.alert('Error', 'Failed to load profile');
        }

        try {
            const feedbackRes = await reviewsAPI.getDriverSummary();
            setFeedbackSummary(feedbackRes.data?.data || null);
        } catch (_) {
            // Silently ignore optional feedback
        }

    };

    const handleChange = (key, value) => {
        setFormData((current) => ({ ...current, [key]: value }));
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
            'This will permanently delete your rider partner account and sign you out. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Account',
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
                                    },
                                },
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
        Alert.alert('Logout', 'Are you sure you want to sign out?', [
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

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Personal Information */}
            <SectionHeader
                eyebrow="Profile details"
                title="Personal Information"
                subtitle="Your basic contact details visible to customers during active deliveries."
            />

            <SurfaceCard style={styles.formCard}>
                <View style={styles.formSectionTitle}>
                    <View style={styles.formSectionIcon}>
                        <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.formSectionCopy}>
                        <Text style={styles.formSectionHeading}>Personal & Contact</Text>
                        <Text style={styles.formSectionCaption}>
                            {editing ? 'Editing enabled. Make your updates below.' : 'Locked. Tap Edit Profile to change.'}
                        </Text>
                    </View>
                </View>


                <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChangeText={(text) => handleChange('full_name', text)}
                    editable={editing}
                />

                <Input
                    label="Email Address"
                    value={formData.email}
                    editable={false}
                />

                <Input
                    label="Phone Number"
                    placeholder="7x xxx xxxx"
                    value={(() => {
                        let displayVal = formData.phone || '';
                        if (displayVal.startsWith('+94')) displayVal = displayVal.slice(3);
                        else if (displayVal.startsWith('0')) displayVal = displayVal.slice(1);

                        const cleaned = displayVal.replace(/\D/g, '').slice(0, 9);
                        let formatted = cleaned;
                        if (cleaned.length > 2) formatted = cleaned.slice(0, 2) + ' ' + cleaned.slice(2);
                        if (cleaned.length > 5) formatted = cleaned.slice(0, 2) + ' ' + cleaned.slice(2, 5) + ' ' + cleaned.slice(5);
                        return formatted ? '+94 ' + formatted : '';
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
                />

                <Input
                    label="Address"
                    placeholder="Your residential address"
                    value={formData.address}
                    onChangeText={(text) => handleChange('address', text)}
                    editable={editing}
                    multiline
                    numberOfLines={2}
                />

                <Input
                    label="Driver Bio"
                    placeholder="Short note or experience summary"
                    value={formData.bio}
                    onChangeText={(text) => handleChange('bio', text)}
                    editable={editing}
                    multiline
                    numberOfLines={3}
                />
            </SurfaceCard>

            {/* Vehicle Information */}
            <SectionHeader
                eyebrow="Delivery equipment"
                title="Vehicle Information"
                subtitle="Your registered vehicle used to fulfill order dispatches."
            />

            <SurfaceCard style={styles.formCard}>
                <View style={styles.formSectionTitle}>
                    <View style={[styles.formSectionIcon, { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name="car-sport-outline" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.formSectionCopy}>
                        <Text style={styles.formSectionHeading}>Vehicle Specifications</Text>
                        <Text style={styles.formSectionCaption}>Determines suitable package weights and order types.</Text>
                    </View>
                </View>

                <Dropdown
                    label="Vehicle Type"
                    placeholder="Select vehicle type"
                    value={formData.vehicle_type}
                    onSelect={(text) => handleChange('vehicle_type', text)}
                    options={['Motorcycle', 'Car', 'Van', 'Lorry', 'Three Wheeler']}
                    disabled={!editing}
                />

                <Input
                    label="Vehicle Number Plate"
                    placeholder="e.g. WP ABC-1234"
                    value={formData.vehicle_number}
                    onChangeText={(text) => handleChange('vehicle_number', text.toUpperCase())}
                    editable={editing}
                />
            </SurfaceCard>

            {/* Emergency Contact */}
            <SectionHeader
                eyebrow="Safety & support"
                title="Emergency Contact"
                subtitle="Designated person for critical delivery situations."
            />

            <SurfaceCard style={styles.formCard}>
                <View style={styles.formSectionTitle}>
                    <View style={[styles.formSectionIcon, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="call-outline" size={20} color="#DC2626" />
                    </View>
                    <View style={styles.formSectionCopy}>
                        <Text style={styles.formSectionHeading}>Emergency Contact Details</Text>
                        <Text style={styles.formSectionCaption}>Reachable contact in case of on-road emergencies.</Text>
                    </View>
                </View>

                <Input
                    label="Emergency Contact Name"
                    placeholder="e.g. Relative's name"
                    value={formData.emergency_contact_name}
                    onChangeText={(text) => handleChange('emergency_contact_name', text)}
                    editable={editing}
                />

                <Input
                    label="Emergency Contact Phone"
                    placeholder="Phone number"
                    value={formData.emergency_contact_phone}
                    onChangeText={(text) => handleChange('emergency_contact_phone', text)}
                    editable={editing}
                    keyboardType="phone-pad"
                />
            </SurfaceCard>

            {/* Customer Feedback & Reviews */}
            {!editing && feedbackSummary && (
                <View style={styles.feedbackSection}>
                    <SectionHeader
                        eyebrow="Reputation"
                        title="Customer Reviews"
                        subtitle="Recent ratings and feedback from your completed deliveries."
                    />
                    {feedbackSummary.recentFeedback?.length > 0 ? (
                        feedbackSummary.recentFeedback.map((review, index) => (
                            <SurfaceCard key={index} style={styles.feedbackCard}>
                                <View style={styles.feedbackHeader}>
                                    <View style={styles.starsRow}>
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Ionicons
                                                key={s}
                                                name={s <= review.rating ? 'star' : 'star-outline'}
                                                size={15}
                                                color={s <= review.rating ? '#F59E0B' : '#CBD5E1'}
                                            />
                                        ))}
                                    </View>
                                    <Text style={styles.feedbackDate}>
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                {review.comment ? (
                                    <Text style={styles.feedbackComment}>"{review.comment}"</Text>
                                ) : (
                                    <Text style={styles.feedbackCommentEmpty}>5-star delivery without written comment</Text>
                                )}
                            </SurfaceCard>
                        ))
                    ) : (
                        <SurfaceCard style={styles.emptyFeedbackCard}>
                            <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textMuted} />
                            <Text style={styles.noFeedbackText}>No customer reviews yet.</Text>
                            <Text style={styles.noFeedbackSubtext}>Ratings from your deliveries will appear here.</Text>
                        </SurfaceCard>
                    )}
                </View>
            )}

            {/* Actions & Controls */}
            {editing ? (
                <View style={styles.actions}>
                    <Button
                        title="Save Changes"
                        icon="checkmark-circle-outline"

                        onPress={handleSave}
                        loading={saving}
                        style={styles.actionButton}
                    />
                    <Button
                        title="Cancel"
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
                        onPress={() => setEditing(true)}
                        style={styles.actionButton}
                    />
                    <Button
                        title="Sign Out"
                        icon="log-out-outline"
                        onPress={handleLogout}
                        variant="outline"
                    />
                    <Button
                        title="Delete Partner Account"
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
        padding: spacing.md,
        paddingBottom: 130,
    },
    formCard: {
        marginBottom: spacing.lg,
        padding: spacing.lg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surface,
        ...shadows.small,

    },
    formSectionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 46, 0.06)',
    },
    formSectionCopy: {

        flex: 1,
        alignItems: 'center',
    },
    formSectionHeading: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.text,
    },
    formSectionCaption: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,

    },
    actions: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    actionButton: {
        marginBottom: 0,
    },
    feedbackSection: {
        marginBottom: spacing.lg,
    },
    feedbackCard: {
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
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
        fontSize: 11,
        color: colors.textMuted,
    },
    feedbackComment: {
        fontSize: 13,
        fontStyle: 'italic',
        color: colors.text,
        lineHeight: 18,
    },
    feedbackCommentEmpty: {
        fontSize: 12,
        fontStyle: 'italic',
        color: colors.textMuted,
    },
    emptyFeedbackCard: {
        padding: spacing.xl,
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
    },
    noFeedbackText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginTop: spacing.sm,
    },
    noFeedbackSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
=======
>>>>>>> origin/muzny
});


