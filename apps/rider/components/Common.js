import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { colors, spacing, typography, shadows, radii } from '../styles/theme';

export const Button = ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    style,
    textStyle,
}) => {
    const buttonStyles = [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'outline' && styles.buttonOutline,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        style,
    ];

    const labelStyles = [
        styles.buttonText,
        variant === 'primary' && styles.buttonTextPrimary,
        variant === 'secondary' && styles.buttonTextPrimary,
        variant === 'outline' && styles.buttonTextOutline,
        variant === 'ghost' && styles.buttonTextGhost,
        variant === 'danger' && styles.buttonTextPrimary,
        textStyle,
    ];

    const spinnerColor =
        variant === 'outline' || variant === 'ghost' ? colors.secondary : colors.surface;

    return (
        <TouchableOpacity
            style={buttonStyles}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.86}
        >
            {loading ? <ActivityIndicator color={spinnerColor} /> : <Text style={labelStyles}>{title}</Text>}
        </TouchableOpacity>
    );
};

export const Input = ({
    label,
    placeholder,
    value,
    onChangeText,
    secureTextEntry,
    style,
    error,
    multiline = false,
    numberOfLines,
    ...props
}) => {
    return (
        <View style={[styles.fieldGroup, style]}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <TextInput
                style={[
                    styles.input,
                    multiline && styles.inputMultiline,
                    error && styles.inputError,
                ]}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                placeholderTextColor={colors.textMuted}
                multiline={multiline}
                numberOfLines={numberOfLines}
                {...props}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

export const SurfaceCard = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
);

export const SectionHeader = ({ eyebrow, title, subtitle, right }) => (
    <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
            {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {right}
    </View>
);

export const StatusBadge = ({ label, tone = 'info', style }) => (
    <View
        style={[
            styles.badge,
            tone === 'success' && styles.badgeSuccess,
            tone === 'warning' && styles.badgeWarning,
            tone === 'danger' && styles.badgeDanger,
            tone === 'info' && styles.badgeInfo,
            style,
        ]}
    >
        <Text
            style={[
                styles.badgeText,
                tone === 'success' && styles.badgeTextSuccess,
                tone === 'warning' && styles.badgeTextWarning,
                tone === 'danger' && styles.badgeTextDanger,
                tone === 'info' && styles.badgeTextInfo,
            ]}
        >
            {label}
        </Text>
    </View>
);

export const EmptyState = ({ title, body, action }) => (
    <SurfaceCard style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>{title}</Text>
        {body ? <Text style={styles.emptyStateBody}>{body}</Text> : null}
        {action || null}
    </SurfaceCard>
);

const styles = StyleSheet.create({
    button: {
        minHeight: 54,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.small,
    },
    buttonPrimary: {
        backgroundColor: colors.primary,
    },
    buttonSecondary: {
        backgroundColor: colors.secondary,
    },
    buttonOutline: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderStrong,
    },
    buttonGhost: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonDanger: {
        backgroundColor: colors.danger,
    },
    buttonDisabled: {
        backgroundColor: colors.disabled,
        borderColor: colors.disabled,
        opacity: 0.7,
    },
    buttonText: {
        ...typography.body,
        fontWeight: '700',
    },
    buttonTextPrimary: {
        color: colors.surface,
    },
    buttonTextOutline: {
        color: colors.secondary,
    },
    buttonTextGhost: {
        color: colors.secondary,
    },
    fieldGroup: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        fontWeight: '700',
    },
    input: {
        minHeight: 54,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        ...typography.body,
        backgroundColor: colors.surface,
        color: colors.text,
    },
    inputMultiline: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: colors.danger,
    },
    errorText: {
        ...typography.caption,
        color: colors.danger,
        marginTop: spacing.xs,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing.md,
        ...shadows.medium,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    sectionHeaderCopy: {
        flex: 1,
    },
    sectionEyebrow: {
        ...typography.caption,
        color: colors.textMuted,
        textTransform: 'uppercase',
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    sectionTitle: {
        ...typography.h2,
    },
    sectionSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: radii.pill,
    },
    badgeInfo: {
        backgroundColor: colors.infoSoft,
    },
    badgeSuccess: {
        backgroundColor: colors.successSoft || '#D1FAE5',
    },
    badgeWarning: {
        backgroundColor: colors.warningSoft,
    },
    badgeDanger: {
        backgroundColor: colors.dangerSoft,
    },
    badgeText: {
        ...typography.caption,
        fontWeight: '800',
    },
    badgeTextInfo: {
        color: colors.info,
    },
    badgeTextSuccess: {
        color: colors.success,
    },
    badgeTextWarning: {
        color: colors.warning,
    },
    badgeTextDanger: {
        color: colors.danger,
    },
    emptyState: {
        alignItems: 'flex-start',
    },
    emptyStateTitle: {
        ...typography.h3,
        marginBottom: spacing.xs,
    },
    emptyStateBody: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
});
