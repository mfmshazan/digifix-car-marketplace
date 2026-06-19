import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import SignatureCanvas from 'react-native-signature-canvas';
import { useDispatch } from 'react-redux';
import { Button, Input, SurfaceCard, SectionHeader, StatusBadge } from '../components/Common';
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
                <Text style={styles.signatureTitle}>Customer Signature</Text>
                <SignatureCanvas
                    onOK={handleSignature}
                    onEmpty={() => Alert.alert('Error', 'Please provide a signature')}
                    descriptionText="Sign here"
                    clearText="Clear"
                    confirmText="Save"
                    webStyle={`.m-signature-pad {box-shadow: none; border: 1px solid #d7dfec;}`}
                />
                <Button title="Cancel" onPress={() => setShowSignaturePad(false)} variant="outline" style={styles.signatureCancel} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <SectionHeader
                eyebrow="Closeout"
                title="Proof of Delivery"
                subtitle="Archive the final handoff so the order can move from active delivery to history."
                right={<StatusBadge label={`Job #${jobId}`} tone="info" />}
            />

            <SurfaceCard style={styles.sectionCard}>
                <Text style={styles.cardTitle}>Delivery Photo</Text>
                {photoUri ? (
                    <>
                        <Image source={{ uri: photoUri }} style={styles.photo} />
                        <Button title="Retake Photo" onPress={handleTakePhoto} variant="outline" />
                    </>
                ) : (
                    <Button title="Take Photo" onPress={handleTakePhoto} />
                )}
            </SurfaceCard>

            <SurfaceCard style={styles.sectionCard}>
                <Text style={styles.cardTitle}>Customer Signature</Text>
                {signature ? (
                    <>
                        <Image source={{ uri: signature }} style={styles.signaturePreview} resizeMode="contain" />
                        <Button title="Retake Signature" onPress={() => setShowSignaturePad(true)} variant="outline" />
                    </>
                ) : (
                    <Button title="Capture Signature" onPress={() => setShowSignaturePad(true)} />
                )}
            </SurfaceCard>

            <SurfaceCard style={styles.sectionCard}>
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

            <Button title="Complete Delivery" onPress={handleSubmit} loading={loading} />
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
        paddingBottom: spacing.xl,
    },
    sectionCard: {
        marginBottom: spacing.md,
    },
    cardTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
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
    signatureTitle: {
        ...typography.h2,
        marginBottom: spacing.md,
    },
    signatureCancel: {
        marginTop: spacing.lg,
    },
});
