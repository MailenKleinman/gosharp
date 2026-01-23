import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface Query<T> {
  query: string;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  duration: number | null;
  total: number | null;
  results: T[];
}

// API Mock Functions (migrated from utils/fetch.ts)

let storeInstance: any = null;

export const setStoreInstance = (store: any) => {
    storeInstance = store;
};

export const api = {
    get: async (url: string) => {
        const timestamp = new Date().toISOString();
        if (storeInstance) {
            storeInstance.dispatch(addRequest({ url, method: 'GET', payload: null, timestamp }));
        }
        try {
            let result;
            switch (url) {
                case '/api/json-schema-nodes':
                    result = { data: JSON.parse(localStorage.getItem('json-schema-nodes') || '[]') };
                    break;
                case '/api/forms':
                    const formsData = JSON.parse(localStorage.getItem('forms') || '[]');
                    console.log('API GET /api/forms returning:', formsData);
                    result = { data: formsData };
                    break;
                default:
                    result = { data: null };
            }
            return result;
        } finally {
            if (storeInstance) {
                storeInstance.dispatch(removeRequest({ url, timestamp }));
            }
        }
    },

    post: async (url: string, payload: any) => {
        const timestamp = new Date().toISOString();
        if (storeInstance) {
            storeInstance.dispatch(addRequest({ url, method: 'POST', payload, timestamp }));
        }
        try {
            const push = (key: string, item: any) => {
                const id = crypto.randomUUID();
                const now = new Date().toISOString();
                const items = JSON.parse(localStorage.getItem(key) || '[]');
                items.push({
                    id,
                    ...item,
                    createdAt: now,
                    updatedAt: now,
                });
                localStorage.setItem(key, JSON.stringify(items));
                return { id, ...item, createdAt: now, updatedAt: now };
            };

            let result;
            switch (url) {
                case '/api/forms':
                    result = { data: push('forms', payload) };
                    break;
                case '/api/json-schema-nodes':
                    // Save nodes - payload should be an array of nodes, we save/update them all
                    const nodes = Array.isArray(payload) ? payload : [payload];
                    const existingNodes = JSON.parse(localStorage.getItem('json-schema-nodes') || '[]');
                    const now = new Date().toISOString();
                    nodes.forEach((node: any) => {
                        const nodeId = node['x-id'] || node.id;
                        const existingIndex = existingNodes.findIndex((n: any) => (n['x-id'] || n.id) === nodeId);
                        if (existingIndex !== -1) {
                            existingNodes[existingIndex] = { ...node, updatedAt: now };
                        } else {
                            existingNodes.push({ ...node, createdAt: now, updatedAt: now });
                        }
                    });
                    localStorage.setItem('json-schema-nodes', JSON.stringify(existingNodes));
                    result = { data: nodes };
                    break;
                default:
                    result = { data: null };
            }
            return result;
        } finally {
            if (storeInstance) {
                storeInstance.dispatch(removeRequest({ url, timestamp }));
            }
        }
    },

    put: async (url: string, payload: any) => {
        const timestamp = new Date().toISOString();
        if (storeInstance) {
            storeInstance.dispatch(addRequest({ url, method: 'PUT', payload, timestamp }));
        }
        try {
            const update = (key: string, id: string, updates: any) => {
                const items = JSON.parse(localStorage.getItem(key) || '[]');
                const index = items.findIndex((item: any) => (item.$id || item.id) === id);
                if (index !== -1) {
                    items[index] = {
                        ...items[index],
                        ...updates,
                        updatedAt: new Date().toISOString(),
                    };
                    localStorage.setItem(key, JSON.stringify(items));
                    return items[index];
                }
                return null;
            };

            const match = url.match(/\/api\/(forms|workflows|executions)\/(.+)/);
            let result;
            if (match) {
                const [, resource, id] = match;
                result = { data: update(resource, id, payload) };
            } else {
                result = { data: null };
            }
            return result;
        } finally {
            if (storeInstance) {
                storeInstance.dispatch(removeRequest({ url, timestamp }));
            }
        }
    },

    patch: async (url: string, payload: any) => {
        // Same as put for now
        return api.put(url, payload);
    },

    delete: async (url: string) => {
        const timestamp = new Date().toISOString();
        if (storeInstance) {
            storeInstance.dispatch(addRequest({ url, method: 'DELETE', payload: null, timestamp }));
        }
        try {
            const remove = (key: string, id: string) => {
                const items = JSON.parse(localStorage.getItem(key) || '[]');
                const filtered = items.filter((item: any) => (item.$id || item.id) !== id);
                localStorage.setItem(key, JSON.stringify(filtered));
                return id;
            };

            const match = url.match(/\/api\/(forms|workflows|executions)\/(.+)/);
            let result;
            if (match) {
                const [, resource, id] = match;
                result = { data: remove(resource, id) };
            } else {
                result = { data: null };
            }
            return result;
        } finally {
            if (storeInstance) {
                storeInstance.dispatch(removeRequest({ url, timestamp }));
            }
        }
    },
};

interface Request {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    payload: any;
    timestamp: string;
    headers: any;
    status: string;
};

interface DashboardState {
    requests: Request[];
    error: string | null;
    loading: boolean;
    stats: any;
}

const initialState: DashboardState = {
    requests: [],
    error: null,
    loading: false,
    stats: null,
};

// Async thunks
export const fetchDashboardStats = createAsyncThunk(
    'dashboard/fetchStats',
    async () => {
        const [formsRes, workflowsRes, executionsRes] = await Promise.all([
            api.get('/api/forms'),
            api.get('/api/workflows'),
            api.get('/api/executions'),
        ]);

        const forms = formsRes.data || [];
        const workflows = workflowsRes.data || [];
        const executions = executionsRes.data || [];

        return {
            totalForms: forms.length,
            totalWorkflows: workflows.length,
            activeExecutions: executions.filter((e: any) => e.state === 'ACTIVE').length,
            completedExecutions: executions.filter((e: any) => e.state === 'COMPLETED').length,
        };
    }
);

// Slice
const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        addRequest: (state, action) => {
            state.requests.push({
                url: action.payload.url,
                method: action.payload.method,
                payload: action.payload.payload,
                timestamp: action.payload.timestamp,
                headers: action.payload.headers || {},
                status: 'pending'
            });
        },
        removeRequest: (state, action) => {
            state.requests = state.requests.filter(
                (req) => req.url !== action.payload.url || req.timestamp !== action.payload.timestamp
            );
        },
        clearAllRequests: (state) => {
            state.requests = [];
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchDashboardStats.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchDashboardStats.fulfilled, (state, action) => {
            state.loading = false;
            state.stats = action.payload;
        });
        builder.addCase(fetchDashboardStats.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch dashboard stats';
        });
    },
});

export const { clearError, addRequest, removeRequest, clearAllRequests } = dashboardSlice.actions;
export default dashboardSlice.reducer;
