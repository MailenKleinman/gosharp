import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Workflow } from '../types';
import { api } from './dashboardSlice';

interface WorkflowsState {
    workflows: Workflow[];
    currentWorkflow: Workflow | null;
    loading: boolean;
    error: string | null;
}

const initialState: WorkflowsState = {
    workflows: [],
    currentWorkflow: null,
    loading: false,
    error: null,
};

// Async thunks
export const fetchWorkflows = createAsyncThunk(
    'workflows/fetchAll',
    async () => {
        const response = await api.get('/api/workflows');
        return response.data;
    }
);

export const fetchWorkflowById = createAsyncThunk(
    'workflows/fetchById',
    async (id: string) => {
        const response = await api.get(`/api/workflows/${id}`);
        return response.data;
    }
);

export const createWorkflow = createAsyncThunk(
    'workflows/create',
    async (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => {
        const response = await api.post('/api/workflows', workflow);
        return response.data;
    }
);

export const updateWorkflow = createAsyncThunk(
    'workflows/update',
    async ({ id, data }: { id: string; data: Partial<Workflow> }) => {
        const response = await api.put(`/api/workflows/${id}`, data);
        return response.data;
    }
);

export const deleteWorkflow = createAsyncThunk(
    'workflows/delete',
    async (id: string) => {
        await api.delete(`/api/workflows/${id}`);
        return id;
    }
);

// Slice
const workflowsSlice = createSlice({
    name: 'workflows',
    initialState,
    reducers: {
        setCurrentWorkflow: (state, action: PayloadAction<Workflow | null>) => {
            state.currentWorkflow = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch all workflows
        builder.addCase(fetchWorkflows.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchWorkflows.fulfilled, (state, action) => {
            state.loading = false;
            state.workflows = action.payload;
        });
        builder.addCase(fetchWorkflows.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch workflows';
        });

        // Fetch workflow by ID
        builder.addCase(fetchWorkflowById.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchWorkflowById.fulfilled, (state, action) => {
            state.loading = false;
            state.currentWorkflow = action.payload;
        });
        builder.addCase(fetchWorkflowById.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch workflow';
        });

        // Create workflow
        builder.addCase(createWorkflow.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(createWorkflow.fulfilled, (state, action) => {
            state.loading = false;
            state.workflows.push(action.payload);
            state.currentWorkflow = action.payload;
        });
        builder.addCase(createWorkflow.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to create workflow';
        });

        // Update workflow
        builder.addCase(updateWorkflow.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(updateWorkflow.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.workflows.findIndex(w => w.id === action.payload.id);
            if (index !== -1) {
                state.workflows[index] = action.payload;
            }
            if (state.currentWorkflow?.id === action.payload.id) {
                state.currentWorkflow = action.payload;
            }
        });
        builder.addCase(updateWorkflow.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to update workflow';
        });

        // Delete workflow
        builder.addCase(deleteWorkflow.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(deleteWorkflow.fulfilled, (state, action) => {
            state.loading = false;
            state.workflows = state.workflows.filter(w => w.id !== action.payload);
            if (state.currentWorkflow?.id === action.payload) {
                state.currentWorkflow = null;
            }
        });
        builder.addCase(deleteWorkflow.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to delete workflow';
        });
    },
});

export const { setCurrentWorkflow, clearError } = workflowsSlice.actions;
export default workflowsSlice.reducer;
