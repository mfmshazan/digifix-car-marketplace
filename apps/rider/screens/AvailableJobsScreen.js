import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Button, SurfaceCard, EmptyState, StatusBadge, SectionHeader } from '../components/Common';
import { jobsAPI } from '../services/api';
import { selectIsOnline, selectIsSyncing } from '../store/slices/availabilitySlice';
import { colors, spacing, typography } from '../styles/theme';

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function AvailableJobsScreen({ navigation }) {
    const isOnline = useSelector(selectIsOnline);
    const isSyncingAvailability = useSelector(selectIsSyncing);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        try {
            const response = await jobsAPI.getAvailable();
            setJobs(response.data.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load jobs');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAcceptJob = async (jobId) => {
        if (!isOnline || isSyncingAvailability) {
            Alert.alert(
                'Unavailable',
                isSyncingAvailability
                    ? 'Please wait for your availability status to finish syncing.'
                    : 'Go online before accepting a job.'
            );
            return;
        }

        try {
            await jobsAPI.acceptJob(jobId);
            Alert.alert('Success', 'Job accepted. Your dashboard will update next.', [
                { text: 'OK', onPress: () => navigation.navigate('Home') },
            ]);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept job');
        }
    };

    const renderJob = ({ item }) => (
        <SurfaceCard style={styles.jobCard}>
            <View style={styles.jobHeader}>
                <View style={styles.jobHeaderCopy}>
                    <Text style={styles.orderNumber}>{item.order_number}</Text>
                    <Text style={styles.customer}>{item.customer_name || 'Delivery order'}</Text>
                </View>
                <StatusBadge label="Open" tone="success" />
            </View>

            <Text style={styles.label}>Pickup</Text>
            <Text style={styles.address}>{item.pickup_address}</Text>
            <Text style={[styles.label, styles.spacedLabel]}>Dropoff</Text>
            <Text style={styles.address}>{item.dropoff_address}</Text>

            <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                    {item.distance_km ? `${Number(item.distance_km).toFixed(1)} km` : 'Ready route'}
                </Text>
                <Text style={styles.payment}>{formatCurrency(item.payment_amount)}</Text>
            </View>

            {item.items_description ? (
                <Text style={styles.items}>Items: {item.items_description}</Text>
            ) : null}

            <Button
                title="Accept Job"
                onPress={() => handleAcceptJob(item.id)}
                disabled={!isOnline || isSyncingAvailability}
                style={styles.acceptButton}
            />
        </SurfaceCard>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SectionHeader
                    eyebrow="Dispatch"
                    title="Available Jobs"
                    subtitle="Fresh opportunities ready for acceptance."
                />
            </View>

            {!isOnline && (
                <SurfaceCard style={styles.banner}>
                    <Text style={styles.bannerText}>
                        You are offline. Turn availability on to start accepting work.
                    </Text>
                </SurfaceCard>
            )}

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
                            loadJobs();
                        }}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        title={loading ? 'Loading jobs...' : 'No available jobs'}
                        body={
                            loading
                                ? 'We are checking the latest open jobs for your area.'
                                : 'There are no open jobs at the moment. Pull to refresh and check again soon.'
                        }
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
    banner: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.sm,
        backgroundColor: colors.warningSoft,
    },
    bannerText: {
        ...typography.bodySmall,
        color: colors.warning,
        fontWeight: '700',
    },
    listContent: {
        padding: spacing.lg,
        gap: spacing.md,
    },
    jobCard: {
        marginBottom: spacing.md,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    jobHeaderCopy: {
        flex: 1,
    },
    orderNumber: {
        ...typography.h3,
        marginBottom: spacing.xs,
    },
    customer: {
        ...typography.bodySmall,
        color: colors.text,
    },
    label: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    spacedLabel: {
        marginTop: spacing.sm,
    },
    address: {
        ...typography.body,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    metaText: {
        ...typography.bodySmall,
    },
    payment: {
        ...typography.bodySmall,
        color: colors.secondary,
        fontWeight: '800',
    },
    items: {
        ...typography.bodySmall,
        marginTop: spacing.sm,
    },
    acceptButton: {
        marginTop: spacing.md,
    },
});


