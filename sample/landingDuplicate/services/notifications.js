// Sample-only notifications service.

export async function listNotificationsForUser(_userId, _limitTo = 20) {
  return [
    {
      id: 'n1',
      title: 'Welcome to the sample app',
      message: 'This is a stub notification to match UI.',
      type: 'update',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function markNotificationRead(_notificationId) {
  return { success: true };
}
