import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setCredentials, setError, logout } from '../store/slices/authSlice';
import api from '../services/api';

interface AuthState {
    user: {
        id: string;
        email: string;
        username: string;
        fullName: string;
        status: string;
    } | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

export const useAuth = () => {
    const dispatch = useDispatch();
    const auth = useSelector((state: RootState) => state.auth) as AuthState;

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('token');
            if (token && !auth.isAuthenticated) {
                try {
                    const response = await api.get('/auth/me');
                    dispatch(setCredentials({
                        user: response.data.user,
                        token
                    }));
                } catch (error) {
                    console.error('Token verification failed:', error);
                    dispatch(logout());
                }
            }
        };

        verifyToken();
    }, [dispatch, auth.isAuthenticated]);

    const login = async (email: string, password: string) => {
        try {
            dispatch(setError(null));
            const response = await api.post('/auth/login', { email, password });
            dispatch(setCredentials(response.data));
            return response.data;
        } catch (error: any) {
            const message = error.response?.data?.message || 'An error occurred during login';
            dispatch(setError(message));
            throw error;
        }
    };

    const register = async (userData: {
        email: string;
        password: string;
        username: string;
        fullName: string;
    }) => {
        try {
            dispatch(setError(null));
            const response = await api.post('/auth/register', userData);
            dispatch(setCredentials(response.data));
            return response.data;
        } catch (error: any) {
            const message = error.response?.data?.message || 'An error occurred during registration';
            dispatch(setError(message));
            throw error;
        }
    };

    const logoutUser = () => {
        dispatch(logout());
    };

    return {
        user: auth.user,
        token: auth.token,
        isAuthenticated: auth.isAuthenticated,
        loading: auth.loading,
        error: auth.error,
        login,
        register,
        logout: logoutUser
    };
};

export default useAuth; 