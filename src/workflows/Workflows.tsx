import { useEffect } from 'react';
import { Box, IconButton, Button } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    fetchWorkflows,
    deleteWorkflow,
    setCurrentWorkflow,
} from '../store/slices/workflowsSlice';
import type { Workflow } from '../store/types';

export function Workflows() {
    const dispatch = useAppDispatch();
    const { workflows, loading } = useAppSelector((state) => state.workflows);

    useEffect(() => {
        dispatch(fetchWorkflows());
    }, [dispatch]);

    const handleEdit = (workflow: Workflow) => {
        dispatch(setCurrentWorkflow(workflow));
        // TODO: Open edit dialog or navigate to editor
        console.log('Edit workflow:', workflow);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this workflow?')) {
            try {
                await dispatch(deleteWorkflow(id)).unwrap();
                console.log('Workflow deleted successfully');
            } catch (error) {
                console.error('Failed to delete workflow:', error);
            }
        }
    };

    const handleCreate = () => {
        // TODO: Open create dialog
        console.log('Create new workflow');
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
            renderCell: (params: GridRenderCellParams<Workflow>) => (
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
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 500 }}>Workflows</h2>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreate}
                >
                    Create Workflow
                </Button>
            </Box>

            <Box sx={{
                flexGrow: 1,
                width: '100%',
                minHeight: 0,
                overflow: 'hidden'
            }}>
                <DataGrid
                    rows={workflows}
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

export default Workflows;
