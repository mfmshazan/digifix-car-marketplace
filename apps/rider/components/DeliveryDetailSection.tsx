import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SurfaceCard } from './Common';
import { colors, radii, spacing, typography } from '../styles/theme';

type DeliveryDetailSectionProps = {
    title: string;
    children: React.ReactNode;
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    iconColor?: string;
};

export default function DeliveryDetailSection({
    title,
    children,
    icon = 'information-circle-outline',
    iconColor = colors.secondary,
}: DeliveryDetailSectionProps) {
    return (
        <SurfaceCard style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconWrap}>
                    <Ionicons name={icon} size={19} color={iconColor} />
                </View>
                <Text style={styles.title}>{title}</Text>
            </View>
            <View style={styles.content}>{children}</View>
        </SurfaceCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: spacing.md,
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: radii.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.backgroundAccent,
    },
    title: {
        ...typography.h3,
    },
    content: {
        gap: spacing.xs,
    },
});
