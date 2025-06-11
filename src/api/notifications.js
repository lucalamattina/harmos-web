import api from './api';

export const getNotifications = async (unreadOnly = false) => {
    try {
        const response = await api.get(`/api/notifications?unreadOnly=${unreadOnly}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching notifications:', error.response?.status, error.response?.data);
        throw error;
    }
};

export const markNotificationAsRead = async (notificationId) => {
    try {
        const response = await api.patch(`/api/notifications/${notificationId}/read`);
        return response.data;
    } catch (error) {
        console.error('Error marking notification as read:', error.response?.status, error.response?.data);
        // Log additional debugging info
        const token = localStorage.getItem('token');
        console.log('Token exists:', !!token);
        if (token) {
            console.log('Token length:', token.length);
        }
        throw error;
    }
}; 