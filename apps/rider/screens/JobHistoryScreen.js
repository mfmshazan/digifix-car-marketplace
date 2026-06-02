import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    Image,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { jobsAPI } from '../services/api';
import { SurfaceCard, StatusBadge, SectionHeader, EmptyState } from '../components/Common';
import { colors, spacing, typography } from '../styles/theme';

const toneForStatus = (status) => (status === 'delivered' ? 'success' : 'warning');
const formatHistoryStatus = (status) =>
    status === 'delivered'
        ? 'COMPLETED'
        : status.replace(/_/g, ' ').toUpperCase();

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
                        <Text style={styles.orderNumber}>{item.order_number}</Text>
                        <Text style={styles.date}>
                            {deliveredAt
                                ? new Date(deliveredAt).toLocaleString()
                                : 'Completion time unavailable'}
                        </Text>
                    </View>
                    <StatusBadge
                        label={formatHistoryStatus(item.status)}
                        tone={toneForStatus(item.status)}
                    />
                </View>

                <Text style={styles.addressLabel}>Pickup</Text>
                <Text style={styles.address}>{item.pickup_address}</Text>
                <Text style={[styles.addressLabel, styles.addressGap]}>Dropoff</Text>
                <Text style={styles.address}>{item.dropoff_address}</Text>

                <View style={styles.archiveBlock}>
                    <Text style={styles.archiveTitle}>Completion Archive</Text>
                    <Text style={styles.archiveMeta}>
                        Delivered: {deliveredAt ? new Date(deliveredAt).toLocaleString() : 'Unavailable'}
                    </Text>
                    <Text style={styles.archiveMeta}>
                        Proof: {hasProofArchive ? 'Archived' : 'Not available'}
                    </Text>
                    {item.recipient_name ? (
                        <Text style={styles.archiveMeta}>Recipient: {item.recipient_name}</Text>
                    ) : null}
                    {item.notes ? (
                        <Text style={styles.archiveNotes}>{item.notes}</Text>
                    ) : null}

                    {hasProofArchive ? (
                        <View style={styles.proofPreviewRow}>
                            {item.photo_url ? (
                                <Image
                                    source={{ uri: item.photo_url }}
                                    style={styles.photoPreview}
                                />
                            ) : null}
                            {item.signature_data ? (
                                <Image
                                    source={{ uri: item.signature_data }}
                                    style={styles.signaturePreview}
                                    resizeMode="contain"
                                />
                            ) : null}
                        </View>
                    ) : null}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.payment}>${Number(item.payment_amount || 0).toFixed(2)}</Text>
                    <Text style={styles.distance}>
                        {item.distance_km ? `${Number(item.distance_km).toFixed(1)} km` : 'Completed'}
                    </Text>
                </View>
            </SurfaceCard>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SectionHeader
                    eyebrow="Archive"
                    title="Delivery History"
                    subtitle="Review previous completed and closed routes."
                />
            </View>

            <FlatList
                data={jobs}
                renderItem={renderJob}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
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
        padding: spacing.lg,
    },
    jobCard: {
        marginBottom: spacing.md,
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
    orderNumber: {
        ...typography.h3,
        marginBottom: spacing.xs,
    },
    date: {
        ...typography.bodySmall,
    },
    addressLabel: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    addressGap: {
        marginTop: spacing.sm,
    },
    address: {
        ...typography.body,
    },
    archiveBlock: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    archiveTitle: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    archiveMeta: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    archiveNotes: {
        ...typography.bodySmall,
        color: colors.text,
        marginTop: spacing.xs,
    },
    proofPreviewRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    photoPreview: {
        flex: 1,
        height: 96,
        borderRadius: 14,
        backgroundColor: colors.surfaceMuted,
    },
    signaturePreview: {
        flex: 1,
        height: 96,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    payment: {
        ...typography.body,
        color: colors.secondary,
        fontWeight: '800',
    },
    distance: {
        ...typography.bodySmall,
    },
});
