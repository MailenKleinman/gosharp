import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSelectedTab,
  setBreadcrumbTitle,
  setIsEditingBreadcrumb,
  setOpenPreviewModal,
  setMultipleChoiceSettings,
  addTab,
  deleteTab
} from '../store/slices/formEditorSlice';
import { Box, Tabs, Tab, Button, TextField, Dialog } from '@mui/material';

/**
 * EXAMPLE: This component shows how to migrate from local state (useState) to Redux
 *
 * BEFORE (using useState):
 * ----------------------
 * const [selectedTab, setSelectedTab] = useState(1);
 * const [breadcrumbTitle, setBreadcrumbTitle] = useState('My tool test');
 * const [isEditingBreadcrumb, setIsEditingBreadcrumb] = useState(false);
 * const [openPreviewModal, setOpenPreviewModal] = useState(false);
 *
 * AFTER (using Redux):
 * --------------------
 * See code below
 */

function ReduxExample() {
  // ============================================
  // STEP 1: Get state from Redux store
  // ============================================
  // Use useSelector hook to access Redux state
  // The state path is: store.formEditor.[property]

  const selectedTab = useSelector(state => state.formEditor.selectedTab);
  const tabs = useSelector(state => state.formEditor.tabs);
  const breadcrumbTitle = useSelector(state => state.formEditor.breadcrumbTitle);
  const isEditingBreadcrumb = useSelector(state => state.formEditor.isEditingBreadcrumb);
  const openPreviewModal = useSelector(state => state.formEditor.openPreviewModal);
  const multipleChoiceSettings = useSelector(state => state.formEditor.multipleChoiceSettings);

  // ============================================
  // STEP 2: Get dispatch function to update state
  // ============================================
  const dispatch = useDispatch();

  // ============================================
  // STEP 3: Update event handlers to use dispatch
  // ============================================

  // BEFORE: setSelectedTab(newValue)
  // AFTER: dispatch(setSelectedTab(newValue))
  const handleTabChange = (event, newValue) => {
    dispatch(setSelectedTab(newValue));
  };

  // BEFORE: setBreadcrumbTitle(e.target.value)
  // AFTER: dispatch(setBreadcrumbTitle(e.target.value))
  const handleBreadcrumbChange = (e) => {
    dispatch(setBreadcrumbTitle(e.target.value));
  };

  // Toggle editing mode
  const handleEditBreadcrumb = () => {
    dispatch(setIsEditingBreadcrumb(true));
  };

  const handleSaveBreadcrumb = () => {
    dispatch(setIsEditingBreadcrumb(false));
  };

  // BEFORE: setOpenPreviewModal(true)
  // AFTER: dispatch(setOpenPreviewModal(true))
  const handleOpenPreview = () => {
    dispatch(setOpenPreviewModal(true));
  };

  const handleClosePreview = () => {
    dispatch(setOpenPreviewModal(false));
  };

  // Example: Update nested object (multiple choice settings)
  // BEFORE: setMultipleChoiceSettings({ ...multipleChoiceSettings, required: true })
  // AFTER: dispatch(setMultipleChoiceSettings({ required: true }))
  const handleToggleRequired = () => {
    dispatch(setMultipleChoiceSettings({
      required: !multipleChoiceSettings.required
    }));
  };

  // Example: Add a new tab
  const handleAddTab = () => {
    const newTab = {
      id: tabs.length + 1,
      label: `Section ${tabs.length + 1}`
    };
    dispatch(addTab(newTab));
  };

  // Example: Delete a tab
  const handleDeleteTab = (tabId) => {
    dispatch(deleteTab(tabId));
  };

  return (
    <Box sx={{ padding: 2 }}>
      <h2>Redux State Management Example</h2>

      {/* Example 1: Tabs with Redux */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              value={tab.id}
            />
          ))}
        </Tabs>
        <Button onClick={handleAddTab} variant="outlined" size="small" sx={{ mt: 1 }}>
          Add Tab
        </Button>
      </Box>

      {/* Example 2: Editable Breadcrumb with Redux */}
      <Box sx={{ mb: 2 }}>
        <h3>Breadcrumb Title:</h3>
        {isEditingBreadcrumb ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              autoFocus
              value={breadcrumbTitle}
              onChange={handleBreadcrumbChange}
              size="small"
            />
            <Button onClick={handleSaveBreadcrumb} variant="contained" size="small">
              Save
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{breadcrumbTitle}</span>
            <Button onClick={handleEditBreadcrumb} variant="text" size="small">
              Edit
            </Button>
          </Box>
        )}
      </Box>

      {/* Example 3: Multiple Choice Settings with Redux */}
      <Box sx={{ mb: 2 }}>
        <h3>Multiple Choice Settings:</h3>
        <label>
          <input
            type="checkbox"
            checked={multipleChoiceSettings.required}
            onChange={handleToggleRequired}
          />
          Required
        </label>
        <p>Current settings: {JSON.stringify(multipleChoiceSettings)}</p>
      </Box>

      {/* Example 4: Modal with Redux */}
      <Box sx={{ mb: 2 }}>
        <Button onClick={handleOpenPreview} variant="contained">
          Open Preview Modal
        </Button>
        <Dialog open={openPreviewModal} onClose={handleClosePreview}>
          <Box sx={{ padding: 3 }}>
            <h2>Preview Modal</h2>
            <p>This modal state is managed by Redux!</p>
            <Button onClick={handleClosePreview} variant="contained">
              Close
            </Button>
          </Box>
        </Dialog>
      </Box>

      {/* Display current Redux state */}
      <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <h3>Current Redux State:</h3>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify({
            selectedTab,
            tabs,
            breadcrumbTitle,
            isEditingBreadcrumb,
            openPreviewModal,
            multipleChoiceSettings
          }, null, 2)}
        </pre>
      </Box>
    </Box>
  );
}

export default ReduxExample;

/**
 * MIGRATION CHECKLIST FOR APP.JSX:
 * =================================
 *
 * 1. Import hooks and actions:
 *    import { useSelector, useDispatch } from 'react-redux';
 *    import { setSelectedTab, setBreadcrumbTitle, ... } from './store/slices/formEditorSlice';
 *
 * 2. Replace all useState declarations:
 *    BEFORE: const [selectedTab, setSelectedTab] = useState(1);
 *    AFTER:  const selectedTab = useSelector(state => state.formEditor.selectedTab);
 *            const dispatch = useDispatch();
 *
 * 3. Update all state setters:
 *    BEFORE: setSelectedTab(newValue)
 *    AFTER:  dispatch(setSelectedTab(newValue))
 *
 * 4. For object updates:
 *    BEFORE: setMultipleChoiceSettings({ ...multipleChoiceSettings, required: true })
 *    AFTER:  dispatch(setMultipleChoiceSettings({ required: true }))
 *
 * 5. Benefits of using Redux:
 *    - State persists across component unmounts
 *    - Easy to debug with Redux DevTools
 *    - State can be accessed from any component
 *    - Time-travel debugging
 *    - Easier testing
 */
