import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../design/tokens';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ModeSelectionScreen from '../screens/ModeSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import DevicesScreen from '../screens/DevicesScreen';
import LiveStreamScreen from '../screens/LiveStreamScreen';
import EventsScreen from '../screens/EventsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAuthStore } from '../stores/authStore';

// Navigation Types
export type RootStackParamList = {
    Auth: undefined;
    ModeSelection: undefined;
    Main: undefined;
    LiveStream: { cameraId: number; cameraName: string };
};

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Devices: undefined;
    Events: undefined;
    Settings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
function AuthNavigator() {
    return (
        <AuthStack.Navigator
            screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                animation: 'slide_from_right',
            }}
        >
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
    );
}

// Main Tab Navigator
function MainTabNavigator() {
    return (
        <MainTab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Devices':
                            iconName = focused ? 'videocam' : 'videocam-outline';
                            break;
                        case 'Events':
                            iconName = focused ? 'albums' : 'albums-outline';
                            break;
                        case 'Settings':
                            iconName = focused ? 'settings' : 'settings-outline';
                            break;
                        default:
                            iconName = 'help-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textWeak,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: colors.divider,
                    height: 90,
                    paddingBottom: 30,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    ...typography.caption,
                    fontWeight: '500',
                },
            })}
        >
            <MainTab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: '홈' }}
            />
            <MainTab.Screen
                name="Devices"
                component={DevicesScreen}
                options={{ tabBarLabel: '디바이스' }}
            />
            <MainTab.Screen
                name="Events"
                component={EventsScreen}
                options={{ tabBarLabel: '저장 영상' }}
            />
            <MainTab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ tabBarLabel: '설정' }}
            />
        </MainTab.Navigator>
    );
}

// Main App Navigator
export default function AppNavigator() {
    const { isAuthenticated } = useAuthStore();

    console.log('📱 AppNavigator render - isAuthenticated:', isAuthenticated);

    return (
        <NavigationContainer>
            <RootStack.Navigator
                screenOptions={{
                    headerShown: false,
                    gestureEnabled: false,
                }}
            >
                {isAuthenticated ? (
                    <>
                        <RootStack.Screen name="ModeSelection" component={ModeSelectionScreen} />
                        <RootStack.Screen name="Main" component={MainTabNavigator} />
                        <RootStack.Screen
                            name="LiveStream"
                            component={LiveStreamScreen}
                            options={{
                                presentation: 'modal',
                                gestureEnabled: true,
                            }}
                        />
                    </>
                ) : (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
} 