import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SignatureCanvas from 'react-native-signature-canvas';
import { useDispatch } from 'react-redux';
import { Button, Input, ScreenHero, SurfaceCard, StatusBadge } from '../components/Common';
import { jobsAPI } from '../services/api';
import { getCurrentLocation } from '../services/location';
import { fetchAssignedDeliveries } from '../store/slices/assignedDeliveriesSlice';
import { fetchDriverHome } from '../store/slices/homeSlice';
import { colors, spacing, typography } from '../styles/theme';

export default function ProofOfDeliveryScreen({ route, navigation }) {
    const dispatch = useDispatch();
    const { jobId } = route.params;
    const [photoUri, setPhotoUri] = useState(null);
    const [signature, setSignature] = useState(null);
    const [recipientName, setRecipientName] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleSignature = (sig) => {
        setSignature(sig);
        setShowSignaturePad(false);
    };

    const handleSubmit = async () => {
        if (!photoUri && !signature) {
            Alert.alert('Required', 'Please capture a photo or signature');
            return;
        }

        setLoading(true);
        try {
            const location = await getCurrentLocation();

            const proofData = {
                photoUri,
                signatureData: signature,
                recipientName,
                notes,
                latitude: location.latitude,
                longitude: location.longitude,
            };

            await jobsAPI.submitProof(jobId, proofData);
            await Promise.all([
                dispatch(fetchDriverHome()),
                dispatch(fetchAssignedDeliveries()),
            ]);

            Alert.alert('Success', 'Delivery completed and archived.', [
                {
                    text: 'OK',
                    onPress: () =>
                        navigation.reset({
                            index: 0,
                            routes: [
                                {
                                    name: 'MainTabs',
                                    params: {
                                        screen: 'Home',
                                    },
                                },
                            ],
                        }),
                },
            ]);
        } catch (error) {
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit proof of delivery';
            Alert.alert('Error', errorMessage);
            console.error('Proof submission error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (showSignaturePad) {
        return (
            <View style={styles.signatureContainer}>
                <View style={styles.signatureHeader}>
                    <View style={styles.signatureHeaderIcon}>
                        <Ionicons name="create-outline" size={22} color={colors.secondary} />
                    </View>
                    <View>
                        <Text style={styles.signatureTitle}>Customer Signature</Text>
                        <Text style={styles.signatureSubtitle}>Ask the recipient to sign inside the box.</Text>
                    </View>
                </View>
                <SignatureCanvas
                    onOK={handleSignature}
                    onEmpty={() => Alert.alert('Error', 'Please provide a signature')}
                    descriptionText="Sign here"
                    clearText="Clear"
                    confirmText="Save"
                    webStyle={`.m-signature-pad {box-shadow: none; border: 1px solid #d7dfec;}`}
                />
                <Button title="Cancel" icon="close-outline" onPress={() => setShowSignaturePad(false)} variant="outline" style={styles.signatureCancel} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ScreenHero
                eyebrow="Delivery closeout"
                title="Proof of Delivery"
                subtitle="Capture verifiable handoff evidence before marking this delivery complete."
                icon="shield-checkmark-outline"
                right={<StatusBadge label={`Job #${jobId}`} tone="info" />}
            >
                <View style={styles.heroHint}>
                    <Ionicons name="information-circle-outline" size={17} color="#BFDBFE" />
                    <Text style={styles.heroHintText}>A photo or customer signature is required.</Text>
                </View>
            </ScreenHero>

            <SurfaceCard style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardIcon}>
                        <Ionicons name="camera-outline" size={21} color={colors.secondary} />
                    </View>
                    <View style={styles.cardHeaderCopy}>
                        <Text style={styles.cardTitle}>Delivery Photo</Text>
                        <Text style={styles.cardSubtitle}>Capture the package at the handoff location.</Text>
                    </View>
                    {photoUri ? (
                        <View style={styles.completeBadge}>
                            <Ionicons name="checkmark" size={14} color={colors.successDark} />
                        </View>
                    ) : null}
                </View>
                {photoUri ? (
                    <>
                        <Image source={{ uri: photoUri }} style={styles.photo} />
                        <Button title="Retake Photo" icon="refresh-outline" onPress={handleTakePhoto} variant="outline" />
                    </>
                ) : (
                    <Button title="Open Camera" icon="camera-outline" onPress={handleTakePhoto} />
                )}
            </SurfaceCard>

            <SurfaceCard style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, styles.signatureCardIcon]}>
                        <Ionicons name="create-outline" size={21} color={colors.accent} />
                    </View>
                    <View style={styles.cardHeaderCopy}>
                        <Text style={styles.cardTitle}>Customer Signature</Text>
                        <Text style={styles.cardSubtitle}>Collect a signature directly from the recipient.</Text>
                    </View>
                    {signature ? (
                        <View style={styles.completeBadge}>
                            <Ionicons name="checkmark" size={14} color={colors.successDark} />
                        </View>
                    ) : null}
                </View>
                {signature ? (
                    <>
                        <Image source={{ uri: signature }} style={styles.signaturePreview} resizeMode="contain" />
                        <Button title="Retake Signature" icon="refresh-outline" onPress={() => setShowSignaturePad(true)} variant="outline" />
                    </>
                ) : (
                    <Button title="Capture Signature" icon="create-outline" onPress={() => setShowSignaturePad(true)} />
                )}
            </SurfaceCard>

            <SurfaceCard style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, styles.recipientCardIcon]}>
                        <Ionicons name="person-outline" size={21} color={colors.successDark} />
                    </View>
                    <View style={styles.cardHeaderCopy}>
                        <Text style={styles.cardTitle}>Recipient Details</Text>
                        <Text style={styles.cardSubtitle}>Record who accepted the package and any notes.</Text>
                    </View>
                </View>
                <Input
                    label="Recipient Name"
                    placeholder="Who received the delivery?"
                    value={recipientName}
                    onChangeText={setRecipientName}
                />
                <Input
                    label="Notes"
                    placeholder="Any additional delivery notes"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                    style={styles.notesField}
                />
            </SurfaceCard>

            <Button
                title="Complete & Archive Delivery"
                icon="checkmark-done-outline"
                onPress={handleSubmit}
                loading={loading}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    sectionCard: {
        marginBottom: spacing.md,
        padding: spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    cardHeaderCopy: {
        flex: 1,
    },
    cardIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondarySoft,
    },
    signatureCardIcon: {
        backgroundColor: colors.accentSoft,
    },
    recipientCardIcon: {
        backgroundColor: colors.successSoft,
    },
    cardTitle: {
        ...typography.h3,
    },
    cardSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    completeBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.successSoft,
    },
    photo: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        marginBottom: spacing.md,
    },
    signaturePreview: {
        width: '100%',
        height: 160,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surface,
        marginBottom: spacing.md,
    },
    notesField: {
        marginBottom: 0,
    },
    signatureContainer: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
    },
    signatureHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    signatureHeaderIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondarySoft,
    },
    signatureTitle: {
        ...typography.h2,
    },
    signatureSubtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    signatureCancel: {
        marginTop: spacing.lg,
    },
    heroHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    heroHintText: {
        ...typography.bodySmall,
        color: colors.textOnDarkMuted,
        fontWeight: '700',
    },
});
