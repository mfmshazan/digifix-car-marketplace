import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchDriverHome,
    selectAssignedDeliveries,
    selectHomeLoading,
    selectHomeProfile,
} from '../store/slices/homeSlice';
import { resolveMediaUrl } from '../utils/media';
import { partnerAPI } from '../services/api';
import { StatusBadge } from '../components/Common';
import { colors, radii, shadows, spacing } from '../styles/theme';

const menuItems = [
    { route: 'RiderProfile', label: 'Profile', icon: 'person-outline' },
    { route: 'AssignedDeliveries', label: 'Assigned Deliveries', icon: 'car-outline' },
    { route: 'JobHistory', label: 'Delivery History', icon: 'receipt-outline' },
];

const formatRating = (value) => {
    const rating = Number(value);
    return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
};

export default function ProfileHubScreen({ navigation }) {
    const dispatch = useDispatch();
    const profile = useSelector(selectHomeProfile);
    const assignedDeliveries = useSelector(selectAssignedDeliveries);
    const isLoading = useSelector(selectHomeLoading);
    const [imgError, setImgError] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchDriverHome());
            setImgError(false);
        }, [dispatch])
    );

    const fullName = profile?.full_name || 'Rider';
    const initials = fullName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const photoUrl = resolveMediaUrl(profile?.profile_photo_url);
    const vehicleType = profile?.vehicle_type || 'Vehicle not set';
    const vehicleIcon = vehicleType.toLowerCase() === 'car'
        ? 'car-outline'
        : vehicleType.toLowerCase() === 'lorry'
            ? 'bus-outline'
            : 'bicycle-outline';

    const handlePhotoPick = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert(
                'Permission needed',
                'Photo library permission is required to update your profile photo.'
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || !result.assets?.[0]?.uri) {
            return;
        }

        setUploadingPhoto(true);
        try {
            await partnerAPI.uploadPhoto(result.assets[0].uri);
            setImgError(false);
            await dispatch(fetchDriverHome());
            Alert.alert('Photo Updated', 'Your profile picture has been updated.');
        } catch (error) {
            Alert.alert(
                'Upload Failed',
                error?.response?.data?.message || error?.message || 'Could not update your photo.'
            );
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleRemovePhoto = () => {
        Alert.alert('Remove Photo', 'Remove your current profile photo?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    setUploadingPhoto(true);
                    try {
                        await partnerAPI.removePhoto();
                        setImgError(false);
                        await dispatch(fetchDriverHome());
                    } catch (error) {
                        Alert.alert(
                            'Remove Failed',
                            error?.response?.data?.message || error?.message || 'Could not remove your photo.'
                        );
                    } finally {
                        setUploadingPhoto(false);
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroGlowLarge} />
                    <View style={styles.heroGlowSmall} />

                    <View style={styles.heroTopRow}>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="shield-checkmark" size={13} color="#93C5FD" />
                            <Text style={styles.verifiedBadgeText}>VERIFIED RIDER</Text>
                        </View>
                        <StatusBadge
                            label={profile?.status || 'online'}
                            tone={profile?.status === 'offline'
                                ? 'danger'
                                : profile?.status === 'busy'
                                    ? 'warning'
                                    : 'success'}
                        />
                    </View>

                    <View style={styles.heroProfileRow}>
                        <View style={styles.heroAvatarContainer}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Change profile photo"
                                onPress={handlePhotoPick}
                                disabled={uploadingPhoto}
                                style={({ pressed }) => [
                                    styles.heroAvatarWrap,
                                    pressed && styles.photoActionPressed,
                                ]}
                            >
                                <View style={styles.heroAvatarFallback}>
                                    {isLoading && !profile ? (
                                        <ActivityIndicator color="#93C5FD" />
                                    ) : (
                                        <Text style={styles.heroAvatarInitials}>{initials}</Text>
                                    )}
                                </View>
                                {photoUrl && !imgError ? (
                                    <Image
                                        source={{ uri: photoUrl }}
                                        style={styles.heroAvatar}
                                        onError={() => setImgError(true)}
                                    />
                                ) : null}
                                {uploadingPhoto ? (
                                    <View style={styles.avatarLoadingOverlay}>
                                        <ActivityIndicator color="#FFFFFF" />
                                    </View>
                                ) : null}
                            </Pressable>
                            <View style={styles.cameraBadge}>
                                <Ionicons name="camera" size={15} color="#FFFFFF" />
                            </View>
                        </View>

                        <View style={styles.heroCopy}>
                            <Text style={styles.heroName} numberOfLines={1}>{fullName}</Text>
                            <Text style={styles.heroEmail} numberOfLines={1}>
                                {profile?.email || 'Rider account'}
                            </Text>
                            <View style={styles.vehicleTag}>
                                <Ionicons name={vehicleIcon} size={14} color="#E2E8F0" />
                                <Text style={styles.vehicleTagText} numberOfLines={1}>
                                    {vehicleType}
                                    {profile?.vehicle_number ? ` · ${profile.vehicle_number}` : ''}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.photoActions}>
                        <Pressable
                            onPress={handlePhotoPick}
                            disabled={uploadingPhoto}
                            style={({ pressed }) => [styles.photoAction, pressed && styles.photoActionPressed]}
                        >
                            <Ionicons name="camera-outline" size={14} color="#93C5FD" />
                            <Text style={styles.changePhotoText}>
                                {photoUrl ? 'Change Photo' : 'Add Photo'}
                            </Text>
                        </Pressable>
                        {photoUrl ? (
                            <>
                                <Text style={styles.photoActionDivider}>·</Text>
                                <Pressable
                                    onPress={handleRemovePhoto}
                                    disabled={uploadingPhoto}
                                    style={({ pressed }) => [styles.photoAction, pressed && styles.photoActionPressed]}
                                >
                                    <Ionicons name="trash-outline" size={14} color="#FCA5A5" />
                                    <Text style={styles.removePhotoText}>Remove</Text>
                                </Pressable>
                            </>
                        ) : null}
                    </View>

                    <View style={styles.heroStats}>
                        <View style={styles.heroStat}>
                            <View style={[styles.heroStatIcon, styles.deliveriesIcon]}>
                                <Ionicons name="checkmark-done" size={18} color="#34D399" />
                            </View>
                            <View>
                                <Text style={styles.heroStatValue}>{profile?.total_deliveries || 0}</Text>
                                <Text style={styles.heroStatLabel}>Deliveries</Text>
                            </View>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <View style={styles.heroStat}>
                            <View style={[styles.heroStatIcon, styles.ratingIcon]}>
                                <Ionicons name="star" size={18} color="#FBBF24" />
                            </View>
                            <View>
                                <Text style={styles.heroStatValue}>{formatRating(profile?.rating)}</Text>
                                <Text style={styles.heroStatLabel}>Rating</Text>
                            </View>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <View style={styles.heroStat}>
                            <View style={[styles.heroStatIcon, styles.levelIcon]}>
                                <Ionicons name="ribbon" size={18} color="#60A5FA" />
                            </View>
                            <View>
                                <Text style={styles.heroStatValue}>PRO</Text>
                                <Text style={styles.heroStatLabel}>Level</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.menuCard}>
                    {menuItems.map((item, index) => (
                        <Pressable
                            key={item.route}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${item.label}`}
                            onPress={() => navigation.navigate(item.route)}
                            style={({ pressed }) => [
                                styles.menuRow,
                                index < menuItems.length - 1 && styles.menuRowBorder,
                                pressed && styles.menuRowPressed,
                            ]}
                        >
                            <View style={styles.menuIcon}>
                                <Ionicons name={item.icon} size={25} color={colors.primary} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            {item.route === 'AssignedDeliveries' && assignedDeliveries.length > 0 ? (
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{assignedDeliveries.length}</Text>
                                </View>
                            ) : null}
                            <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.primaryDark,
    },
    header: {
        height: 96,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primaryDark,
    },
    headerTitle: {
        color: colors.textOnDark,
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '800',
        letterSpacing: 0,
    },
    scrollView: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        paddingHorizontal: spacing.md,
        paddingBottom: 112,
    },
    heroCard: {
        position: 'relative',
        overflow: 'hidden',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
        padding: spacing.lg,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: '#1E1E4E',
        backgroundColor: '#00002E',
        ...shadows.medium,
    },
    heroGlowLarge: {
        position: 'absolute',
        width: 220,
        height: 220,
        top: -110,
        right: -80,
        borderRadius: 110,
        backgroundColor: 'rgba(59, 130, 246, 0.22)',
    },
    heroGlowSmall: {
        position: 'absolute',
        width: 140,
        height: 140,
        left: -40,
        bottom: -60,
        borderRadius: 70,
        backgroundColor: 'rgba(236, 72, 153, 0.14)',
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(147, 197, 253, 0.35)',
        borderRadius: radii.pill,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    verifiedBadgeText: {
        color: '#93C5FD',
        fontSize: 10,
        lineHeight: 14,
        fontWeight: '800',
        letterSpacing: 0.9,
    },
    heroProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    heroAvatarContainer: {
        position: 'relative',
    },
    heroAvatarWrap: {
        width: 92,
        height: 92,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.28)',
        borderRadius: 46,
        backgroundColor: '#111827',
    },
    heroAvatar: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    heroAvatarFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111827',
    },
    heroAvatarInitials: {
        color: '#FFFFFF',
        fontSize: 28,
        lineHeight: 34,
        fontWeight: '800',
        letterSpacing: 1,
    },
    avatarLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.62)',
    },
    cameraBadge: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 31,
        height: 31,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#00002E',
        borderRadius: 16,
        backgroundColor: '#2563EB',
    },
    heroCopy: {
        flex: 1,
        minWidth: 0,
    },
    heroName: {
        color: '#FFFFFF',
        fontSize: 21,
        lineHeight: 27,
        fontWeight: '800',
    },
    heroEmail: {
        marginTop: 2,
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        lineHeight: 17,
    },
    vehicleTag: {
        alignSelf: 'flex-start',
        maxWidth: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 7,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    vehicleTagText: {
        flexShrink: 1,
        color: '#E2E8F0',
        fontSize: 11,
        lineHeight: 15,
        fontWeight: '600',
    },
    photoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    photoAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
    },
    photoActionPressed: {
        opacity: 0.65,
    },
    changePhotoText: {
        color: '#93C5FD',
        fontSize: 11,
        fontWeight: '700',
    },
    removePhotoText: {
        color: '#FCA5A5',
        fontSize: 11,
        fontWeight: '700',
    },
    photoActionDivider: {
        color: 'rgba(255, 255, 255, 0.32)',
        fontSize: 13,
    },
    heroStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.12)',
    },
    heroStat: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    heroStatIcon: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
    },
    deliveriesIcon: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    ratingIcon: {
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    levelIcon: {
        backgroundColor: 'rgba(59, 130, 246, 0.14)',
    },
    heroStatValue: {
        color: '#FFFFFF',
        fontSize: 16,
        lineHeight: 20,
        fontWeight: '800',
    },
    heroStatLabel: {
        marginTop: 1,
        color: 'rgba(255, 255, 255, 0.64)',
        fontSize: 10,
        lineHeight: 14,
        fontWeight: '500',
    },
    heroStatDivider: {
        width: 1,
        height: 34,
        marginHorizontal: spacing.xs,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    menuCard: {
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        ...shadows.small,
    },
    menuRow: {
        minHeight: 86,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
    },
    menuRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },
    menuRowPressed: {
        backgroundColor: colors.primarySoft,
    },
    menuIcon: {
        width: 48,
        height: 48,
        borderRadius: radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primarySoft,
    },
    menuLabel: {
        flex: 1,
        color: colors.text,
        fontSize: 17,
        lineHeight: 23,
        fontWeight: '700',
        letterSpacing: 0,
    },
    countBadge: {
        minWidth: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
        borderRadius: 13,
        backgroundColor: colors.secondary,
    },
    countBadgeText: {
        color: colors.surface,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '800',
        letterSpacing: 0,
    },
});
