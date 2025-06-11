import api from './api';

export const getNotifications = async (unreadOnly = false) => {
    const response = await api.get(`/api/notifications?unreadOnly=${unreadOnly}`);
    return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
    const response = await api.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
}; 