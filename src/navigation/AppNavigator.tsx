import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../design/tokens';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ModeSelectionScreen from '../screens/ModeSelectionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WebSocketTestScreen from '../screens/WebSocketTestScreen';

// Viewer Mode Screens
import ViewerHomeScreen from '../screens/viewer/ViewerHomeScreen';
import ViewerLiveStreamScreen from '../screens/viewer/ViewerLiveStreamScreen';
import ViewerQRScanScreen from '../screens/viewer/ViewerQRScanScreen';
import ViewerPinCodeScreen from '../screens/viewer/ViewerPinCodeScreen';

// Camera Mode Screens
import CameraHomeScreen from '../screens/camera/CameraHomeScreen';
import CameraSettingsScreen from '../screens/camera/CameraSettingsScreen';
import CameraPinCodeScreen from '../screens/camera/CameraPinCodeScreen';

// Recording Screens
import RecordingListScreen from '../screens/RecordingListScreen';

// Motion Detection & Notification Screens
import MotionDetectionSettingsScreen from '../screens/MotionDetectionSettingsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

import { useAuthStore } from '../stores/authStore';

// Navigation Types
export type RootStackParamList = {
    Auth: undefined;
    ModeSelection: undefined;
    ViewerMode: undefined;
    CameraMode: undefined;
    LiveStream: { cameraId: number; cameraName: string };
    CameraSettings: undefined;
    CameraPinCode: undefined;
    ViewerQRScan: undefined;
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

export type ViewerStackParamList = {
    ViewerHome: undefined;
    LiveStream: { cameraId: number; cameraName: string };
    ViewerQRScan: undefined;
    ViewerPinCode: undefined;
    Settings: undefined;
};

export type CameraStackParamList = {
    CameraHome: undefined;
    CameraSettings: undefined;
    CameraPinCode: undefined;
    Settings: undefined;
    RecordingList: undefined;
    MotionDetectionSettings: undefined;
    NotificationSettings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ViewerStack = createNativeStackNavigator<ViewerStackParamList>();
const CameraStack = createNativeStackNavigator<CameraStackParamList>();

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

// Viewer Mode Navigator
function ViewerNavigator() {
    return (
        <ViewerStack.Navigator
            screenOptions={{
                headerShown: false,
                gestureEnabled: true,
            }}
        >
            <ViewerStack.Screen name="ViewerHome" component={ViewerHomeScreen} />
            <ViewerStack.Screen
                name="LiveStream"
                component={ViewerLiveStreamScreen}
                options={{
                    presentation: 'modal',
                    gestureEnabled: true,
                }}
            />
            <ViewerStack.Screen
                name="ViewerQRScan"
                component={ViewerQRScanScreen}
                options={{
                    presentation: 'modal',
                    gestureEnabled: true,
                }}
            />
            <ViewerStack.Screen
                name="ViewerPinCode"
                component={ViewerPinCodeScreen}
                options={{
                    presentation: 'modal',
                    gestureEnabled: true,
                }}
            />
            <ViewerStack.Screen name="Settings" component={SettingsScreen} />
        </ViewerStack.Navigator>
    );
}

// Camera Mode Navigator
function CameraNavigator() {
    return (
        <CameraStack.Navigator
            screenOptions={{
                headerShown: false,
                gestureEnabled: true,
            }}
        >
            <CameraStack.Screen name="CameraHome" component={CameraHomeScreen} />
            <CameraStack.Screen name="CameraSettings" component={CameraSettingsScreen} />
            <CameraStack.Screen
                name="CameraPinCode"
                component={CameraPinCodeScreen}
                options={{
                    presentation: 'modal',
                    gestureEnabled: true,
                }}
            />
            <CameraStack.Screen name="Settings" component={SettingsScreen} />
            <CameraStack.Screen name="RecordingList" component={RecordingListScreen} />
            <CameraStack.Screen name="MotionDetectionSettings" component={MotionDetectionSettingsScreen} />
            <CameraStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        </CameraStack.Navigator>
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
                        <RootStack.Screen name="ViewerMode" component={ViewerNavigator} />
                        <RootStack.Screen name="CameraMode" component={CameraNavigator} />
                        <RootStack.Screen
                            name="LiveStream"
                            component={ViewerLiveStreamScreen}
                            options={{
                                presentation: 'modal',
                                gestureEnabled: true,
                            }}
                        />
                        <RootStack.Screen name="CameraSettings" component={CameraSettingsScreen} />
                        <RootStack.Screen
                            name="CameraPinCode"
                            component={CameraPinCodeScreen}
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