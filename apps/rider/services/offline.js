import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = 'offline_action_queue';

/**
 * Add action to offline queue
 */
export const queueOfflineAction = async (action) => {
    try {
        const queue = await getOfflineQueue();
        queue.push({
            ...action,
            timestamp: new Date().toISOString(),
        });
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        console.log('Action queued for offline sync:', action.type);
    } catch (error) {
        console.error('Error queuing offline action:', error);
    }
};

/**
 * Get offline queue
 */
export const getOfflineQueue = async () => {
    try {
        const queueData = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
        console.error('Error getting offline queue:', error);
        return [];
    }
};

/**
 * Clear offline queue
 */
export const clearOfflineQueue = async () => {
    try {
        await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
        console.error('Error clearing offline queue:', error);
    }
};

/**
 * Process offline queue when connection is restored
 */
export const processOfflineQueue = async (apiClient) => {
    try {
        const queue = await getOfflineQueue();

        if (queue.length === 0) {
            return { success: true, processed: 0 };
        }

        console.log(`Processing ${queue.length} offline actions...`);

        const results = [];

        for (const action of queue) {
            try {
                switch (action.type) {
                    case 'UPDATE_STATUS':
                        await apiClient.put(`/jobs/${action.jobId}/status`, {
                            status: action.status,
                        });
                        break;

                    case 'ADD_LOCATION':
                        await apiClient.post(`/jobs/${action.jobId}/location`, action.data);
                        break;

                    case 'UPDATE_PARTNER_LOCATION':
                        await apiClient.put('/partner/location', action.data);
                        break;

                    default:
                        console.warn('Unknown action type:', action.type);
                }

                results.push({ action, success: true });
            } catch (error) {
                console.error('Error processing offline action:', error);
                results.push({ action, success: false, error });
            }
        }

        // Clear queue after processing
        await clearOfflineQueue();

        const successCount = results.filter((r) => r.success).length;
        console.log(`Processed ${successCount}/${queue.length} offline actions successfully`);

        return {
            success: true,
            processed: successCount,
            failed: queue.length - successCount,
        };
    } catch (error) {
        console.error('Error processing offline queue:', error);
        return { success: false, error };
    }
};
