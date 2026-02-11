import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type UserRole = 'candidate' | 'hr' | null;

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    candidate_id?: number;  // DB candidate.id (only for candidates)
}

interface AuthContextType {
    user: User | null;
    login: (role: UserRole, userData?: Partial<User>) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check local storage on mount
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (role: UserRole, userData?: Partial<User>) => {
        const newUser: User = {
            id: userData?.id || '1',
            name: userData?.name || (role === 'hr' ? 'HR Manager' : 'Candidate'),
            email: userData?.email || (role === 'hr' ? 'hr@company.com' : 'candidate@example.com'),
            role: role,
            candidate_id: userData?.candidate_id,
        };

        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
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
