# Frontend Documentation

## Authentication Integration

### useAuth Hook

The `useAuth` hook manages authentication state and operations:

```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
    const { 
        user,
        isAuthenticated,
        login,
        register,
        logout,
        verifyToken
    } = useAuth();

    // Use authentication state and methods
}
```

#### Available Methods

- `login(email: string, password: string)`: Authenticate user
- `register(data: RegisterData)`: Register new user
- `logout()`: Log out user and clear tokens
- `verifyToken()`: Verify and refresh token if needed

### Protected Routes

Wrap protected routes with the `ProtectedRoute` component:

```typescript
import { ProtectedRoute } from '../components/common/ProtectedRoute';

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
```

### API Service

Configure API service with authentication:

```typescript
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL
});

// Add auth header interceptor
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token refresh
api.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401) {
            // Handle token refresh or logout
        }
        return Promise.reject(error);
    }
);
```

### Error Handling

Handle authentication errors in components:

```typescript
function LoginForm() {
    const { login } = useAuth();
    const [error, setError] = useState('');

    const handleSubmit = async (data) => {
        try {
            await login(data.email, data.password);
            // Redirect on success
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}
            {/* Form fields */}
        </form>
    );
}
```

### State Management

Authentication state in Redux store:

```typescript
// authSlice.ts
interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
        }
        // Other reducers...
    }
});
```

### Components

Example protected component:

```typescript
function UserProfile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const updateProfile = async (data) => {
        try {
            setLoading(true);
            await api.put(`/users/${user.id}`, data);
            // Handle success
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div>
            {loading && <Spinner />}
            {error && <Error message={error} />}
            {/* Profile form */}
        </div>
    );
}
```

### Best Practices

1. Token Storage:
- Store tokens in secure HttpOnly cookies
- Clear tokens on logout
- Refresh tokens before expiration

2. Route Protection:
- Use ProtectedRoute for authenticated routes
- Handle loading states
- Preserve intended destination

3. Error Handling:
- Handle network errors
- Show user-friendly messages
- Log authentication failures

4. State Management:
- Keep auth state in Redux
- Handle token refresh globally
- Clear state on logout 