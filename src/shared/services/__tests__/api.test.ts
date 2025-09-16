import { apiService } from '../api';
import { config } from '../../config';
import { logger } from '../../utils/logger';

// Mock axios
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() }
        },
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
    }))
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn()
}));

describe('API Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Configuration', () => {
        it('should initialize with correct base URL', () => {
            expect(config.api.baseUrl).toBeDefined();
            expect(config.api.timeout).toBe(10000);
            expect(config.api.retryAttempts).toBe(3);
        });

        it('should handle different environments', () => {
            const devConfig = config;
            expect(devConfig.environment).toBe('development');
        });
    });

    describe('Token Management', () => {
        it('should store tokens securely', async () => {
            const accessToken = 'test-access-token';
            const refreshToken = 'test-refresh-token';

            await apiService.setTokens(accessToken, refreshToken);

            // Verify tokens are stored
            const storedAccessToken = await apiService.getAccessToken();
            expect(storedAccessToken).toBe(accessToken);
        });

        it('should clear tokens on logout', async () => {
            await apiService.clearTokens();

            const accessToken = await apiService.getAccessToken();
            const refreshToken = await apiService.getRefreshToken();

            expect(accessToken).toBeNull();
            expect(refreshToken).toBeNull();
        });
    });

    describe('Authentication', () => {
        it('should check authentication status', async () => {
            const isAuth = await apiService.isAuthenticated();
            expect(typeof isAuth).toBe('boolean');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            // Mock network error
            const mockAxios = require('axios');
            mockAxios.create.mockReturnValue({
                interceptors: {
                    request: { use: jest.fn() },
                    response: { use: jest.fn() }
                },
                get: jest.fn().mockRejectedValue(new Error('Network Error'))
            });

            try {
                await apiService.get('/test');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
}); 