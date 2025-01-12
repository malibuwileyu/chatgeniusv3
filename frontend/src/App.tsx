import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { store } from './store/store';
import theme from './utils/theme';
import LoginForm from './components/auth/LoginForm';
import HomePage from './components/home/HomePage';
import Welcome from './components/home/Welcome';
import ChannelChat from './pages/ChannelChat';
import ProtectedRoute from './components/common/ProtectedRoute';
import { Box } from '@mui/material';

const App = () => {
    return (
        <Box 
            sx={{ 
                height: '100vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Provider store={store}>
                <ThemeProvider theme={theme}>
                    <Router>
                        <Routes>
                            <Route path="/login" element={<LoginForm />} />
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <HomePage />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<Welcome />} />
                                <Route path="channels/:id" element={<ChannelChat />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Router>
                </ThemeProvider>
            </Provider>
        </Box>
    );
};

export default App;
