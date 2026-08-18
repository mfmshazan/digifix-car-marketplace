import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { performanceAPI } from '../services/api';
import { colors, radii, shadows, spacing, typography } from '../styles/theme';

const PERIODS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
];

const METRICS = [
    { key: 'totalDeliveries', label: 'Deliveries', icon: 'cube-outline', color: '#2563EB' },
    { key: 'averageRating', label: 'Average rating', icon: 'star-outline', color: '#F59E0B', format: 'rating' },
    { key: 'acceptanceRate', label: 'Acceptance', icon: 'checkmark-done-outline', color: '#8B5CF6', format: 'percent' },
    { key: 'completionRate', label: 'Completion', icon: 'shield-checkmark-outline', color: '#10B981', format: 'percent' },
    { key: 'onlineHours', label: 'Online hours', icon: 'time-outline', color: '#0EA5E9', format: 'hours' },
    { key: 'totalEarnings', label: 'Earnings', icon: 'wallet-outline', color: '#059669', format: 'currency' },
];

const number = (value, digits = 0) =>
    Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });

const formatMetric = (value, format) => {
    if (format === 'rating') return `${number(value, 1)} / 5`;
    if (format === 'percent') return `${Math.round(Number(value || 0))}%`;
    if (format === 'hours') return `${number(value, 1)}h`;
    if (format === 'currency') return `Rs. ${number(value, 2)}`;
    return number(value);
};

const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

const Stars = ({ rating, size = 16 }) => (
    <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
                key={star}
                name={star <= Math.round(Number(rating || 0)) ? 'star' : 'star-outline'}
                size={size}
                color="#F59E0B"
            />
        ))}
    </View>
);

const Card = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
);

const MetricCard = ({ metric, value }) => (
    <Card style={styles.metricCard}>
        <View style={[styles.metricAccent, { backgroundColor: metric.color }]} />
        <View style={[styles.metricIcon, { backgroundColor: `${metric.color}18` }]}>
            <Ionicons name={metric.icon} size={20} color={metric.color} />
        </View>
        <Text style={styles.metricValue} numberOfLines={1}>
            {formatMetric(value, metric.format)}
        </Text>
        <Text style={styles.metricLabel}>{metric.label}</Text>
    </Card>
);

const FeedbackPill = ({ label, count, negative = false }) => (
    <View style={[styles.feedbackPill, negative && styles.feedbackPillNegative]}>
        <Text style={[styles.feedbackText, negative && styles.feedbackTextNegative]}>
            {label} × {count}
        </Text>
    </View>
);

const TrendChart = ({ data }) => {
    const [width, setWidth] = useState(0);
    const height = 150;
    const horizontalPadding = 14;
    const plotHeight = 108;
    const plotTop = 14;
    const usableWidth = Math.max(0, width - horizontalPadding * 2);
    const step = data.length > 1 ? usableWidth / (data.length - 1) : 0;

    const normalize = (key) =>
        data.map((point, index) => ({
            x: horizontalPadding + index * step,
            y: plotTop + ((100 - Number(point[key] || 0)) / 100) * plotHeight,
        }));

    const series = [
        { key: 'acceptance', color: colors.secondary, points: normalize('acceptanceRate') },
        { key: 'completion', color: colors.success, points: normalize('completionRate') },
    ];

    return (
        <View>
            <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.secondary }]} />
                    <Text style={styles.legendText}>Acceptance</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                    <Text style={styles.legendText}>Completion</Text>
                </View>
            </View>

            <View
                style={[styles.chart, { height }]}
                onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            >
                {[0, 50, 100].map((value) => (
                    <View
                        key={value}
                        style={[
                            styles.gridLine,
                            { top: plotTop + ((100 - value) / 100) * plotHeight },
                        ]}
                    >
                        <Text style={styles.gridLabel}>{value}%</Text>
                    </View>
                ))}

                {width > 0 &&
                    series.flatMap((item) =>
                        item.points.slice(0, -1).map((point, index) => {
                            const next = item.points[index + 1];
                            const deltaX = next.x - point.x;
                            const deltaY = next.y - point.y;
                            const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
                            const angle = Math.atan2(deltaY, deltaX);
                            const centerX = (point.x + next.x) / 2;
                            const centerY = (point.y + next.y) / 2;

                            return (
                                <View
                                    key={`${item.key}-line-${index}`}
                                    style={[
                                        styles.chartLine,
                                        {
                                            width: length,
                                            left: centerX - length / 2,
                                            top: centerY - 1.5,
                                            backgroundColor: item.color,
                                            transform: [{ rotateZ: `${angle}rad` }],
                                        },
                                    ]}
                                />
                            );
                        })
                    )}

                {width > 0 &&
                    series.flatMap((item) =>
                        item.points.map((point, index) => (
                            <View
                                key={`${item.key}-point-${index}`}
                                style={[
                                    styles.chartPoint,
                                    {
                                        left: point.x - 5,
                                        top: point.y - 5,
                                        borderColor: item.color,
                                    },
                                ]}
                            />
                        ))
                    )}
            </View>

            <View style={styles.chartDates}>
                {data.map((point) => (
                    <Text key={point.date} style={styles.chartDate}>
                        {new Date(point.date)
                            .toLocaleDateString('en-US', { weekday: 'short' })
                            .slice(0, 2)}
                    </Text>
                ))}
            </View>
        </View>
    );
};

const ReviewCard = ({ review, expanded, onToggle, onFlag, flagging }) => {
    const hasLongComment = review.comment?.length > 100;
    const visibleComment =
        expanded || !hasLongComment
            ? review.comment
            : `${review.comment.slice(0, 100).trim()}...`;

    return (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View>
                    <Stars rating={review.rating} />
                    <Text style={styles.customerName}>{review.customerName}</Text>
                </View>
                <TouchableOpacity
                    style={styles.flagButton}
                    onPress={() => onFlag(review)}
                    disabled={flagging}
                    accessibilityRole="button"
                    accessibilityLabel="Flag this review"
                >
                    {flagging ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                        <Ionicons name="flag-outline" size={18} color={colors.danger} />
                    )}
                </TouchableOpacity>
            </View>

            {visibleComment ? (
                <Text style={styles.reviewComment}>{visibleComment}</Text>
            ) : (
                <Text style={styles.noComment}>No written comment</Text>
            )}

            {hasLongComment ? (
                <TouchableOpacity onPress={onToggle}>
                    <Text style={styles.readMore}>{expanded ? 'Show less' : 'Read more'}</Text>
                </TouchableOpacity>
            ) : null}

            {review.tags?.length ? (
                <View style={styles.reviewTags}>
                    {review.tags.map((tag) => (
                        <View key={tag} style={styles.reviewTag}>
                            <Text style={styles.reviewTagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
        </View>
    );
};

export default function PerformanceDashboardScreen() {
    const [period, setPeriod] = useState('week');
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [expandedReviews, setExpandedReviews] = useState({});
    const [flaggingId, setFlaggingId] = useState(null);

    const loadDashboard = useCallback(
        async (requestedPeriod, refresh = false) => {
            refresh ? setRefreshing(true) : setLoading(true);
            setError('');

            try {
                const response = await performanceAPI.getDashboard(requestedPeriod);
                setDashboard(response?.data?.data || null);
            } catch (requestError) {
                setError(
                    requestError?.response?.data?.message ||
                    requestError?.message ||
                    'Performance dashboard is unavailable.'
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        []
    );

    useFocusEffect(
        useCallback(() => {
            void loadDashboard(period);
        }, [loadDashboard, period])
    );

    const selectPeriod = (nextPeriod) => {
        if (nextPeriod === period) return;
        setPeriod(nextPeriod);
    };

    const flagReview = (review) => {
        Alert.alert(
            'Flag this review?',
            'This review will be sent to an administrator for moderation.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Flag Review',
                    style: 'destructive',
                    onPress: async () => {
                        setFlaggingId(review.id);
                        try {
                            await performanceAPI.flagReview(review.id);
                            await loadDashboard(period, true);
                            Alert.alert('Review reported', 'An administrator will review it.');
                        } catch (requestError) {
                            Alert.alert(
                                'Unable to flag review',
                                requestError?.response?.data?.message ||
                                requestError?.message ||
                                'Please try again.'
                            );
                        } finally {
                            setFlaggingId(null);
                        }
                    },
                },
            ]
        );
    };

    const maximumRatingCount = useMemo(
        () =>
            Math.max(
                1,
                ...(dashboard?.ratings?.breakdown || []).map((item) => Number(item.count))
            ),
        [dashboard?.ratings?.breakdown]
    );

    if (loading && !dashboard) {
        return (
            <SafeAreaView style={styles.centered}>
                <View style={styles.loadingIcon}>
                    <Ionicons name="analytics" size={30} color={colors.secondary} />
                </View>
                <ActivityIndicator size="large" color={colors.secondary} />
                <Text style={styles.loadingTitle}>Building your performance summary</Text>
                <Text style={styles.loadingBody}>
                    Reviewing deliveries, offers, earnings and customer feedback.
                </Text>
            </SafeAreaView>
        );
    }

    if (error && !dashboard) {
        return (
            <SafeAreaView style={styles.centered}>
                <View style={styles.errorIcon}>
                    <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
                </View>
                <Text style={styles.loadingTitle}>Performance unavailable</Text>
                <Text style={styles.loadingBody}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => loadDashboard(period)}
                >
                    <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const overview = dashboard?.overview || {};
    const ratings = dashboard?.ratings || {};

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadDashboard(period, true)}
                        tintColor={colors.secondary}
                    />
                }
            >
                <View style={styles.hero}>
                    <View style={styles.heroTitleRow}>
                        <View>
                            <Text style={styles.eyebrow}>Rider insights</Text>
                            <Text style={styles.pageTitle}>Performance</Text>
                        </View>
                        <View style={styles.heroIcon}>
                            <Ionicons name="analytics" size={25} color={colors.surface} />
                        </View>
                    </View>
                    <Text style={styles.pageSubtitle}>
                        Track reliability, customer satisfaction and earnings in one place.
                    </Text>

                    <View style={styles.periodSelector}>
                        {PERIODS.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={[
                                    styles.periodButton,
                                    period === item.key && styles.periodButtonActive,
                                ]}
                                onPress={() => selectPeriod(item.key)}
                            >
                                <Text
                                    style={[
                                        styles.periodText,
                                        period === item.key && styles.periodTextActive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.metricGrid}>
                    {METRICS.map((metric) => (
                        <MetricCard
                            key={metric.key}
                            metric={metric}
                            value={overview[metric.key]}
                        />
                    ))}
                </View>

                <Card style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionEyebrow}>Customer feedback</Text>
                            <Text style={styles.sectionTitle}>Rating Breakdown</Text>
                        </View>
                        <View style={styles.overallRating}>
                            <Text style={styles.overallRatingValue}>
                                {number(ratings.overallAverage, 1)}
                            </Text>
                            <Ionicons name="star" size={25} color="#F59E0B" />
                        </View>
                    </View>
                    <Text style={styles.sectionMeta}>
                        {ratings.totalReviews || 0} published ratings
                    </Text>

                    <View style={styles.ratingBars}>
                        {(ratings.breakdown || []).map((item) => (
                            <View key={item.stars} style={styles.ratingRow}>
                                <Text style={styles.ratingLabel}>{item.stars}</Text>
                                <Ionicons name="star" size={13} color="#F59E0B" />
                                <View style={styles.ratingTrack}>
                                    <View
                                        style={[
                                            styles.ratingFill,
                                            {
                                                width: `${(item.count / maximumRatingCount) * 100}%`,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.ratingCount}>{item.count}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.feedbackHeading}>What customers appreciate</Text>
                    <View style={styles.feedbackWrap}>
                        {(ratings.positiveTags || []).length ? (
                            ratings.positiveTags.map((tag) => (
                                <FeedbackPill key={tag.label} {...tag} />
                            ))
                        ) : (
                            <Text style={styles.emptyText}>
                                Positive feedback tags will appear here.
                            </Text>
                        )}
                    </View>

                    <Text style={styles.feedbackHeading}>Areas to improve</Text>
                    <View style={styles.feedbackWrap}>
                        {(ratings.negativeTags || []).length ? (
                            ratings.negativeTags.map((tag) => (
                                <FeedbackPill key={tag.label} {...tag} negative />
                            ))
                        ) : (
                            <Text style={styles.emptyText}>
                                No recurring negative feedback.
                            </Text>
                        )}
                    </View>
                </Card>

                <Card style={styles.sectionCard}>
                    <Text style={styles.sectionEyebrow}>Past 7 days</Text>
                    <Text style={styles.sectionTitle}>Acceptance & Completion</Text>
                    <Text style={styles.sectionDescription}>
                        Daily reliability across rider requests and accepted deliveries.
                    </Text>
                    <TrendChart data={dashboard?.trend || []} />
                </Card>

                <Card style={styles.sectionCard}>
                    <Text style={styles.sectionEyebrow}>Latest feedback</Text>
                    <Text style={styles.sectionTitle}>Recent Ratings</Text>
                    <Text style={styles.sectionDescription}>
                        Your ten most recent published customer ratings.
                    </Text>

                    {(ratings.recent || []).length ? (
                        ratings.recent.map((review) => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                                expanded={Boolean(expandedReviews[review.id])}
                                onToggle={() =>
                                    setExpandedReviews((current) => ({
                                        ...current,
                                        [review.id]: !current[review.id],
                                    }))
                                }
                                onFlag={flagReview}
                                flagging={flaggingId === review.id}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyReviews}>
                            <View style={styles.emptyReviewsIcon}>
                                <Ionicons
                                    name="chatbubble-ellipses-outline"
                                    size={28}
                                    color={colors.textMuted}
                                />
                            </View>
                            <Text style={styles.emptyTitle}>No rider ratings yet</Text>
                            <Text style={styles.emptyTextCentered}>
                                Customer feedback will appear after completed deliveries are reviewed.
                            </Text>
                        </View>
                    )}
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.primary },
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 120 },
    hero: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: 28,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    heroTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    eyebrow: {
        ...typography.caption,
        color: '#93C5FD',
        textTransform: 'uppercase',
    },
    pageTitle: {
        ...typography.h1,
        color: colors.surface,
        marginTop: 3,
    },
    pageSubtitle: {
        ...typography.bodySmall,
        color: '#CBD5E1',
        marginTop: spacing.sm,
        maxWidth: 320,
    },
    heroIcon: {
        width: 50,
        height: 50,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.28)',
        borderWidth: 1,
        borderColor: 'rgba(147, 197, 253, 0.35)',
    },
    periodSelector: {
        flexDirection: 'row',
        padding: 4,
        marginTop: spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: radii.md,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    periodButtonActive: { backgroundColor: colors.surface },
    periodText: { ...typography.bodySmall, color: '#CBD5E1', fontWeight: '700' },
    periodTextActive: { color: colors.primary },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        marginTop: -14,
        marginBottom: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        ...shadows.small,
    },
    metricCard: {
        position: 'relative',
        overflow: 'hidden',
        width: '48.5%',
        minHeight: 132,
        padding: spacing.md,
    },
    metricAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
    },
    metricIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    metricValue: { ...typography.h2, fontSize: 20 },
    metricLabel: { ...typography.bodySmall, fontWeight: '700', marginTop: 3 },
    sectionCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    sectionEyebrow: {
        ...typography.caption,
        color: colors.secondary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    sectionTitle: { ...typography.h2 },
    sectionMeta: { ...typography.bodySmall, marginTop: 4 },
    sectionDescription: {
        ...typography.bodySmall,
        marginTop: 4,
        marginBottom: spacing.sm,
    },
    overallRating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    overallRatingValue: { ...typography.hero, fontSize: 34 },
    ratingBars: { gap: 11, marginVertical: spacing.lg },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ratingLabel: {
        width: 10,
        ...typography.bodySmall,
        fontWeight: '800',
        color: colors.text,
    },
    ratingTrack: {
        flex: 1,
        height: 9,
        marginLeft: 4,
        borderRadius: radii.pill,
        backgroundColor: colors.border,
        overflow: 'hidden',
    },
    ratingFill: {
        height: '100%',
        borderRadius: radii.pill,
        backgroundColor: '#F59E0B',
    },
    ratingCount: {
        width: 28,
        textAlign: 'right',
        ...typography.bodySmall,
        fontWeight: '800',
    },
    feedbackHeading: {
        ...typography.bodySmall,
        color: colors.text,
        fontWeight: '800',
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    feedbackWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    feedbackPill: {
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: colors.successSoft,
    },
    feedbackPillNegative: { backgroundColor: colors.dangerSoft },
    feedbackText: { ...typography.caption, color: '#047857' },
    feedbackTextNegative: { color: '#B91C1C' },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { ...typography.caption, color: colors.textSecondary },
    chart: { marginTop: spacing.sm, overflow: 'hidden' },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.border,
    },
    gridLabel: {
        ...typography.caption,
        position: 'absolute',
        top: -15,
        right: 0,
        fontSize: 10,
    },
    chartLine: {
        position: 'absolute',
        height: 3,
        borderRadius: radii.pill,
    },
    chartPoint: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.surface,
        borderWidth: 3,
    },
    chartDates: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        marginTop: -5,
    },
    chartDate: { ...typography.caption, fontSize: 10 },
    reviewCard: {
        padding: spacing.md,
        borderRadius: radii.sm,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        marginTop: spacing.sm,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    stars: { flexDirection: 'row', gap: 2 },
    customerName: {
        ...typography.bodySmall,
        color: colors.text,
        fontWeight: '800',
        marginTop: 5,
    },
    flagButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.dangerSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewComment: { ...typography.body, marginTop: spacing.sm },
    noComment: {
        ...typography.bodySmall,
        color: colors.textMuted,
        fontStyle: 'italic',
        marginTop: spacing.sm,
    },
    readMore: {
        ...typography.bodySmall,
        color: colors.secondary,
        fontWeight: '800',
        marginTop: 4,
    },
    reviewTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: spacing.sm,
    },
    reviewTag: {
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: radii.pill,
        backgroundColor: colors.secondarySoft,
    },
    reviewTagText: { ...typography.caption, color: '#1D4ED8' },
    reviewDate: { ...typography.caption, marginTop: spacing.sm },
    emptyReviews: { alignItems: 'center', paddingVertical: spacing.xl },
    emptyReviewsIcon: {
        width: 54,
        height: 54,
        borderRadius: 18,
        backgroundColor: colors.backgroundAccent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    emptyTitle: { ...typography.h3 },
    emptyText: { ...typography.bodySmall },
    emptyTextCentered: {
        ...typography.bodySmall,
        textAlign: 'center',
        marginTop: 4,
        maxWidth: 280,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        backgroundColor: colors.background,
    },
    loadingIcon: {
        width: 58,
        height: 58,
        borderRadius: 20,
        backgroundColor: colors.secondarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    errorIcon: {
        width: 58,
        height: 58,
        borderRadius: 20,
        backgroundColor: colors.dangerSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    loadingTitle: { ...typography.h3, marginTop: spacing.md, textAlign: 'center' },
    loadingBody: {
        ...typography.bodySmall,
        marginTop: spacing.xs,
        textAlign: 'center',
        maxWidth: 320,
    },
    retryButton: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        borderRadius: radii.md,
        backgroundColor: colors.primary,
    },
    retryText: { color: colors.surface, fontWeight: '800' },
});
