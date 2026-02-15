/**
 * Get the dashboard path for a given user role.
 */
export function getDashboardPath(role: string): string {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';
        case 'hr':
            return '/dashboard';
        case 'candidate':
        default:
            return '/candidate-dashboard';
    }
}
