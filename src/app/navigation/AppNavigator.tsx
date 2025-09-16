import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/design/tokens';

// Auth Screens
import LoginScreen from '@/features/auth/screens/LoginScreen';
import RegisterScreen from '@/features/auth/screens/RegisterScreen';

// Connection Screens
import ModeSelectionScreen from '@/features/connection/screens/ModeSelectionScreen';

// Settings Screens
import SettingsScreen from '@/features/settings/screens/SettingsScreen';
import MotionDetectionSettingsScreen from '@/features/settings/screens/MotionDetectionSettingsScreen';
import NotificationSettingsScreen from '@/features/settings/screens/NotificationSettingsScreen';

// Viewer Mode Screens
import ViewerHomeScreen from '@/features/viewer/screens/ViewerHomeScreen';
import ViewerLiveStreamScreen from '@/features/viewer/screens/ViewerLiveStreamScreen';
import ViewerPinCodeScreen from '@/features/viewer/screens/ViewerPinCodeScreen';
import ViewerQRScanScreen from '@/features/viewer/screens/ViewerQRScanScreen';

// Camera Mode Screens
import CameraHomeScreen from '@/features/camera/screens/CameraHomeScreen';
import CameraSettingsScreen from '@/features/camera/screens/CameraSettingsScreen';
import QRCodeGeneratorScreen from '@/features/camera/screens/QRCodeGeneratorScreen';

// Recording Screens
import RecordingListScreen from '@/features/recording/screens/RecordingListScreen';

// Test Screen
import WebSocketTestScreen from '@/shared/components/examples/WebSocketTestScreen';

import { useAuthStore } from '@/shared/stores/authStore';

// Navigation Types
export type RootStackParamList = {
    Auth: undefined;
    ModeSelection: undefined;
    ViewerHome: undefined;
    ViewerPinCode: undefined;
    ViewerQRScan: undefined;
    LiveStream: { cameraId: string; cameraName: string; ipAddress: string; quality: string };
    CameraHome: undefined;
    CameraSettings: undefined;
    QRCodeGenerator: { cameraId: string; cameraName: string };
    Settings: undefined;
    RecordingList: undefined;
    MotionDetectionSettings: undefined;
    NotificationSettings: undefined;
    WebSocketTest: undefined;
};

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

export type CameraStackParamList = {
    CameraHome: undefined;
    CameraSettings: undefined;
    QRCodeGenerator: { cameraId: string; cameraName: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

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

// Main App Navigator
export default function AppNavigator() {
    const { isAuthenticated, user } = useAuthStore();

    console.log('📱 AppNavigator render - isAuthenticated:', isAuthenticated, 'user:', user ? '있음' : '없음');

    return (
        <NavigationContainer
            onStateChange={(state) => {
                console.log('Navigation state changed:', state);
            }}
        >
            <RootStack.Navigator
                screenOptions={{
                    headerShown: false,
                    gestureEnabled: false,
                }}
            >
                {isAuthenticated ? (
                    <>
                        <RootStack.Screen
                            name="ModeSelection"
                            component={ModeSelectionScreen}
                            options={{
                                gestureEnabled: false,
                            }}
                        />
                        <RootStack.Screen
                            name="ViewerHome"
                            component={ViewerHomeScreen}
                        />
                        <RootStack.Screen
                            name="ViewerPinCode"
                            component={ViewerPinCodeScreen}
                            options={{
                                presentation: 'modal',
                                gestureEnabled: true,
                            }}
                        />
                        <RootStack.Screen
                            name="ViewerQRScan"
                            component={ViewerQRScanScreen}
                            options={{
                                presentation: 'modal',
                                gestureEnabled: true,
                                headerShown: false,
                            }}
                        />
                        <RootStack.Screen
                            name="LiveStream"
                            component={ViewerLiveStreamScreen}
                            options={{
                                presentation: 'modal',
                                gestureEnabled: true,
                            }}
                        />
                        <RootStack.Screen
                            name="CameraHome"
                            component={CameraHomeScreen}
                        />
                        <RootStack.Screen name="CameraSettings" component={CameraSettingsScreen} />
                        <RootStack.Screen
                            name="QRCodeGenerator"
                            component={QRCodeGeneratorScreen}
                            options={{
                                presentation: 'modal',
                                gestureEnabled: true,
                            }}
                        />
                        <RootStack.Screen name="Settings" component={SettingsScreen} />
                        <RootStack.Screen name="RecordingList" component={RecordingListScreen} />
                        <RootStack.Screen name="MotionDetectionSettings" component={MotionDetectionSettingsScreen} />
                        <RootStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
                        <RootStack.Screen name="WebSocketTest" component={WebSocketTestScreen} />
                    </>
                ) : (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
}
