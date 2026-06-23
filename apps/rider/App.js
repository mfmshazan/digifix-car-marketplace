import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

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
import PerformanceDashboardScreen from './screens/PerformanceDashboardScreen';
import RealtimeDispatchLayer from './components/RealtimeDispatchLayer';

import { getAccessToken, getRefreshToken } from './services/storage';
import { requestLocationPermission } from './services/location';

import { flushPendingNavigation, navigationRef } from './services/navigation';
import { colors, shadows } from './styles/theme';
import store from './store';
import { hydrateAvailability } from './store/slices/availabilitySlice';
import { fetchDriverHome } from './store/slices/homeSlice';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
                    } else if (route.name === 'AssignedDeliveries') {
                        iconName = focused ? 'car' : 'car-outline';
                    } else if (route.name === 'JobHistory') {
                        iconName = focused ? 'receipt' : 'receipt-outline';
                    } else if (route.name === 'Performance') {
                        iconName = focused ? 'analytics' : 'analytics-outline';
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
                name="AssignedDeliveries"
                component={AssignedDeliveriesScreen}
                options={{ tabBarLabel: 'Assigned' }}
            />
            <Tab.Screen
                name="JobHistory"
                component={JobHistoryScreen}
                options={{ tabBarLabel: 'History' }}
            />
            <Tab.Screen
                name="Performance"
                component={PerformanceDashboardScreen}
                options={{ tabBarLabel: 'Performance' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Profile' }}
            />
        </Tab.Navigator>
    );
}

function AppContent() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const dispatch = useDispatch();

    useEffect(() => {
        checkAuth();
        requestLocationPermission();
    }, []);



    const checkAuth = async () => {
        try {
            const token = await getAccessToken();
            const refreshToken = await getRefreshToken();
            const authenticated = !!token && !!refreshToken;
            setIsAuthenticated(authenticated);

            if (authenticated) {
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
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={colors.secondary} />
            </View>
        );
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
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Register"
                        component={RegisterScreen}
                        options={{ headerShown: false }}
                    />
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
    return (
        <Provider store={store}>
            <AppContent />
        </Provider>
    );
}

const styles = StyleSheet.create({
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
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

