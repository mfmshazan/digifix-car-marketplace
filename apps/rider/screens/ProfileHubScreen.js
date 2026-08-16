import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchDriverHome,
    selectAssignedDeliveries,
    selectHomeLoading,
    selectHomeProfile,
} from '../store/slices/homeSlice';
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

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchDriverHome());
        }, [dispatch])
    );

    const fullName = profile?.full_name || 'Rider';
    const initials = fullName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

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
                <View style={styles.identitySection}>
                    <View style={styles.avatarWrap}>
                        <View style={styles.avatarFallback}>
                            {isLoading && !profile ? (
                                <ActivityIndicator color={colors.secondary} />
                            ) : (
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            )}
                        </View>
                        {profile?.profile_photo_url ? (
                            <Image source={{ uri: profile.profile_photo_url }} style={styles.avatar} />
                        ) : null}
                    </View>

                    <Text style={styles.name}>{fullName}</Text>
                    <Text style={styles.email}>{profile?.email || 'Rider account'}</Text>
                    <View style={styles.roleBadge}>
                        <Ionicons name="bicycle-outline" size={17} color={colors.primary} />
                        <Text style={styles.roleLabel}>Delivery Rider</Text>
                    </View>
                </View>

                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{profile?.total_deliveries || 0}</Text>
                        <Text style={styles.statLabel}>Deliveries</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatRating(profile?.rating)}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{assignedDeliveries.length}</Text>
                        <Text style={styles.statLabel}>Assigned</Text>
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
    identitySection: {
        alignItems: 'center',
        paddingBottom: spacing.xl,
    },
    avatarWrap: {
        width: 132,
        height: 132,
        marginTop: -42,
        marginBottom: spacing.md,
        borderRadius: 66,
        padding: 5,
        backgroundColor: colors.surface,
        ...shadows.medium,
    },
    avatar: {
        position: 'absolute',
        top: 5,
        right: 5,
        bottom: 5,
        left: 5,
        borderRadius: 61,
    },
    avatarFallback: {
        flex: 1,
        borderRadius: 61,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondarySoft,
    },
    avatarInitials: {
        color: colors.secondaryDark,
        fontSize: 36,
        lineHeight: 42,
        fontWeight: '800',
        letterSpacing: 0,
    },
    name: {
        color: colors.text,
        fontSize: 27,
        lineHeight: 34,
        fontWeight: '800',
        letterSpacing: 0,
        textAlign: 'center',
    },
    email: {
        maxWidth: '90%',
        marginTop: spacing.xs,
        color: colors.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        letterSpacing: 0,
        textAlign: 'center',
    },
    roleBadge: {
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radii.pill,
        backgroundColor: colors.primarySoft,
    },
    roleLabel: {
        color: colors.primary,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '700',
        letterSpacing: 0,
    },
    statsCard: {
        minHeight: 126,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        ...shadows.small,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xs,
    },
    statValue: {
        color: colors.primary,
        fontSize: 25,
        lineHeight: 31,
        fontWeight: '800',
        letterSpacing: 0,
    },
    statLabel: {
        marginTop: spacing.xs,
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        letterSpacing: 0,
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 64,
        backgroundColor: colors.border,
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
