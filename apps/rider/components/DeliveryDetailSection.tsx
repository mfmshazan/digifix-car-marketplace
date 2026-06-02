import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from './Common';
import { colors, spacing, typography } from '../styles/theme';

type DeliveryDetailSectionProps = {
    title: string;
    children: React.ReactNode;
};

export default function DeliveryDetailSection({
    title,
    children,
}: DeliveryDetailSectionProps) {
    return (
        <SurfaceCard style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.content}>{children}</View>
        </SurfaceCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h3,
        marginBottom: spacing.sm,
    },
    content: {
        gap: spacing.xs,
    },
});
