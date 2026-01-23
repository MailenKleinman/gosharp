import { configureStore } from '@reduxjs/toolkit';
import workflowsReducer from './slices/workflowsSlice';
import formsReducer from './slices/formsSlice';
import executionsReducer from './slices/executionsSlice';
import dashboardReducer, { setStoreInstance } from './slices/dashboardSlice';
import formEditorReducer from './slices/formEditorSlice';

export const store = configureStore({
    reducer: {
        workflows: workflowsReducer,
        forms: formsReducer,
        executions: executionsReducer,
        dashboard: dashboardReducer,
        formEditor: formEditorReducer,
    },
});

// Set the store instance for the API to track requests
setStoreInstance(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
