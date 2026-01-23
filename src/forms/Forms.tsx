import { useEffect } from 'react';
import { Box, IconButton, Button } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchForms,
    deleteForm,
    setCurrentForm,
} from '../store/slices/formsSlice';
import { loadFormByRootNodeId } from '../store/slices/formEditorSlice';
import type { Form } from '../store/types';

// Extended form type that includes rootNodeId from our save structure
interface FormWithRoot extends Form {
    rootNodeId?: string;
}

export function Forms() {
    const dispatch = useAppDispatch();
    const { forms, loading, error } = useAppSelector((state) => state.forms);

    console.log('Forms component - forms:', forms, 'loading:', loading, 'error:', error);

    useEffect(() => {
        dispatch(fetchForms());
    }, [dispatch]);

    const handleEdit = (form: FormWithRoot) => {
        dispatch(setCurrentForm(form));
        // Load the form by its rootNodeId to open it in the editor
        if (form.rootNodeId) {
            dispatch(loadFormByRootNodeId(form.rootNodeId));
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this observation tool?')) {
            try {
                await dispatch(deleteForm(id)).unwrap();
                console.log('Form deleted successfully');
            } catch (error) {
                console.error('Failed to delete form:', error);
            }
        }
    };

    const handleCreate = () => {
        // TODO: Open create dialog
        console.log('Create new form');
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 200,
        },
        {
            field: 'id',
            headerName: 'ID',
            flex: 1,
            minWidth: 150,
        },
        {
            field: 'fields',
            headerName: 'Fields',
            width: 100,
            valueGetter: (_value, row) => {
                return Array.isArray(row.fields) ? row.fields.length : 0;
            },
        },
        {
            field: 'createdAt',
            headerName: 'Created At',
            flex: 1,
            minWidth: 180,
            valueFormatter: (value) => {
                return value ? new Date(value).toLocaleString() : '';
            },
        },
        {
            field: 'updatedAt',
            headerName: 'Updated At',
            flex: 1,
            minWidth: 180,
            valueFormatter: (value) => {
                return value ? new Date(value).toLocaleString() : '';
            },
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: (params: GridRenderCellParams<Form>) => (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEdit(params.row)}
                        aria-label="edit"
                    >
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(params.row.id)}
                        aria-label="delete"
                    >
                        <DeleteIcon />
                    </IconButton>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            overflow: 'hidden',
            boxSizing: 'border-box'
        }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 500 }}>Observation Tools</h2>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreate}
                >
                    Create Observation Tool
                </Button>
            </Box>

            <Box sx={{
                flexGrow: 1,
                width: '100%',
                minHeight: 0,
                overflow: 'hidden'
            }}>
                <DataGrid
                    rows={forms}
                    columns={columns}
                    loading={loading}
                    pageSizeOptions={[5, 10, 25, 50]}
                    initialState={{
                        pagination: {
                            paginationModel: { pageSize: 10, page: 0 },
                        },
                    }}
                    disableRowSelectionOnClick
                    sx={{
                        '& .MuiDataGrid-cell:focus': {
                            outline: 'none',
                        },
                    }}
                />
            </Box>
        </Box>
    );
}

export default Forms;
