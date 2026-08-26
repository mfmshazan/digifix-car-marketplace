import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Animated, Text, Easing, View, StyleSheet, Platform } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import DeliveryDetailsScreen from './screens/DeliveryDetailsScreen';
import ActiveDeliveryScreen from './screens/ActiveDeliveryScreen';
import AssignedDeliveriesScreen from './screens/AssignedDeliveriesScreen';
import ProofOfDeliveryScreen from './screens/ProofOfDeliveryScreen';
import JobHistoryScreen from './screens/JobHistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import ProfileHubScreen from './screens/ProfileHubScreen';
import PerformanceDashboardScreen from './screens/PerformanceDashboardScreen';
import WalletScreen from './screens/WalletScreen';
import RealtimeDispatchLayer from './components/RealtimeDispatchLayer';

import { getAccessToken, getRefreshToken } from './services/storage';
import { requestLocationPermission, stopLocationTracking } from './services/location';
import { initOneSignal, registerPushForToken } from './services/onesignal';

import { flushPendingNavigation, navigationRef } from './services/navigation';
import { colors, shadows } from './styles/theme';
import store from './store';
import { hydrateAvailability } from './store/slices/availabilitySlice';
import { fetchDriverHome } from './store/slices/homeSlice';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();

// Branded splash loading bar dimensions (track + sweeping segment).
const SPLASH_BAR_TRACK = 180;
const SPLASH_BAR_SEG = 62;

/**
 * Branded loading screen — DIGIFIX RIDER wordmark with an animated horizontal
 * bar sweeping underneath. Shown while auth/session is being restored.
 */
function BrandedLoader() {
    const sweep = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(sweep, {
                toValue: 1,
                duration: 900,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [sweep]);

    const translateX = sweep.interpolate({
        inputRange: [0, 1],
        outputRange: [-SPLASH_BAR_SEG, SPLASH_BAR_TRACK],
    });

    return (
        <View style={styles.splash}>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
            <View style={styles.splashLogoRow}>
                <Ionicons name="cog" size={28} color={colors.secondaryDark} style={{ marginRight: 10 }} />
                <Text style={styles.splashBrand}>DIGIFIX</Text>
            </View>
            <Text style={styles.splashSub}>RIDER</Text>
            <View style={styles.loadingTrack}>
                <Animated.View style={[styles.loadingBar, { transform: [{ translateX }] }]} />
            </View>
            <Text style={styles.splashTagline}>Preparing your deliveries…</Text>
        </View>
    );
}

const navTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        primary: colors.secondary,
        border: colors.border,
    },
};

function ProfileNavigator() {
    return (
        <ProfileStack.Navigator
            screenOptions={{
                headerStyle: styles.headerStyle,
                headerTintColor: colors.text,
                headerTitleStyle: styles.headerTitle,
                headerTitleAlign: 'center',
                headerShadowVisible: false,
                cardStyle: { backgroundColor: colors.background },
            }}
        >
            <ProfileStack.Screen
                name="ProfileMenu"
                component={ProfileHubScreen}
                options={{ headerShown: false }}
            />
            <ProfileStack.Screen
                name="RiderProfile"
                component={ProfileScreen}
                options={{ title: 'Profile' }}
            />
            <ProfileStack.Screen
                name="AssignedDeliveries"
                component={AssignedDeliveriesScreen}
                options={{ title: 'Assigned Deliveries' }}
            />
            <ProfileStack.Screen
                name="JobHistory"
                component={JobHistoryScreen}
                options={{ title: 'Delivery History' }}
            />
        </ProfileStack.Navigator>
    );
}

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: colors.secondary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: styles.tabLabel,
                tabBarItemStyle: styles.tabItem,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Performance') {
                        iconName = focused ? 'analytics' : 'analytics-outline';
                    } else if (route.name === 'Wallet') {
                        iconName = focused ? 'wallet' : 'wallet-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person-circle' : 'person-circle-outline';
                    }
                    return (
                        <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
                            <Ionicons name={iconName} size={21} color={color} />
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="Performance"
                component={PerformanceDashboardScreen}
                options={{ tabBarLabel: 'Performance' }}
            />
            <Tab.Screen
                name="Wallet"
                component={WalletScreen}
                options={{ tabBarLabel: 'Wallet' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileNavigator}
                options={{ tabBarLabel: 'Profile' }}
            />
        </Tab.Navigator>
    );
}

function AppContent() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const dispatch = useDispatch();

    const handleAuthenticated = React.useCallback(async () => {
        setIsAuthenticated(true);
        const token = await getAccessToken();
        if (token) {
            registerPushForToken(token);
        }
        dispatch(hydrateAvailability());
        dispatch(fetchDriverHome());
    }, [dispatch]);

    useEffect(() => {
        // Initialise push once at launch (no-ops in Expo Go / web).
        initOneSignal();
        checkAuth();
        requestLocationPermission();
        void stopLocationTracking();
    }, []);



    const checkAuth = async () => {
        try {
            const token = await getAccessToken();
            const refreshToken = await getRefreshToken();
            const authenticated = !!token && !!refreshToken;
            setIsAuthenticated(authenticated);

            if (authenticated) {
                // Re-attach the device to the logged-in rider on cold start so
                // delivery pushes keep working across app restarts.
                registerPushForToken(token);
                dispatch(hydrateAvailability());
                dispatch(fetchDriverHome());

            }
        } catch (error) {
            console.error('Auth check error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <BrandedLoader />;
    }

    return (
        <>
            <StatusBar style="dark" backgroundColor={colors.background} />
            <NavigationContainer
                ref={navigationRef}
                theme={navTheme}
                onReady={flushPendingNavigation}
            >
                <Stack.Navigator
                    screenOptions={{
                        headerStyle: styles.headerStyle,
                        headerTintColor: colors.text,
                        headerTitleStyle: styles.headerTitle,
                        headerTitleAlign: 'center',
                        headerShadowVisible: false,
                        cardStyle: { backgroundColor: colors.background },
                    }}
                    initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
                >
                    <Stack.Screen
                        name="MainTabs"
                        component={MainTabs}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="DeliveryDetails"
                        component={DeliveryDetailsScreen}
                        options={{ title: 'Delivery Details' }}
                    />
                    <Stack.Screen
                        name="ActiveDelivery"
                        component={ActiveDeliveryScreen}
                        options={{ title: 'Active Delivery' }}
                    />
                    <Stack.Screen
                        name="ProofOfDelivery"
                        component={ProofOfDeliveryScreen}
                        options={{ title: 'Proof of Delivery' }}
                    />
                    <Stack.Screen name="Login" options={{ headerShown: false }}>
                        {(props) => (
                            <LoginScreen {...props} onAuthenticated={handleAuthenticated} />
                        )}
                    </Stack.Screen>
                    <Stack.Screen name="Register" options={{ headerShown: false }}>
                        {(props) => (
                            <RegisterScreen {...props} onAuthenticated={handleAuthenticated} />
                        )}
                    </Stack.Screen>
                    <Stack.Screen
                        name="ForgotPassword"
                        component={ForgotPasswordScreen}
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
            <RealtimeDispatchLayer isAuthenticated={isAuthenticated} />
        </>
    );
}

export default function App() {
    const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

    if (!clerkKey) {
        console.warn('⚠️ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Google Sign-In with Clerk will be disabled.');
        return (
            <Provider store={store}>
                <AppContent />
            </Provider>
        );
    }

    return (
        <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
            <ClerkLoaded>
                <Provider store={store}>
                    <AppContent />
                </Provider>
            </ClerkLoaded>
        </ClerkProvider>
    );
}

const styles = StyleSheet.create({
    splash: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    splashLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    splashBrand: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: 4,
        color: colors.secondaryDark,
    },
    splashSub: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 6,
        color: colors.textMuted,
        marginTop: 6,
    },
    loadingTrack: {
        width: SPLASH_BAR_TRACK,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.secondarySoft,
        overflow: 'hidden',
        marginTop: 26,
    },
    loadingBar: {
        width: SPLASH_BAR_SEG,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.secondary,
    },
    splashTagline: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 18,
    },
    headerStyle: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
    },
    tabBar: {
        backgroundColor: colors.surface,
        borderTopWidth: 0,
        height: Platform.OS === 'ios' ? 92 : 72,
        paddingTop: 9,
        paddingBottom: Platform.OS === 'ios' ? 27 : 9,
        marginHorizontal: 12,
        marginBottom: Platform.OS === 'ios' ? 0 : 10,
        borderRadius: 22,
        position: 'absolute',
        ...shadows.large,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
    },
    tabItem: {
        paddingVertical: 2,
    },
    tabIconWrap: {
        width: 34,
        height: 28,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabIconWrapActive: {
        backgroundColor: colors.secondarySoft,
    },
});

