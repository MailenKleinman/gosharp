import { createSlice, createAsyncThunk, PayloadAction, createEntityAdapter, createSelector, EntityState } from '@reduxjs/toolkit';
import { api } from './dashboardSlice';  // Import your API instance
import { nanoid } from 'nanoid';
import _ from 'lodash';

const generateId = (): string => {
  return nanoid(); // e.g., "V1StGXR8_Z5jdHi6B-myT"
};

// Conditional logic types
export interface ConditionalRule {
  field: string;  // Property key to check
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'minimum' | 'maximum' | 'pattern';
  value: any;
}

export interface ConditionalLogic {
  // Logical operators
  allOf?: ConditionalRule[];  // AND - all must be true
  anyOf?: ConditionalRule[];  // OR - at least one must be true
  oneOf?: ConditionalRule[];  // XOR - exactly one must be true
  not?: ConditionalRule;      // NOT - must be false
}

// Extended JSON Schema field with custom metadata
export interface JSONSchema {

  // Core / Meta
  $id?: string;  // ← Standard (for the schema itself)  "https://myapp.com/schemas/<x-id>", root level only
  $schema?: string; // Schema Version "https://json-schema.org/draft/2020-12/schema"
  $ref?: string; // Reference another schema  "$ref": "#/$defs/address"
  $defs?: string; //| Local schema definitions "$defs": { "address": { ... } }       
  $comment?: string; // Developer comment | "$comment": "TODO: add validation" 
  $anchor?: string; // Named anchor for refs | "$anchor": "my-anchor"
  $dynamicRef?: string; // Dynamic reference | "$dynamicRef": "#node"
  $dynamicAnchor?: string; // Dynamic anchor | "$dynamicAnchor": "node"
  $vocabulary?: string; // Vocabulary declaration | Used in meta - schemas (NOT USED)

  // Metadata / Annotations
  default?: string;
  examples?: string | string[];
  title?: string;
  description?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;

  // Type
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array'; //Data type 
  enum?: string[]; // Allowed values  ["a", "b", "c"]
  const?: any; // Single allowed value

  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex pattern "^[a-z]+$"
  format?: "date-time" | "date" | "time" | "duration" | "email" | "idn-email" | "hostname" | "idn-hostname" | "ipv4" | "ipv6" | "uri" |
  "uri-reference" | "iri" | "iri-reference" | "uuid" | "uri-template" | "json-pointer" | "relative-json-pointer" | "regex" | "date-time"
  contentEncoding?: string // Encoding type  "base64" 
  contentMediaType?: string // MIME type  "image/png" 

  // Number validation
  minimum?: number; // Minimum value (inclusive)
  maximum?: number; //Maximum value (inclusive)
  exclusiveMinimum?: number; //  Minimum (exclusive)
  exclusiveMaximum?: number; // Maximum (exclusive) 
  multipleOf?: number; // Must be multiple of 

  //Array validation
  items?: boolean | JSONSchema; // Schema for items
  prefixItems?: JSONSchema[]; // Tuple validation  
  contains?: JSONSchema; // At least one matches
  minContains?: number; // Min matches for contains
  maxContains?: number; // Max matches for contains
  minItems?: number; // Minimum array length
  maxItems?: number; // Maximum array length
  uniqueItems?: boolean; // All items unique
  unevaluatedItems?: boolean | JSONSchema; // Schema for extra items

  // Object validation
  properties?: { [key: string]: JSONSchema }; // Property schemas
  patternProperties?: { [pattern: string]: JSONSchema | boolean }; //  Regex keyed props "patternProperties": { "^x-": {... } }  
  additionalProperties?: boolean | JSONSchema; // Extra props schema | "additionalProperties": false
  unevaluatedProperties?: boolean | JSONSchema; // Unevaluated props | "unevaluatedProperties": false
  propertyNames?: JSONSchema; // Key name schema | "propertyNames": { "pattern": "^[a-z]+$" }
  required?: string[]; // Required properties | "required": ["name", "email"]
  minProperties?: number; // Min property count | "minProperties": 1
  maxProperties?: number; // Max property count | "maxProperties": 10
  dependentRequired?: Record<string, string[]>// Conditional required | "dependentRequired": { "a": ["b"] }
  dependentSchemas?: Record<string, JSONSchema | boolean>// Conditional schemas | "dependentSchemas": { "a": {... } }

  // Conditionals (if/then/else)
  if?: JSONSchema | boolean;
  then?: JSONSchema | boolean;
  else?: JSONSchema | boolean;

  // Multiple conditionals validations
  allOf?: (JSONSchema | boolean)[]
  anyOf?: (JSONSchema | boolean)[]
  oneOf?: (JSONSchema | boolean)[]
  not?: JSONSchema | boolean

  // Custom extensions (x- prefix is JSON Schema convention for extensions)
  'x-id'?: string;              // Unique identifier for the field
  "x-source-ref"?: string;      // Track original source reference
  "x-source-type"?: "local" | "external" | "reference" | "duplicated"; // Origin source

  'x-parent-id'?: string;

  // UI / Display
  'x-placeholder'?: string; // Input placeholder 
  'x-widget'?: string;  // Override default widget 
  'x-hidden'?: boolean;  //  Hide from form 
  'x-disabled'?: boolean; // Disable input 
  'x-col-span'?: number;  // Grid column width
  'x-help-text'?: string;  // Extra help below field
  'x-icon'?: string; // Icon to show

  // Styling
  'x-class '?: string; // CSS class name 
  'x-style'?: object;  // Inline styles 
  'x-label-style'?: object;  // Label-specific styles 
  'x-input-style'?: object; // Input-specific styles

  // File Handling
  "x-upload"?: boolean,
  "x-accept"?: string; // "image/*",
  "x-max-size"?: number; // 5242880,
  "x-upload-url"?: string; // "/api/upload"

  // Nodes Managment
  'x-favorite'?: boolean; // Mark as favorite
  'x-tags'?: string[];  // Tags for categorization
  'x-priority'?: number; // Ordering priority

  // Versioning
  'x-version'?: string; // Version identifier

  // Audit Info
  'x-created-at'?: string; // Creation timestamp
  'x-updated-at'?: string; // Last update timestamp
  'x-created-by'?: string | number; // Creator identifier
  'x-updated-by'?: string | number; // Last updater identifier

  // Additional metadata
  'x-metadata'?: object; // Custom metadata object
}

export interface FormSchema {

  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | number;
  updatedBy: string | number;

  rootNode: JSONSchema;

}

// Create entity adapter for normalized node storage
const nodesAdapter = createEntityAdapter<JSONSchema>({
  selectId: (node) => node['x-id'] || '',
});

export interface FormEditorState {
  nodes: JSONSchema[];
  forms: FormSchema[];
  editingForm: JSONSchema | null;
  formNodes: EntityState<JSONSchema, string>;  // Normalized nodes using entity adapter
  nodesById: { [id: string]: JSONSchema };  // Keep for backward compatibility during migration
  selectedNodeId: string | null;            // Store only the ID, not the full node
  refForms: JSONSchema[];
}

const initialState: FormEditorState = {
  nodes: [],
  forms: [],
  editingForm: null,
  formNodes: nodesAdapter.getInitialState(),
  nodesById: {},
  selectedNodeId: null,
  refForms: [],
};

// Helper: Flatten the form tree into a flat nodesById dictionary
const flattenNodes = (node: JSONSchema, result: { [id: string]: JSONSchema } = {}): { [id: string]: JSONSchema } => {
  if (node['x-id']) {
    result[node['x-id']] = node;
  }
  if (node.properties) {
    for (const key of Object.keys(node.properties)) {
      const child = node.properties[key];
      if (typeof child === 'object' && child !== null) {
        flattenNodes(child, result);
      }
    }
  }
  return result;
};

// Helper: Find a node by ID in the tree (for components that need the tree reference)
export const findNodeById = (form: JSONSchema | null, nodeId: string | null): JSONSchema | null => {
  if (!form || !nodeId) return null;
  const search = (node: JSONSchema): JSONSchema | null => {
    if (node['x-id'] === nodeId) return node;
    if (node.properties) {
      for (const key of Object.keys(node.properties)) {
        const child = node.properties[key];
        if (typeof child === 'object' && child !== null) {
          const found = search(child);
          if (found) return found;
        }
      }
    }
    return null;
  };
  return search(form);
};

//Ensure all nodes have x-id - returns non-objects (booleans, undefined, null) as-is
export function newNode(node: boolean): boolean;
export function newNode(node: undefined): undefined;
export function newNode(node: null): null;
export function newNode(node: JSONSchema): JSONSchema;
export function newNode(node: JSONSchema | undefined): JSONSchema | undefined;
export function newNode(node: boolean | JSONSchema | undefined): boolean | JSONSchema | undefined;
export function newNode(node: boolean | JSONSchema | undefined | null): boolean | JSONSchema | undefined | null {
  // If node is not an object (boolean, undefined, null, etc.), return as-is
  if (typeof node !== 'object' || node === null || node === undefined) {
    return node;
  }

  const schema = node as JSONSchema;

  // Helper: process object with JSONSchema | boolean values, handles undefined
  function ensureObjIds(obj: { [key: string]: JSONSchema | boolean }): { [key: string]: JSONSchema | boolean };
  function ensureObjIds(obj: undefined): undefined;
  function ensureObjIds(obj: { [key: string]: JSONSchema | boolean } | undefined): { [key: string]: JSONSchema | boolean } | undefined;
  function ensureObjIds(obj: { [key: string]: JSONSchema | boolean } | undefined): { [key: string]: JSONSchema | boolean } | undefined {
    if (!obj) return undefined;
    return Object.entries(obj).reduce((p, x) => {
      const val = x[1];
      p[x[0]] = typeof val === 'boolean' ? val : newNode(val);
      return p;
    }, {} as { [key: string]: JSONSchema | boolean });
  }

  // Helper: process array with JSONSchema | boolean values, handles undefined
  function ensureArrIds(arr: (JSONSchema | boolean)[]): (JSONSchema | boolean)[];
  function ensureArrIds(arr: undefined): undefined;
  function ensureArrIds(arr: (JSONSchema | boolean)[] | undefined): (JSONSchema | boolean)[] | undefined;
  function ensureArrIds(arr: (JSONSchema | boolean)[] | undefined): (JSONSchema | boolean)[] | undefined {
    if (!arr) return undefined;
    return arr.map((item) => typeof item === 'boolean' ? item : newNode(item));
  }

  const xid = schema['x-id'] ?? generateId();
  const $id = "https://myapp.com/schemas/" + xid;

  // Array Validation JSON Objects
  const items = newNode(schema.items);
  const prefixItems = schema.prefixItems?.map((item) => newNode(item));
  const contains = newNode(schema.contains);
  const unevaluatedItems = newNode(schema.unevaluatedItems);

  // Object Validation JSON Objects
  const properties = ensureObjIds(schema.properties) as { [key: string]: JSONSchema } | undefined;
  const patternProperties = ensureObjIds(schema.patternProperties);
  const additionalProperties = newNode(schema.additionalProperties);
  const unevaluatedProperties = newNode(schema.unevaluatedProperties);
  const propertyNames = newNode(schema.propertyNames);
  const dependentSchemas = ensureObjIds(schema.dependentSchemas);

  // Conditionals Validation JSON Objects
  const _if = newNode(schema.if);
  const _then = newNode(schema.then);
  const _else = newNode(schema.else);

  // Multiple conditionals Validation JSON Objects
  const allOf = ensureArrIds(schema.allOf);
  const anyOf = ensureArrIds(schema.anyOf);
  const oneOf = ensureArrIds(schema.oneOf);
  const not = newNode(schema.not);

  const res: JSONSchema = {
    $id,
    "x-id": xid,

    ...schema,

    items,
    prefixItems,
    contains,
    unevaluatedItems,

    properties,
    patternProperties,
    additionalProperties,
    unevaluatedProperties,
    propertyNames,
    dependentSchemas,

    if: _if,
    then: _then,
    else: _else,

    allOf,
    anyOf,
    oneOf,
    not,
  };

  return res;
};

export const newForm = (node: JSONSchema | null, refType: string): JSONSchema => {

  const createNode = (node: JSONSchema,): JSONSchema => {

    const dfltForm: JSONSchema = {
      "x-source-type": "local" as const,
      'x-widget': 'root' as const,

      type: 'object' as const,
      title: 'Observation Tool Title',
      properties: {
        section0: {
          type: 'object' as const,
          title: 'Section 1',
          description: 'Section 1 Description',
          'x-widget': 'section' as const,
          properties: {
            sampleQuestion1: {
              type: 'string' as const,
              title: 'Sample Question 1',
              description: 'This is a sample question in Section 1',
              'x-widget': 'header' as const,
              'x-placeholder': 'Enter your answer here...',
            },
          }
        },
        section1: {
          type: 'object' as const,
          title: 'Section 2',
          description: 'Section 2 Description',
          'x-widget': 'section' as const,
        }
      },
      ...node,
    }

    return newNode(dfltForm);
  };

  return createNode(node ?? {});
};

export const fetchNodes = createAsyncThunk(
  'formEditor/fetchNodes',
  async (_, { rejectWithValue }) => {
    console.log('Fetching nodes...');
    try {
      const response = await api.get('/api/json-schema-nodes');
      return response.data as JSONSchema[];
    } catch (error: any) {
      console.error('Error fetching json schema nodes:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch nodes');
    } finally {
      console.log('Fetch nodes attempt finished.');
    }
  }
);

export const fetchForms = createAsyncThunk(
  'formEditor/fetchForms',
  async (_, { rejectWithValue }) => {
    console.log('Fetching forms...');
    try {
      const response = await api.get('/api/forms');
      return response.data as FormSchema[];
    } catch (error: any) {
      console.error('Error fetching forms:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch forms');
    } finally {
      console.log('Fetch forms attempt finished.');
    }
  }
);

export const loadFormByRootNodeId = createAsyncThunk(
  'formEditor/loadFormByRootNodeId',
  async (rootNodeId: string, { rejectWithValue }) => {
    try {
      // Fetch all nodes
      const response = await api.get('/api/json-schema-nodes');
      const allNodes = response.data as JSONSchema[];

      // Build a map of nodes by their x-id
      const nodesMap: { [id: string]: JSONSchema } = {};
      allNodes.forEach(node => {
        if (node['x-id']) {
          nodesMap[node['x-id']] = node;
        }
      });

      // Find the root node
      const rootNode = nodesMap[rootNodeId];
      if (!rootNode) {
        return rejectWithValue('Root node not found');
      }

      // Reconstruct the tree by finding children based on x-parent-id
      const buildTree = (nodeId: string): JSONSchema => {
        const node = { ...nodesMap[nodeId] };

        // Find all children of this node
        const children = allNodes.filter(n => n['x-parent-id'] === nodeId);

        if (children.length > 0) {
          node.properties = node.properties || {};
          children.forEach(child => {
            if (child['x-id']) {
              node.properties![child['x-id']] = buildTree(child['x-id']);
            }
          });
        }

        return node;
      };

      const reconstructedForm = buildTree(rootNodeId);
      return reconstructedForm;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load form');
    }
  }
);

export const saveEditingFormAndNodes = createAsyncThunk(
  'formEditor/saveEditingFormAndNodes',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { formEditor: FormEditorState };
      const { editingForm } = state.formEditor;

      if (!editingForm) {
        return rejectWithValue('No form to save');
      }

      // 1. Save all nodes to json-schema-nodes
      // Use flattenNodes to get the current state from the editingForm tree
      // This ensures we save all nodes including newly added/edited ones
      const currentNodes = flattenNodes(editingForm);
      const nodes = Object.values(currentNodes);
      await api.post('/api/json-schema-nodes', nodes);

      // 2. Save/update the form reference (with rootNodeId pointing to the editingForm's x-id)
      const formReference = {
        id: editingForm['x-id'] || editingForm.$id,
        name: editingForm.title || 'Untitled Form',
        description: editingForm.description || '',
        rootNodeId: editingForm['x-id'],
      };

      // Check if form already exists
      const existingForms = JSON.parse(localStorage.getItem('forms') || '[]');
      const existingIndex = existingForms.findIndex((f: any) => f.id === formReference.id);

      if (existingIndex !== -1) {
        // Update existing form
        existingForms[existingIndex] = {
          ...existingForms[existingIndex],
          ...formReference,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Add new form
        existingForms.push({
          ...formReference,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      localStorage.setItem('forms', JSON.stringify(existingForms));

      return { form: formReference, nodes };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to save form');
    }
  }
);

export const deleteForm = createAsyncThunk(
  'formEditor/deleteForm',
  async (xid: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/forms/${xid}`);
      return xid;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete form');
    }
  }
);

const formEditorSlice = createSlice({
  name: 'formEditor',
  initialState,
  reducers: {

    setEditingForm: (state, action: PayloadAction<JSONSchema | null>) => {
      state.editingForm = action.payload;
      // Populate both nodesById (legacy) and formNodes (entity adapter)
      const flatNodes = action.payload ? flattenNodes(action.payload) : {};
      state.nodesById = flatNodes;
      // Set all nodes in entity adapter
      nodesAdapter.setAll(state.formNodes, Object.values(flatNodes));
    },

    // Update only top-level form properties (title, description) without rebuilding nodes
    updateEditingFormMeta: (state, action: PayloadAction<{ key: string; value: any }>) => {
      if (state.editingForm) {
        const { key, value } = action.payload;
        (state.editingForm as any)[key] = value;
      }
    },

    setSelectedNode: (state, action: PayloadAction<JSONSchema | string | null>) => {
      // Accept either a full node object, a string ID, or null
      if (action.payload === null) {
        state.selectedNodeId = null;
      } else if (typeof action.payload === 'string') {
        state.selectedNodeId = action.payload;
      } else {
        state.selectedNodeId = action.payload['x-id'] || null;
      }
    },

    // New action using entity adapter - updates only the specific node
    updateNode: (state, action: PayloadAction<{ nodeId: string; changes: Partial<JSONSchema> }>) => {
      const { nodeId, changes } = action.payload;

      if (!nodeId) {
        console.warn('No node ID provided for update');
        return;
      }

      // Update in entity adapter (efficient, only updates specific node)
      nodesAdapter.updateOne(state.formNodes, { id: nodeId, changes });

      // Also update in nodesById for backward compatibility
      const nodeToUpdate = state.nodesById[nodeId];
      if (nodeToUpdate) {
        Object.assign(nodeToUpdate, changes);
      }
    },

    // Legacy action - kept for backward compatibility (optimized for single-property updates)
    updateEditingFormNode: (state, action: PayloadAction<{ node: JSONSchema | string, key: keyof JSONSchema, value: JSONSchema[keyof JSONSchema] }>) => {
      const { node, key, value } = action.payload;
      const nodeId = typeof node === "string" ? node : node['x-id'];

      if (!nodeId) {
        console.warn('No node ID provided for update');
        return;
      }

      // Update directly in nodesById - since these are references to the same objects
      // in editingForm tree, the tree is updated automatically (Immer handles immutability)
      const nodeToUpdate = state.nodesById[nodeId];
      if (nodeToUpdate) {
        (nodeToUpdate as any)[key] = value;
        // Also update in entity adapter to keep in sync (but nodesById is the source of truth for rendering)
        nodesAdapter.updateOne(state.formNodes, { id: nodeId, changes: { [key]: value } as Partial<JSONSchema> });
      } else {
        console.warn('Node not found in nodesById:', nodeId);
      }
    },
    appendEditingFormNode: (state, action: PayloadAction<{ parentNode: JSONSchema | string, node: JSONSchema, pos?: number }>) => {
      const { parentNode, node, pos } = action.payload;
      const parentNodeId = typeof (parentNode) == "string" ? node : node['x-id'];
      let parentNodeFound = false;

      const appendNodeRecursively = (currentNode: JSONSchema): JSONSchema => {
        if (currentNode['x-id'] === parentNodeId) {
          parentNodeFound = true;
          if (currentNode.type === "object") {

            let propertiesKV = Object.entries(currentNode?.properties || {});
            let _pos = pos ?? propertiesKV.length;
            propertiesKV = propertiesKV.slice(0, _pos).concat([node["x-id"], node], propertiesKV.slice(_pos));
            currentNode.properties = propertiesKV.reduce((p, x, i) => {
              x[1]["x-priority"] = i * 100;
              p[x[0]] = x[1];
              return p;
            }, {} as { [key: string]: JSONSchema })
          } else {
            console.warn(`Nodes can only be appended to "object" type parents (parent type: ${currentNode.type})!!!`, action.payload);
          }
          return { ...currentNode }
        } else {
          if (currentNode.type === "array" || currentNode.type === "object") {
            Object.entries(currentNode?.properties || {}).forEach(([k, v]) => (currentNode.properties || {})[k] = appendNodeRecursively(v));
          }
          return { ...currentNode };
        };
      };

      if (state.editingForm) {
        const updatedEditingForm = appendNodeRecursively({ ...state.editingForm });
        if (!parentNodeFound)
          console.warn('Parent node not found!!!', action.payload);
        state.editingForm = updatedEditingForm;
        // Re-populate nodesById after tree modification
        const flatNodes = flattenNodes(updatedEditingForm);
        state.nodesById = flatNodes;
        // Sync entity adapter
        nodesAdapter.setAll(state.formNodes, Object.values(flatNodes));
      } else {
        console.warn('No editing form to update node property!!!', action.payload);
      }
    },
    removeEditingFormNode: (state, action: PayloadAction<{ parentNode: JSONSchema | string, childNode: JSONSchema | string }>) => {
      const { parentNode, childNode } = action.payload;
      const parentNodeId = typeof (parentNode) == "string" ? parentNode : parentNode['x-id'];
      const childNodeId = typeof (childNode) == "string" ? childNode : childNode['x-id'];
      let parentNodeFound = false;
      let childNodeFound = false;

      const appendNodeRecursively = (currentNode: JSONSchema): JSONSchema => {
        if (currentNode['x-id'] === parentNodeId) {
          parentNodeFound = true;
          if (currentNode.type === "object") {
            let propertiesKV = Object.entries(currentNode?.properties || {});
            const childIndex = propertiesKV.findIndex(x => x[1]['x-id'] === childNodeId)
            if (childIndex === -1) {
              console.warn('Child node not found!!!', action.payload);
            } else {
              childNodeFound = true;
              propertiesKV.splice(childIndex, 1);
            }
            currentNode.properties = propertiesKV.reduce((p, x, i) => {
              x[1]["x-priority"] = i * 100;
              p[x[0]] = x[1];
              return p;
            }, {} as { [key: string]: JSONSchema })
          } else {
            console.warn(`Nodes can only be deleted from "object" type parents (parent type: ${currentNode.type})!!!`, action.payload);
          }
          return { ...currentNode }
        } else {
          if (currentNode.type === "array" || currentNode.type === "object") {
            Object.entries(currentNode?.properties || {}).forEach(([k, v]) => (currentNode.properties || {})[k] = appendNodeRecursively(v));
          }
          return { ...currentNode };
        };
      };

      if (state.editingForm) {
        const updatedEditingForm = appendNodeRecursively({ ...state.editingForm });
        if (!parentNodeFound)
          console.warn('Parent node not found!!!', action.payload);
        state.editingForm = updatedEditingForm;
        // Re-populate nodesById after tree modification
        const flatNodes = flattenNodes(updatedEditingForm);
        state.nodesById = flatNodes;
        // Sync entity adapter
        nodesAdapter.setAll(state.formNodes, Object.values(flatNodes));
      } else {
        console.warn('No editing form to delete node property!!!', action.payload);
      }
    },

    // Add a new tab without rebuilding all existing nodes
    addTab: (state, action: PayloadAction<{ tabKey: string, tab: JSONSchema }>) => {
      const { tabKey, tab } = action.payload;
      if (!state.editingForm) {
        console.warn('No editing form to add tab to');
        return;
      }

      // Add to editingForm tree structure
      if (!state.editingForm.properties) {
        state.editingForm.properties = {};
      }
      state.editingForm.properties[tabKey] = tab;

      // Add only the new tab node to nodesById (don't rebuild existing nodes)
      const tabId = tab['x-id'];
      if (tabId) {
        state.nodesById[tabId] = tab;
        // Also add to entity adapter
        nodesAdapter.addOne(state.formNodes, tab);
      }

      // Also add any child nodes (e.g., default header) to nodesById
      if (tab.properties) {
        Object.values(tab.properties).forEach((childNode) => {
          if (typeof childNode === 'object' && childNode !== null && 'x-id' in childNode) {
            const childId = childNode['x-id'] as string;
            if (childId) {
              state.nodesById[childId] = childNode as JSONSchema;
              nodesAdapter.addOne(state.formNodes, childNode as JSONSchema);
            }
          }
        });
      }
    },

    // Remove a tab without rebuilding all existing nodes
    removeTab: (state, action: PayloadAction<{ tabId: string }>) => {
      const { tabId } = action.payload;
      if (!state.editingForm?.properties) {
        console.warn('No editing form or properties to remove tab from');
        return;
      }

      // Find the property key for this tab
      const tabKey = Object.keys(state.editingForm.properties).find(
        key => state.editingForm!.properties![key]['x-id'] === tabId
      );

      if (!tabKey) {
        console.warn('Tab not found:', tabId);
        return;
      }

      // Get all descendant IDs before removing
      const tabNode = state.editingForm.properties[tabKey];
      const descendantIds: string[] = [];
      const collectDescendantIds = (node: JSONSchema) => {
        if (node['x-id']) descendantIds.push(node['x-id']);
        if (node.properties) {
          Object.values(node.properties).forEach(collectDescendantIds);
        }
      };
      collectDescendantIds(tabNode);

      // Remove from editingForm tree
      delete state.editingForm.properties[tabKey];

      // Remove tab and all descendants from nodesById
      descendantIds.forEach(id => {
        delete state.nodesById[id];
      });

      // Remove from entity adapter
      nodesAdapter.removeMany(state.formNodes, descendantIds);
    },

    // Add a node to a parent without rebuilding all existing nodes
    addNode: (state, action: PayloadAction<{ parentId: string, node: JSONSchema }>) => {
      const { parentId, node } = action.payload;
      if (!state.editingForm) {
        console.warn('No editing form to add node to');
        return;
      }

      const nodeId = node['x-id'];
      if (!nodeId) {
        console.warn('Node must have an x-id');
        return;
      }

      // Helper to recursively find and update parent
      const addToParent = (currentNode: JSONSchema): JSONSchema => {
        if (currentNode['x-id'] === parentId) {
          const newProperties = { ...currentNode.properties };
          newProperties[nodeId] = node;
          return { ...currentNode, properties: newProperties };
        }
        if (currentNode.properties) {
          const updatedProperties: { [key: string]: JSONSchema } = {};
          for (const key of Object.keys(currentNode.properties)) {
            const child = currentNode.properties[key];
            if (typeof child === 'object' && child !== null) {
              updatedProperties[key] = addToParent(child);
            } else {
              updatedProperties[key] = child;
            }
          }
          return { ...currentNode, properties: updatedProperties };
        }
        return currentNode;
      };

      // Update editingForm tree structure
      state.editingForm = addToParent(state.editingForm);

      // Add only the new node to nodesById (don't rebuild existing nodes)
      state.nodesById[nodeId] = node;

      // Also update the parent node's properties in nodesById
      const parentNode = state.nodesById[parentId];
      if (parentNode) {
        state.nodesById[parentId] = {
          ...parentNode,
          properties: {
            ...parentNode.properties,
            [nodeId]: node
          }
        };
        // Update parent in entity adapter too
        nodesAdapter.updateOne(state.formNodes, {
          id: parentId,
          changes: {
            properties: {
              ...parentNode.properties,
              [nodeId]: node
            }
          }
        });
      }

      // Also add to entity adapter
      nodesAdapter.addOne(state.formNodes, node);
    }

  },

  extraReducers: (builder) => {

    builder.addCase(fetchNodes.fulfilled, (state, action) => {
      state.nodes = action.payload;
    });

    builder.addCase(fetchForms.fulfilled, (state, action) => {
      state.forms = action.payload;
    });

    builder.addCase(saveEditingFormAndNodes.fulfilled, (state, action) => {
      // Form saved successfully
    });

    builder.addCase(loadFormByRootNodeId.fulfilled, (state, action) => {
      // Set the loaded form as the editing form
      state.editingForm = action.payload;
      // Populate nodesById from the reconstructed tree
      const flatNodes = flattenNodes(action.payload);
      state.nodesById = flatNodes;
      nodesAdapter.setAll(state.formNodes, Object.values(flatNodes));
    });

    builder.addCase(deleteForm.fulfilled, (state, action) => {
      // Form deleted successfully
    });
  }
});

export const { setEditingForm, updateEditingFormMeta, setSelectedNode, updateNode, updateEditingFormNode, appendEditingFormNode, removeEditingFormNode, addTab, removeTab, addNode } = formEditorSlice.actions;

export default formEditorSlice.reducer;

// ============================================
// MEMOIZED SELECTORS (using entity adapter)
// ============================================

// Type for the root state - you may need to import this from your store
type RootState = { formEditor: FormEditorState };

// Base selector for formNodes state
const selectFormNodes = (state: RootState) => state.formEditor.formNodes;

// Entity adapter selectors - memoized by default
export const {
  selectById: selectNodeById,
  selectAll: selectAllNodes,
  selectEntities: selectNodeEntities,
  selectIds: selectNodeIds,
  selectTotal: selectTotalNodes,
} = nodesAdapter.getSelectors(selectFormNodes);

// Memoized selector for children by parent ID
export const selectChildrenByParentId = createSelector(
  [selectAllNodes, (_state: RootState, parentId: string) => parentId],
  (nodes, parentId) => nodes.filter(node => node['x-parent-id'] === parentId)
);

// Memoized selector for top-level nodes (no parent)
export const selectTopLevelNodes = createSelector(
  [selectAllNodes],
  (nodes) => nodes.filter(node => !node['x-parent-id'])
);

// Memoized selector for nodes in a specific section (by section x-id)
export const selectNodesBySection = createSelector(
  [selectAllNodes, (_state: RootState, sectionId: string) => sectionId],
  (nodes, sectionId) => {
    // Find all nodes that belong to this section
    // A node belongs to a section if it's directly in the section or has an ancestor in it
    return nodes.filter(node => {
      // Check if node is a direct child of the section
      if (!node['x-parent-id']) return false;
      // For now, just return nodes that exist - the filtering logic depends on your hierarchy
      return true;
    });
  }
);

// Memoized selector for the selected node
export const selectSelectedNode = createSelector(
  [selectNodeEntities, (state: RootState) => state.formEditor.selectedNodeId],
  (entities, selectedId) => selectedId ? entities[selectedId] : null
);

/**
 * USAGE EXAMPLES - ASYNC ACTIONS
 * ================================
 *
 * Example 1: Fetch all forms
 * ---------------------------
 * import { useDispatch, useSelector } from 'react-redux';
 * import { fetchForms } from './store/slices/formEditorSlice';
 *
 * function MyComponent() {
 *   const dispatch = useDispatch();
 *   const { forms, loading, error } = useSelector(state => state.formEditor);
 *
 *   useEffect(() => {
 *     dispatch(fetchForms());
 *   }, [dispatch]);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       {forms.map(form => (
 *         <div key={form['x-id']}>{form.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 *
 * Example 2: Create a new form
 * -----------------------------
 * const handleCreateForm = async () => {
 *   const newForm: JSONSchemaField = {
 *     title: "Customer Survey",
 *     type: "object",
 *     properties: {
 *       name: {
 *         type: "string",
 *         title: "What is your name?",
 *         'x-id': 'q1',
 *         'x-position': 1
 *       },
 *       email: {
 *         type: "string",
 *         title: "What is your email?",
 *         'x-id': 'q2',
 *         'x-position': 2,
 *         pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
 *       }
 *     },
 *     required: ["name", "email"]
 *   };
 *
 *   try {
 *     const result = await dispatch(createForm(newForm)).unwrap();
 *     console.log('Form created:', result);
 *     // Navigate to the new form or show success message
 *   } catch (error) {
 *     console.error('Failed to create form:', error);
 *   }
 * };
 *
 * Example 3: Update a form
 * -------------------------
 * const handleUpdateForm = async (formId: string) => {
 *   const updates = {
 *     title: "Updated Survey Title",
 *     properties: {
 *       ...existingForm.properties,
 *       phone: {
 *         type: "string",
 *         title: "Phone number",
 *         'x-id': 'q3',
 *         'x-position': 3
 *       }
 *     }
 *   };
 *
 *   try {
 *     await dispatch(updateForm({ id: formId, data: updates })).unwrap();
 *     console.log('Form updated successfully');
 *   } catch (error) {
 *     console.error('Failed to update form:', error);
 *   }
 * };
 *
 * Example 4: Delete a form
 * -------------------------
 * const handleDeleteForm = async (formId: string) => {
 *   if (window.confirm('Are you sure you want to delete this form?')) {
 *     try {
 *       await dispatch(deleteForm(formId)).unwrap();
 *       console.log('Form deleted successfully');
 *     } catch (error) {
 *       console.error('Failed to delete form:', error);
 *     }
 *   }
 * };
 *
 * Example 5: Using loading states
 * --------------------------------
 * function FormEditor() {
 *   const dispatch = useDispatch();
 *   const {
 *     forms,
 *     loading,
 *     fetchingForms,
 *     creatingForm,
 *     updatingForm,
 *     error
 *   } = useSelector(state => state.formEditor);
 *
 *   return (
 *     <div>
 *       {fetchingForms && <Spinner message="Loading forms..." />}
 *       {creatingForm && <Spinner message="Creating form..." />}
 *       {updatingForm && <Spinner message="Saving changes..." />}
 *       {error && <Alert severity="error">{error}</Alert>}
 *
 *       <Button
 *         onClick={() => dispatch(fetchForms())}
 *         disabled={loading}
 *       >
 *         Refresh Forms
 *       </Button>
 *     </div>
 *   );
 * }
 *
 * Example 6: Fetch single form by ID
 * -----------------------------------
 * const handleLoadForm = async (formId: string) => {
 *   try {
 *     const form = await dispatch(fetchFormById(formId)).unwrap();
 *     console.log('Form loaded:', form);
 *     // The form is automatically added to state.forms and selected
 *   } catch (error) {
 *     console.error('Failed to load form:', error);
 *   }
 * };
 *
 * Example 7: Using with React Query (alternative approach)
 * ---------------------------------------------------------
 * import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 *
 * function FormsList() {
 *   const queryClient = useQueryClient();
 *
 *   // Fetch forms
 *   const { data: forms, isLoading } = useQuery({
 *     queryKey: ['forms'],
 *     queryFn: async () => {
 *       const response = await api.get('/api/json-schema-nodes');
 *       return response.data;
 *     }
 *   });
 *
 *   // Create form mutation
 *   const createMutation = useMutation({
 *     mutationFn: async (newForm: JSONSchemaField) => {
 *       const response = await api.post('/api/json-schema-nodes', newForm);
 *       return response.data;
 *     },
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: ['forms'] });
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       {isLoading && <Spinner />}
 *       <button onClick={() => createMutation.mutate(newFormData)}>
 *         Create Form
 *       </button>
 *     </div>
 *   );
 * }
 *
 * ================================
 * USAGE EXAMPLES - SYNC ACTIONS
 * ================================
 *
 * Example 1: Add a simple question with ID
 * -----------------------------------------
 * dispatch(addField({
 *   sectionIndex: 0,
 *   fieldKey: 'age',
 *   field: {
 *     type: 'number',
 *     title: 'What is your age?',
 *     'x-id': 'q3',
 *     'x-position': 3,
 *     minimum: 0,
 *     maximum: 120
 *   }
 * }));
 *
 * Example 2: Add a question with subquestions using conditionals
 * ---------------------------------------------------------------
 * // First, add the main question
 * dispatch(addField({
 *   sectionIndex: 0,
 *   fieldKey: 'hasPurchased',
 *   field: {
 *     type: 'boolean',
 *     title: 'Have you purchased our product?',
 *     'x-id': 'q4',
 *     'x-position': 4
 *   }
 * }));
 *
 * // Then add conditional to show subquestions
 * dispatch(setFieldConditional({
 *   sectionIndex: 0,
 *   fieldKey: 'hasPurchased',
 *   conditional: {
 *     if: {
 *       properties: {
 *         hasPurchased: { const: true }
 *       }
 *     },
 *     then: {
 *       properties: {
 *         purchaseDate: {
 *           type: 'string',
 *           title: 'When did you purchase?',
 *           'x-id': 'q4_sub1',
 *           'x-parent-id': 'q4'
 *         },
 *         rating: {
 *           type: 'number',
 *           title: 'Rate the product (1-5)',
 *           'x-id': 'q4_sub2',
 *           'x-parent-id': 'q4',
 *           minimum: 1,
 *           maximum: 5
 *         }
 *       }
 *     }
 *   }
 * }));
 *
 * Example 3: Add custom conditional logic
 * ----------------------------------------
 * dispatch(setCustomConditional({
 *   sectionIndex: 0,
 *   fieldKey: 'specialOffer',
 *   conditionals: {
 *     allOf: [
 *       { field: 'age', operator: 'greater_than', value: 18 },
 *       { field: 'country', operator: 'equals', value: 'USA' }
 *     ]
 *   }
 * }));
 *
 * Example 4: Add metadata to a field
 * -----------------------------------
 * dispatch(setFieldMetadata({
 *   sectionIndex: 0,
 *   fieldKey: 'email',
 *   metadata: {
 *     id: 'q2',
 *     position: 2,
 *     component: 'email-input',
 *     validation: {
 *       custom: 'email-validator'
 *     }
 *   }
 * }));
 *
 * Example 5: Complete form with conditionals
 * -------------------------------------------
 * const completeSchema: JSONSchemaField = {
 *   title: "Customer Survey",
 *   type: "object",
 *   properties: {
 *     serviceType: {
 *       type: "string",
 *       title: "Which service are you interested in?",
 *       enum: ["Consulting", "Training", "Support"],
 *       'x-id': 'q1',
 *       'x-position': 1
 *     }
 *   },
 *   allOf: [
 *     {
 *       if: {
 *         properties: { serviceType: { const: "Consulting" } }
 *       },
 *       then: {
 *         properties: {
 *           projectScope: {
 *             type: "string",
 *             title: "Project scope?",
 *             enum: ["Small", "Medium", "Large"],
 *             'x-id': 'q1_consulting',
 *             'x-parent-id': 'q1'
 *           }
 *         }
 *       }
 *     },
 *     {
 *       if: {
 *         properties: { serviceType: { const: "Training" } }
 *       },
 *       then: {
 *         properties: {
 *           participants: {
 *             type: "number",
 *             title: "Number of participants",
 *             'x-id': 'q1_training',
 *             'x-parent-id': 'q1',
 *             minimum: 1
 *           }
 *         }
 *       }
 *     }
 *   ]
 * };
 *
 * dispatch(addSection(completeSchema));
 */
