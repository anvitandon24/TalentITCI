import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { authEndpoints, type AuthUser, type TokenResponse } from '../lib/api';

type UserRole = 'candidate' | 'hr' | 'admin' | null;

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    candidate_id?: number;
}

interface AuthContextType {
    user: User | null;
    login: (tokenData: TokenResponse) => void;
    loginLegacy: (role: UserRole, userData?: Partial<User>) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Convert API user response to our User shape
    const mapAuthUser = (authUser: AuthUser): User => ({
        id: String(authUser.id),
        name: authUser.name,
        email: authUser.email,
        role: authUser.role as UserRole,
        candidate_id: authUser.candidate_id ?? undefined,
    });

    // 5.2 – Listen for token refresh events to update user data in context
    useEffect(() => {
        const handleRefresh = (e: Event) => {
            const customEvent = e as CustomEvent<{ user: AuthUser }>;
            if (customEvent.detail?.user) {
                const freshUser = mapAuthUser(customEvent.detail.user);
                setUser(freshUser);
            }
        };

        window.addEventListener('auth:refreshed', handleRefresh);
        return () => window.removeEventListener('auth:refreshed', handleRefresh);
    }, []);

    // On mount, check for stored tokens and validate with backend
    useEffect(() => {
        const initAuth = async () => {
            const accessToken = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');

            if (!accessToken) {
                // No token — check for legacy user in localStorage
                if (storedUser) {
                    try {
                        setUser(JSON.parse(storedUser));
                    } catch {
                        localStorage.removeItem('user');
                    }
                }
                setIsLoading(false);
                return;
            }

            // We have a token — validate it by calling /auth/me
            try {
                const response = await authEndpoints.getMe();
                const validUser = mapAuthUser(response.data);
                setUser(validUser);
                localStorage.setItem('user', JSON.stringify(validUser));
            } catch {
                // Token is invalid or expired — the interceptor will try to
                // refresh automatically.  If refresh also fails the
                // interceptor clears storage and redirects, so we just fall
                // back to stored user for now.
                if (storedUser) {
                    try {
                        setUser(JSON.parse(storedUser));
                    } catch {
                        localStorage.removeItem('user');
                    }
                }
            }

            setIsLoading(false);
        };

        initAuth();
    }, []);

    // JWT-based login – called after POST /auth/login, /auth/register, /auth/google
    const login = useCallback((tokenData: TokenResponse) => {
        localStorage.setItem('access_token', tokenData.access_token);
        localStorage.setItem('refresh_token', tokenData.refresh_token);

        const mappedUser = mapAuthUser(tokenData.user);
        setUser(mappedUser);
        localStorage.setItem('user', JSON.stringify(mappedUser));
    }, []);

    // Legacy login (kept for backward-compat with the old signup endpoint)
    const loginLegacy = useCallback((role: UserRole, userData?: Partial<User>) => {
        const newUser: User = {
            id: userData?.id || '1',
            name: userData?.name || (role === 'hr' ? 'HR Manager' : 'Candidate'),
            email: userData?.email || (role === 'hr' ? 'hr@company.com' : 'candidate@example.com'),
            role: role,
            candidate_id: userData?.candidate_id,
        };

        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                loginLegacy,
                logout,
                isAuthenticated: !!user,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
