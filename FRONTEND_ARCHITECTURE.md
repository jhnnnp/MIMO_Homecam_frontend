# Frontend Architecture Guidelines

## 📐 Project Structure

```
src/
├── app/                    # Application-level configuration
│   ├── navigation/         # Navigation setup and routes
│   ├── providers/          # Context providers and store setup
│   └── config/            # App-level configuration
├── features/              # Feature-based organization (Domain-driven)
│   ├── auth/              # Authentication domain
│   │   ├── components/    # Auth-specific components
│   │   ├── screens/       # Auth screens
│   │   ├── hooks/         # Auth-specific hooks
│   │   ├── services/      # Auth API services
│   │   ├── stores/        # Auth state management
│   │   └── types/         # Auth-specific types
│   ├── camera/            # Camera functionality
│   ├── viewer/            # Viewer functionality
│   ├── connection/        # Connection management
│   ├── settings/          # Settings management
│   └── recording/         # Recording functionality
├── shared/                # Shared utilities and components
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Basic UI components (Button, Input, Card)
│   │   ├── form/         # Form-related components
│   │   ├── media/        # Media player components
│   │   ├── layout/       # Layout components (Header, Container)
│   │   └── feedback/     # Feedback components (Loading, Error, Empty)
│   ├── hooks/            # Reusable custom hooks
│   ├── services/         # Core API services and utilities
│   ├── stores/           # Global state management
│   ├── types/            # Global TypeScript definitions
│   ├── utils/            # Utility functions
│   └── constants/        # Application constants
├── design/               # Design system
│   ├── tokens/           # Design tokens (colors, spacing, typography)
│   ├── themes/           # Theme definitions
│   └── styles/           # Global styles and CSS
└── assets/               # Static assets (images, fonts, etc.)
```

## 🏗 Architecture Principles

### 1. Feature-Based Organization
- **Domain Isolation**: Each feature contains its own components, services, types
- **Self-Contained**: Features should minimize dependencies on other features
- **Clear Boundaries**: Well-defined interfaces between features

### 2. Layered Architecture
```
┌─────────────────┐
│   Presentation  │ <- Screens, Components
├─────────────────┤
│    Business     │ <- Hooks, Services
├─────────────────┤
│      Data       │ <- API, Store, Cache
└─────────────────┘
```

### 3. Dependency Direction
- **Upward Dependencies**: Lower layers should not depend on higher layers
- **Interface Segregation**: Use interfaces for external dependencies
- **Inversion of Control**: High-level modules should not depend on low-level modules

## 📝 Naming Conventions

### Files & Folders
```
PascalCase:     Components, Screens, Services (Classes)
camelCase:      hooks, utilities, services (functions)
kebab-case:     folders, assets
UPPER_CASE:     constants, environment variables
```

### Components
```
// UI Components
Button.tsx              -> <Button />
TextField.tsx           -> <TextField />
LoadingSpinner.tsx      -> <LoadingSpinner />

// Feature Components  
CameraPreview.tsx       -> <CameraPreview />
RecordingList.tsx       -> <RecordingList />

// Screen Components
LoginScreen.tsx         -> <LoginScreen />
CameraHomeScreen.tsx    -> <CameraHomeScreen />
```

### Services & Hooks
```
// Services (Class-based)
AuthService.ts          -> AuthService
CameraService.ts        -> CameraService

// Hooks (Function-based)
useAuth.ts              -> useAuth()
useCameraStream.ts      -> useCameraStream()

// API Services
authApi.ts              -> authApi
cameraApi.ts            -> cameraApi
```

## 🔧 Component Guidelines

### Component Types
1. **UI Components** (`shared/components/ui/`)
   - Pure, reusable components
   - No business logic
   - Props-driven behavior
   - Styled with design tokens

2. **Feature Components** (`features/{domain}/components/`)
   - Domain-specific logic
   - Can use domain hooks and services
   - Connected to domain state

3. **Layout Components** (`shared/components/layout/`)
   - App structure components
   - Navigation, headers, containers
   - Responsive design handling

### Component Structure
```typescript
// Component Props Interface
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

// Component Implementation
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  onPress,
  children,
}) => {
  // Component logic
  return (
    // JSX implementation
  );
};

// Default export
export default Button;
```

## 🎣 Hook Guidelines

### Hook Categories
1. **Data Hooks** (`features/{domain}/hooks/`)
   - API data fetching
   - State management
   - Domain-specific logic

2. **UI Hooks** (`shared/hooks/`)
   - UI state management
   - Form handling
   - Animation controls

3. **Utility Hooks** (`shared/hooks/`)
   - Generic utilities
   - Platform-specific logic
   - Performance optimizations

### Hook Structure
```typescript
interface UseCameraOptions {
  autoStart?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

interface UseCameraReturn {
  stream: MediaStream | null;
  isLoading: boolean;
  error: Error | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export const useCamera = (options: UseCameraOptions = {}): UseCameraReturn => {
  // Hook implementation
  return {
    stream,
    isLoading,
    error,
    startCamera,
    stopCamera,
  };
};
```

## 🔄 Service Layer Guidelines

### Service Categories
1. **API Services** (`shared/services/api/`)
   - HTTP client configuration
   - Request/response interceptors
   - Error handling

2. **Domain Services** (`features/{domain}/services/`)
   - Business logic
   - Data transformation
   - External integrations

3. **Utility Services** (`shared/services/`)
   - Logging, analytics
   - Device capabilities
   - Background tasks

### Service Structure
```typescript
// API Service Interface
interface CameraApiService {
  getDevices(): Promise<CameraDevice[]>;
  connectToDevice(deviceId: string): Promise<Connection>;
  disconnectFromDevice(deviceId: string): Promise<void>;
}

// Service Implementation
class CameraService implements CameraApiService {
  constructor(
    private apiClient: ApiClient,
    private logger: Logger
  ) {}

  async getDevices(): Promise<CameraDevice[]> {
    try {
      const response = await this.apiClient.get('/cameras');
      return response.data.map(this.transformDevice);
    } catch (error) {
      this.logger.error('Failed to fetch devices', error);
      throw new ServiceError('Unable to fetch camera devices');
    }
  }

  private transformDevice(rawDevice: any): CameraDevice {
    // Data transformation logic
  }
}

// Export singleton instance
export const cameraService = new CameraService(apiClient, logger);
```

## 📦 State Management Guidelines

### Store Structure
```typescript
// Feature Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

// Store Implementation (Zustand example)
export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login(credentials);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  // ... other actions
}));
```

## 🔍 Testing Guidelines

### Test Organization
```
src/
├── features/
│   └── auth/
│       ├── __tests__/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── integration/
└── shared/
    └── components/
        └── __tests__/
```

### Test Categories
1. **Unit Tests**: Individual functions, hooks, components
2. **Integration Tests**: Feature workflows, API integrations
3. **E2E Tests**: Complete user journeys

## 📊 Performance Guidelines

### Code Splitting
```typescript
// Lazy load screens
const CameraHomeScreen = lazy(() => import('./features/camera/screens/CameraHomeScreen'));
const ViewerHomeScreen = lazy(() => import('./features/viewer/screens/ViewerHomeScreen'));

// Feature-based code splitting
const CameraFeature = lazy(() => import('./features/camera'));
```

### Bundle Optimization
- Tree shaking for unused code
- Dynamic imports for large dependencies
- Image optimization and lazy loading
- Service worker for caching

## 🔐 Security Guidelines

### Data Validation
```typescript
// Input validation schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Sanitization
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input);
};
```

### Secure Storage
- Sensitive data in encrypted storage
- Token rotation and refresh
- Biometric authentication integration

## 📱 Platform Guidelines

### React Native Specific
- Platform-specific code isolation
- Native module integration
- Performance optimization for mobile
- Accessibility compliance

### Cross-Platform Considerations
- Shared business logic
- Platform-specific UI adaptations
- Native capability detection

---

## 🚀 Migration Strategy

### Phase 1: Foundation
1. Create new folder structure
2. Move shared components and utilities
3. Set up new build configuration

### Phase 2: Feature Migration
1. Migrate auth feature
2. Migrate camera feature
3. Migrate viewer feature
4. Migrate remaining features

### Phase 3: Optimization
1. Remove deprecated files
2. Update import paths
3. Optimize bundle size
4. Update documentation

---

## 📋 Checklist for New Features

- [ ] Feature folder structure created
- [ ] Components follow naming conventions
- [ ] Services implement proper interfaces
- [ ] Types are properly defined
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Performance considerations addressed
- [ ] Security guidelines followed
- [ ] Accessibility requirements met
- [ ] Code review completed 