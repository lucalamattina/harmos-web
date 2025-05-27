/**
 * Extracts the user ID (sub) from the JWT token in localStorage.
 * @returns {string|null} The user ID or null if not found/invalid.
 */
export function getTokenUserId() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join('')
        );
        return JSON.parse(jsonPayload).sub;
    } catch (error) {
        return null;
    }
}

/**
 * Extracts the full user info from the JWT token in localStorage.
 * @returns {object|null} The user info object or null if not found/invalid.
 */
export function getTokenUserInfo() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        return null;
    }
} 