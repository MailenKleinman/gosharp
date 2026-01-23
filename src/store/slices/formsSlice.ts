import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Form } from '../types';
import { api } from './dashboardSlice';

interface FormsState {
    forms: Form[];
    currentForm: Form | null;
    loading: boolean;
    error: string | null;
}

const initialState: FormsState = {
    forms: [],
    currentForm: null,
    loading: false,
    error: null,
};

// Async thunks
export const fetchForms = createAsyncThunk(
    'forms/fetchAll',
    async () => {
        const response = await api.get('/api/forms');
        console.log('fetchForms thunk - response.data:', response.data);
        return response.data;
    }
);

export const fetchFormById = createAsyncThunk(
    'forms/fetchById',
    async (id: string) => {
        const response = await api.get(`/api/forms/${id}`);
        return response.data;
    }
);

export const createForm = createAsyncThunk(
    'forms/create',
    async (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt'>) => {
        const response = await api.post('/api/forms', form);
        return response.data;
    }
);

export const updateForm = createAsyncThunk(
    'forms/update',
    async ({ id, data }: { id: string; data: Partial<Form> }) => {
        const response = await api.put(`/api/forms/${id}`, data);
        return response.data;
    }
);

export const deleteForm = createAsyncThunk(
    'forms/delete',
    async (id: string) => {
        await api.delete(`/api/forms/${id}`);
        return id;
    }
);

// Slice
const formsSlice = createSlice({
    name: 'forms',
    initialState,
    reducers: {
        setCurrentForm: (state, action: PayloadAction<Form | null>) => {
            state.currentForm = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch all forms
        builder.addCase(fetchForms.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchForms.fulfilled, (state, action) => {
            console.log('fetchForms.fulfilled - action.payload:', action.payload);
            state.loading = false;
            state.forms = action.payload;
        });
        builder.addCase(fetchForms.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch forms';
        });

        // Fetch form by ID
        builder.addCase(fetchFormById.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(fetchFormById.fulfilled, (state, action) => {
            state.loading = false;
            state.currentForm = action.payload;
        });
        builder.addCase(fetchFormById.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to fetch form';
        });

        // Create form
        builder.addCase(createForm.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(createForm.fulfilled, (state, action) => {
            state.loading = false;
            state.forms.push(action.payload);
            state.currentForm = action.payload;
        });
        builder.addCase(createForm.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to create form';
        });

        // Update form
        builder.addCase(updateForm.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(updateForm.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.forms.findIndex(f => f.id === action.payload.id);
            if (index !== -1) {
                state.forms[index] = action.payload;
            }
            if (state.currentForm?.id === action.payload.id) {
                state.currentForm = action.payload;
            }
        });
        builder.addCase(updateForm.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to update form';
        });

        // Delete form
        builder.addCase(deleteForm.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(deleteForm.fulfilled, (state, action) => {
            state.loading = false;
            state.forms = state.forms.filter(f => f.id !== action.payload);
            if (state.currentForm?.id === action.payload) {
                state.currentForm = null;
            }
        });
        builder.addCase(deleteForm.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || 'Failed to delete form';
        });
    },
});

export const { setCurrentForm, clearError } = formsSlice.actions;
export default formsSlice.reducer;
