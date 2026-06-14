import { configureStore } from '@reduxjs/toolkit';
import availabilityReducer from './slices/availabilitySlice';
import assignedDeliveriesReducer from './slices/assignedDeliveriesSlice';
import homeReducer from './slices/homeSlice';
import incomingRequestReducer from './slices/incomingRequestSlice';

const store = configureStore({
    reducer: {
        availability: availabilityReducer,
        assignedDeliveries: assignedDeliveriesReducer,
        home: homeReducer,
        incomingRequest: incomingRequestReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // Expo / React Native serializable check — relax for non-plain objects
            serializableCheck: {
                ignoredActions: ['availability/toggle/pending'],
            },
        }),
});

export default store;
