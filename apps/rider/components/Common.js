import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    TextInput,
    Modal,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    rightAccessory,
    ...props
}) => {
    return (
        <View style={[styles.fieldGroup, style]}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <View style={styles.inputWrapper}>
                <TextInput
                    style={[
                        styles.input,
                        multiline && styles.inputMultiline,
                        error && styles.inputError,
                        rightAccessory && { paddingRight: 48 }
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
                {rightAccessory && (
                    <View style={styles.rightAccessoryContainer}>
                        {rightAccessory}
                    </View>
                )}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

export const Dropdown = ({
    label,
    placeholder = 'Select an option',
    value,
    onSelect,
    options = [],
    error,
    style,
    disabled = false,
}) => {
    const [modalVisible, setModalVisible] = React.useState(false);

    const handleSelect = (option) => {
        const val = typeof option === 'object' ? option.value : option;
        onSelect(val);
        setModalVisible(false);
    };

    const getDisplayLabel = () => {
        if (!value) return '';
        const found = options.find(opt => {
            if (typeof opt === 'object') {
                return opt.value === value;
            }
            return opt === value;
        });
        if (found) {
            return typeof found === 'object' ? found.label : found;
        }
        return value;
    };

    return (
        <View style={[styles.fieldGroup, style]}>
            {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
            <TouchableOpacity
                style={[
                    styles.input,
                    styles.dropdownTrigger,
                    error && styles.inputError,
                    disabled && styles.inputDisabled,
                ]}
                onPress={() => !disabled && setModalVisible(true)}
                activeOpacity={disabled ? 1 : 0.7}
            >
                <Text
                    style={[
                        styles.dropdownTriggerText,
                        !value && styles.placeholderText,
                        disabled && styles.disabledText,
                    ]}
                    numberOfLines={1}
                >
                    {getDisplayLabel() || placeholder}
                </Text>
                <Ionicons
                    name="chevron-down"
                    size={20}
                    color={disabled ? colors.textMuted : colors.textSecondary}
                    style={styles.dropdownIcon}
                />
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{label || 'Select Option'}</Text>
                                    <TouchableOpacity
                                        onPress={() => setModalVisible(false)}
                                        style={styles.closeButton}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="close" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={options}
                                    keyExtractor={(item, index) => {
                                        const val = typeof item === 'object' ? item.value : item;
                                        return val ? val.toString() : index.toString();
                                    }}
                                    renderItem={({ item }) => {
                                        const itemLabel = typeof item === 'object' ? item.label : item;
                                        const itemValue = typeof item === 'object' ? item.value : item;
                                        const isSelected = itemValue === value;

                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.optionItem,
                                                    isSelected && styles.optionItemSelected,
                                                ]}
                                                onPress={() => handleSelect(item)}
                                                activeOpacity={0.7}
                                            >
                                                <Text
                                                    style={[
                                                        styles.optionText,
                                                        isSelected && styles.optionTextSelected,
                                                    ]}
                                                >
                                                    {itemLabel}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons
                                                        name="checkmark"
                                                        size={20}
                                                        color={colors.secondary}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    }}
                                    contentContainerStyle={styles.optionsList}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    inputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    rightAccessoryContainer: {
        position: 'absolute',
        right: spacing.md,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
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
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: spacing.md,
    },
    dropdownTriggerText: {
        ...typography.body,
        color: colors.text,
        flex: 1,
    },
    placeholderText: {
        color: colors.textMuted,
    },
    disabledText: {
        color: colors.textMuted,
    },
    inputDisabled: {
        backgroundColor: colors.backgroundAccent || '#F1F5F9',
        borderColor: colors.border,
    },
    dropdownIcon: {
        marginLeft: spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay || 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: radii.lg,
        borderTopRightRadius: radii.lg,
        paddingTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        maxHeight: '50%',
        ...shadows.large,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.sm,
    },
    modalTitle: {
        ...typography.h3,
    },
    closeButton: {
        padding: spacing.xs,
    },
    optionsList: {
        paddingVertical: spacing.xs,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.sm,
        marginVertical: 2,
    },
    optionItemSelected: {
        backgroundColor: colors.secondarySoft || '#DBEAFE',
    },
    optionText: {
        ...typography.body,
        color: colors.text,
    },
    optionTextSelected: {
        fontWeight: '600',
        color: colors.secondary,
    },
});
