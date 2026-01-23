// Common types used across slices

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    bpmnXml: string;
    version: number;
    createdAt: string;
    updatedAt: string;
}

export interface Form {
    id: string;
    name: string;
    description?: string;
    fields: FormField[];
    createdAt: string;
    updatedAt: string;
}

export interface FormField {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date';
    required: boolean;
    options?: { label: string; value: string }[];
    defaultValue?: any;
}

export interface Execution {
    id: string;
    workflowId: string;
    workflowName: string;
    businessKey?: string;
    state: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'TERMINATED';
    variables: Record<string, any>;
    startTime: string;
    endTime?: string;
    currentActivities: string[];
}

export interface Task {
    id: string;
    executionId: string;
    activityId: string;
    activityName: string;
    formId?: string;
    assignee?: string;
    status: 'pending' | 'completed';
    createdAt: string;
    completedAt?: string;
}
