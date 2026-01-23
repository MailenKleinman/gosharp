import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    setCurrentWorkflow,
} from './store/slices/workflowsSlice';
import {
    fetchForms,
    createForm,
} from './store/slices/formsSlice';
import {
    fetchExecutions,
    startExecution,
    fetchTasks,
    completeTask,
} from './store/slices/executionsSlice';

export function WorkflowsExample() {
    const dispatch = useAppDispatch();

    // Select data from the store
    const { workflows, currentWorkflow, loading, error } = useAppSelector(
        (state) => state.workflows
    );

    // Fetch workflows on component mount
    useEffect(() => {
        dispatch(fetchWorkflows());
    }, [dispatch]);

    // Create a new workflow
    const handleCreateWorkflow = async () => {
        try {
            await dispatch(createWorkflow({
                name: 'New Workflow',
                description: 'A sample workflow',
                bpmnXml: '<bpmn:definitions>...</bpmn:definitions>',
            })).unwrap();

            console.log('Workflow created successfully!');
        } catch (err) {
            console.error('Failed to create workflow:', err);
        }
    };

    // Update a workflow
    const handleUpdateWorkflow = async (id: string) => {
        try {
            await dispatch(updateWorkflow({
                id,
                data: { name: 'Updated Workflow Name' },
            })).unwrap();

            console.log('Workflow updated successfully!');
        } catch (err) {
            console.error('Failed to update workflow:', err);
        }
    };

    // Delete a workflow
    const handleDeleteWorkflow = async (id: string) => {
        try {
            await dispatch(deleteWorkflow(id)).unwrap();
            console.log('Workflow deleted successfully!');
        } catch (err) {
            console.error('Failed to delete workflow:', err);
        }
    };

    // Set current workflow (no async)
    const handleSelectWorkflow = (workflow: any) => {
        dispatch(setCurrentWorkflow(workflow));
    };

    return (
        <div>
            <h2>Workflows</h2>
            {loading && <p>Loading...</p>}
            {error && <p>Error: {error}</p>}

            <button onClick={handleCreateWorkflow}>Create Workflow</button>

            <ul>
                {workflows.map((workflow) => (
                    <li key={workflow.id}>
                        {workflow.name}
                        <button onClick={() => handleSelectWorkflow(workflow)}>
                            Select
                        </button>
                        <button onClick={() => handleUpdateWorkflow(workflow.id)}>
                            Update
                        </button>
                        <button onClick={() => handleDeleteWorkflow(workflow.id)}>
                            Delete
                        </button>
                    </li>
                ))}
            </ul>

            {currentWorkflow && (
                <div>
                    <h3>Current Workflow: {currentWorkflow.name}</h3>
                    <p>{currentWorkflow.description}</p>
                </div>
            )}
        </div>
    );
}

export function FormsExample() {
    const dispatch = useAppDispatch();
    const { forms, loading, error } = useAppSelector((state) => state.forms);

    useEffect(() => {
        dispatch(fetchForms());
    }, [dispatch]);

    const handleCreateForm = async () => {
        try {
            await dispatch(createForm({
                name: 'Contact Form',
                description: 'A contact form',
                fields: [
                    {
                        id: 'name',
                        name: 'name',
                        label: 'Name',
                        type: 'text',
                        required: true,
                    },
                    {
                        id: 'email',
                        name: 'email',
                        label: 'Email',
                        type: 'text',
                        required: true,
                    },
                ],
            })).unwrap();

            console.log('Form created successfully!');
        } catch (err) {
            console.error('Failed to create form:', err);
        }
    };

    return (
        <div>
            <h2>Forms</h2>
            {loading && <p>Loading...</p>}
            {error && <p>Error: {error}</p>}

            <button onClick={handleCreateForm}>Create Form</button>

            <ul>
                {forms.map((form) => (
                    <li key={form.id}>
                        {form.name} - {form.fields.length} fields
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function ExecutionsExample() {
    const dispatch = useAppDispatch();
    const { executions, tasks, loading, error } = useAppSelector(
        (state) => state.executions
    );

    useEffect(() => {
        // Fetch active executions
        dispatch(fetchExecutions({ state: 'ACTIVE' }));

        // Fetch pending tasks
        dispatch(fetchTasks({ status: 'pending' }));
    }, [dispatch]);

    const handleStartExecution = async (workflowId: string) => {
        try {
            await dispatch(startExecution({
                workflowId,
                businessKey: 'ORDER-123',
                variables: {
                    customerName: 'John Doe',
                    amount: 1500,
                },
            })).unwrap();

            console.log('Execution started successfully!');
        } catch (err) {
            console.error('Failed to start execution:', err);
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        try {
            await dispatch(completeTask({
                taskId,
                data: {
                    approved: true,
                    comments: 'Looks good!',
                },
            })).unwrap();

            console.log('Task completed successfully!');

            // Refresh tasks
            dispatch(fetchTasks({ status: 'pending' }));
        } catch (err) {
            console.error('Failed to complete task:', err);
        }
    };

    return (
        <div>
            <h2>Executions</h2>
            {loading && <p>Loading...</p>}
            {error && <p>Error: {error}</p>}

            <button onClick={() => handleStartExecution('workflow-id-123')}>
                Start Execution
            </button>

            <h3>Active Executions</h3>
            <ul>
                {executions.map((execution) => (
                    <li key={execution.id}>
                        {execution.workflowName} - {execution.state}
                        <br />
                        Business Key: {execution.businessKey}
                    </li>
                ))}
            </ul>

            <h3>Pending Tasks</h3>
            <ul>
                {tasks.map((task) => (
                    <li key={task.id}>
                        {task.activityName}
                        <button onClick={() => handleCompleteTask(task.id)}>
                            Complete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Complete example component combining all three
export function Workflows() {
    return (
        <div style={{ padding: '20px' }}>
            <h1>Redux Usage Examples</h1>

            <WorkflowsExample />
            <hr />

            <FormsExample />
            <hr />

            <ExecutionsExample />
        </div>
    );
}

export default Workflows;
