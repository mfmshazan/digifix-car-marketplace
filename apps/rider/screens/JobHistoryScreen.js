import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { EmptyState, ScreenHero, StatusBadge, SurfaceCard } from '../components/Common';
import { jobsAPI } from '../services/api';
import { colors, radii, spacing, typography } from '../styles/theme';

const toneForStatus = (status) => (status === 'delivered' ? 'success' : 'warning');
const formatHistoryStatus = (status) =>
    status === 'delivered'
        ? 'COMPLETED'
        : status.replace(/_/g, ' ').toUpperCase();

const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function JobHistoryScreen() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            loadHistory();
        }
    }, [isFocused]);

    const loadHistory = async () => {
        try {
            const response = await jobsAPI.getHistory();
            setJobs(response.data.data);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const renderJob = ({ item }) => {
        const deliveredAt = item.delivered_at || item.proof_submitted_at || item.assigned_at;
        const hasProofArchive = Boolean(item.photo_url || item.signature_data);

        return (
            <SurfaceCard style={styles.jobCard}>
                <View style={styles.jobHeader}>
                    <View style={styles.headerCopy}>
                        <Text style={styles.orderEyebrow}>DELIVERY RECORD</Text>
                        <Text style={styles.orderNumber}>{item.order_number}</Text>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.date}>
                                {deliveredAt
                                    ? new Date(deliveredAt).toLocaleString()
                                    : 'Completion time unavailable'}
                            </Text>
                        </View>
                    </View>
                    <StatusBadge
                        label={formatHistoryStatus(item.status)}
                        tone={toneForStatus(item.status)}
                    />
                </View>

                <View style={styles.routeBlock}>
                    <View style={styles.routeRow}>
                        <View style={[styles.routeIcon, styles.pickupIcon]}>
                            <Ionicons name="storefront-outline" size={16} color={colors.secondaryDark} />
                        </View>
                        <View style={styles.routeCopy}>
                            <Text style={styles.addressLabel}>PICKUP</Text>
                            <Text style={styles.address}>{item.pickup_address}</Text>
                        </View>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routeRow}>
                        <View style={[styles.routeIcon, styles.dropoffIcon]}>
                            <Ionicons name="home-outline" size={16} color={colors.dangerDark} />
                        </View>
                        <View style={styles.routeCopy}>
                            <Text style={styles.addressLabel}>DROPOFF</Text>
                            <Text style={styles.address}>{item.dropoff_address}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.archiveHeader}>
                    <View style={styles.archiveTitleRow}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={colors.successDark} />
                        <Text style={styles.archiveTitle}>Completion proof</Text>
                    </View>
                    <View style={[
                        styles.proofStatus,
                        hasProofArchive ? styles.proofStatusReady : styles.proofStatusMissing,
                    ]}>
                        <Text style={[
                            styles.proofStatusText,
                            hasProofArchive ? styles.proofStatusTextReady : styles.proofStatusTextMissing,
                        ]}>
                            {hasProofArchive ? 'ARCHIVED' : 'UNAVAILABLE'}
                        </Text>
                    </View>
                </View>

                {item.recipient_name ? (
                    <Text style={styles.archiveMeta}>Received by {item.recipient_name}</Text>
                ) : null}
                {item.notes ? (
                    <Text style={styles.archiveNotes}>{item.notes}</Text>
                ) : null}

                {hasProofArchive ? (
                    <View style={styles.proofPreviewRow}>
                        {item.photo_url ? (
                            <View style={styles.proofPreviewWrap}>
                                <Image source={{ uri: item.photo_url }} style={styles.photoPreview} />
                                <View style={styles.proofLabel}>
                                    <Text style={styles.proofLabelText}>PHOTO</Text>
                                </View>
                            </View>
                        ) : null}
                        {item.signature_data ? (
                            <View style={styles.proofPreviewWrap}>
                                <Image
                                    source={{ uri: item.signature_data }}
                                    style={styles.signaturePreview}
                                    resizeMode="contain"
                                />
                                <View style={styles.proofLabel}>
                                    <Text style={styles.proofLabelText}>SIGNATURE</Text>
                                </View>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerLabel}>EARNED</Text>
                        <Text style={styles.payment}>{formatCurrency(item.payment_amount)}</Text>
                    </View>
                    <View style={styles.distancePill}>
                        <Ionicons name="navigate-outline" size={15} color={colors.textSecondary} />
                        <Text style={styles.distance}>
                            {item.distance_km ? `${Number(item.distance_km).toFixed(1)} km` : 'Completed'}
                        </Text>
                    </View>
                </View>
            </SurfaceCard>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ScreenHero
                    eyebrow="Delivery archive"
                    title="Job History"
                    subtitle="Review completed routes, payout records, and stored proof of delivery."
                    icon="time-outline"
                >
                    <View style={styles.heroMeta}>
                        <Ionicons name="checkmark-done-circle-outline" size={19} color="#A7F3D0" />
                        <Text style={styles.heroMetaText}>{jobs.length} completed records loaded</Text>
                    </View>
                </ScreenHero>
            </View>

            <FlatList
                data={jobs}
                renderItem={renderJob}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        tintColor={colors.secondary}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadHistory();
                        }}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        title={loading ? 'Loading history...' : 'No delivery history yet'}
                        body="Completed deliveries will appear here once routes are closed."
                        icon="time-outline"
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 120,
    },
    jobCard: {
        marginBottom: spacing.md,
        padding: spacing.lg,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    headerCopy: {
        flex: 1,
    },
    orderEyebrow: {
        ...typography.overline,
        color: colors.secondary,
        marginBottom: 4,
    },
    orderNumber: {
        ...typography.h3,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 5,
    },
    date: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    routeBlock: {
        borderRadius: radii.sm,
        backgroundColor: colors.surfaceMuted,
        padding: spacing.md,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    routeIcon: {
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickupIcon: {
        backgroundColor: colors.secondarySoft,
    },
    dropoffIcon: {
        backgroundColor: colors.dangerSoft,
    },
    routeCopy: {
        flex: 1,
    },
    routeDivider: {
        width: 1,
        height: 18,
        backgroundColor: colors.borderStrong,
        marginLeft: 16,
        marginVertical: 4,
    },
    addressLabel: {
        ...typography.overline,
        color: colors.textMuted,
        marginBottom: 3,
    },
    address: {
        ...typography.bodySmall,
        color: colors.text,
    },
    archiveHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
    },
    archiveTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    archiveTitle: {
        ...typography.bodySmall,
        color: colors.text,
        fontWeight: '800',
    },
    proofStatus: {
        borderRadius: radii.pill,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    proofStatusReady: {
        backgroundColor: colors.successSoft,
    },
    proofStatusMissing: {
        backgroundColor: colors.backgroundAccent,
    },
    proofStatusText: {
        ...typography.overline,
        fontSize: 9,
    },
    proofStatusTextReady: {
        color: colors.successDark,
    },
    proofStatusTextMissing: {
        color: colors.textMuted,
    },
    archiveMeta: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    archiveNotes: {
        ...typography.bodySmall,
        color: colors.text,
        marginTop: spacing.xs,
    },
    proofPreviewRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    proofPreviewWrap: {
        flex: 1,
        position: 'relative',
    },
    photoPreview: {
        width: '100%',
        height: 104,
        borderRadius: radii.sm,
        backgroundColor: colors.surfaceMuted,
    },
    signaturePreview: {
        width: '100%',
        height: 104,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    proofLabel: {
        position: 'absolute',
        left: 7,
        bottom: 7,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: radii.pill,
        backgroundColor: 'rgba(15,23,42,0.78)',
    },
    proofLabelText: {
        ...typography.overline,
        color: colors.surface,
        fontSize: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
    },
    footerLabel: {
        ...typography.overline,
        color: colors.textMuted,
        marginBottom: 3,
    },
    payment: {
        ...typography.h3,
        color: colors.secondaryDark,
    },
    distancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: colors.backgroundAccent,
    },
    distance: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    heroMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    heroMetaText: {
        ...typography.bodySmall,
        color: colors.textOnDarkMuted,
        fontWeight: '700',
    },
});
