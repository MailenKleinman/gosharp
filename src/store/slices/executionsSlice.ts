import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Execution, Task } from '../types';
import { api } from './dashboardSlice';

interface ExecutionsState {
    executions: Execution[];
    currentExecution: Execution | null;
    tasks: Task[];
    loading: boolean;
    error: string | null;
}

const initialState: ExecutionsState = {
    executions: [],
    currentExecution: null,
    tasks: [],
    loading: false,
    error: null,
};

// Async thunks for executions
export const fetchExecutions = createAsyncThunk(
    'executions/fetchAll',
    async (filters?: { state?: string; workflowId?: string }) => {
        // For now, ignore filters and fetch all executions
        const response = await api.get('/api/executions');
        return response.data;
    }
);

export const fetchExecutionById = createAsyncThunk(
    'executions/fetchById',
    async (id: string) => {
        const response = await api.get(`/api/executions/${id}`);
        return response.data;
    }
);

export const startExecution = createAsyncThunk(
    'executions/start',
    async (data: { workflowId: string; businessKey?: string; variables: Record<string, any> }) => {
        const response = await api.post('/api/executions', data);
        return response.data;
    }
);

export const suspendExecution = createAsyncThunk(
    'executions/suspend',
    async (id: string) => {
        const response = await api.put(`/api/executions/${id}`, { state: 'SUSPENDED' });
        return response.data;
    }
);

export const resumeExecution = createAsyncThunk(
    'executions/resume',
    async (id: string) => {
        const response = await api.put(`/api/executions/${id}`, { state: 'ACTIVE' });
        return response.data;
    }
);

export const terminateExecution = createAsyncThunk(
    'executions/terminate',
    async (id: string) => {
        await api.delete(`/api/executions/${id}`);
        return id;
    }
);

// Async thunks for tasks
export const fetchTasks = createAsyncThunk(
    'executions/fetchTasks',
    async (filters?: { executionId?: string; assignee?: string; status?: string }) => {
        // For now, fetch all tasks (could be extended to support filters)
        const response = await api.get('/api/tasks');
        return response.data || [];
    }
);

export const completeTask = createAsyncThunk(
    'executions/completeTask',
    async ({ taskId, data }: { taskId: string; data: Record<string, any> }) => {
        const response = await api.put(`/api/tasks/${taskId}`, { status: 'completed', ...data });
        return response.data;
    }
);

export const assignTask = createAsyncThunk(
    'executions/assignTask',
    async ({ taskId, assignee }: { taskId: string; assignee: string }) => {
        const response = await api.put(`/api/tasks/${taskId}`, { assignee });
        return response.data;
    }
);

// Slice
const executionsSlice = createSlice({
    name: 'executions',
    initialState,
    reducers: {
        setCurrentExecution: (state, action: PayloadAction<Execution | null>) => {
            state.currentExecution = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch all executions
        builder.addCase(fetchExecutions.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchExecutions.fulfilled, (state, action) => {
            state.loading = false;
            state.executions = action.payload;
        });
        builder.addCase(fetchExecutions.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch executions';
        });

        // Fetch execution by ID
        builder.addCase(fetchExecutionById.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchExecutionById.fulfilled, (state, action) => {
            state.loading = false;
            state.currentExecution = action.payload;
        });
        builder.addCase(fetchExecutionById.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch execution';
        });

        // Start execution
        builder.addCase(startExecution.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(startExecution.fulfilled, (state, action) => {
            state.loading = false;
            state.executions.push(action.payload);
            state.currentExecution = action.payload;
        });
        builder.addCase(startExecution.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to start execution';
        });

        // Suspend execution
        builder.addCase(suspendExecution.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(suspendExecution.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.executions.findIndex(e => e.id === action.payload.id);
            if (index !== -1) {
                state.executions[index] = action.payload;
            }
            if (state.currentExecution?.id === action.payload.id) {
                state.currentExecution = action.payload;
            }
        });
        builder.addCase(suspendExecution.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to suspend execution';
        });

        // Resume execution
        builder.addCase(resumeExecution.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(resumeExecution.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.executions.findIndex(e => e.id === action.payload.id);
            if (index !== -1) {
                state.executions[index] = action.payload;
            }
            if (state.currentExecution?.id === action.payload.id) {
                state.currentExecution = action.payload;
            }
        });
        builder.addCase(resumeExecution.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to resume execution';
        });

        // Terminate execution
        builder.addCase(terminateExecution.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(terminateExecution.fulfilled, (state, action) => {
            state.loading = false;
            state.executions = state.executions.filter(e => e.id !== action.payload);
            if (state.currentExecution?.id === action.payload) {
                state.currentExecution = null;
            }
        });
        builder.addCase(terminateExecution.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to terminate execution';
        });

        // Fetch tasks
        builder.addCase(fetchTasks.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchTasks.fulfilled, (state, action) => {
            state.loading = false;
            state.tasks = action.payload;
        });
        builder.addCase(fetchTasks.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch tasks';
        });

        // Complete task
        builder.addCase(completeTask.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(completeTask.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.tasks.findIndex(t => t.id === action.payload.id);
            if (index !== -1) {
                state.tasks[index] = action.payload;
            }
        });
        builder.addCase(completeTask.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to complete task';
        });

        // Assign task
        builder.addCase(assignTask.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(assignTask.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.tasks.findIndex(t => t.id === action.payload.id);
            if (index !== -1) {
                state.tasks[index] = action.payload;
            }
        });
        builder.addCase(assignTask.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to assign task';
        });
    },
});

export const { setCurrentExecution, clearError } = executionsSlice.actions;
export default executionsSlice.reducer;
