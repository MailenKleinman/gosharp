import React, { useState, useEffect, useMemo, useRef, useContext, createContext, useCallback } from 'react';
import './App.css';
import { Box, AppBar, Toolbar, Typography, Container, Paper, Grid, ThemeProvider, createTheme, CssBaseline, Breadcrumbs, Link, Tabs, Tab, Button, Tooltip, TextField, Menu, MenuItem, Switch, FormControlLabel, RadioGroup, Radio, FormControl, FormGroup, Dialog, DialogTitle, DialogContent, DialogActions, Select, Divider, Card, Checkbox, IconButton } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Edit as EditIcon, Visibility as VisibilityIcon, PhoneIphone as PhoneIphoneIcon, History as HistoryIcon, Settings as SettingsIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Search as SearchIcon } from '@mui/icons-material';
import { TextFields as TextFieldsIcon, CheckBox as CheckboxIcon, RadioButtonChecked as RadioButtonCheckedIcon, Image as ImageIcon, ThumbsUpDown as ThumbsUpDownIcon, ToggleOff as ToggleOffIcon, List as ListIcon, CalendarMonth as CalendarMonthIcon, Numbers as NumbersIcon, Assignment as AssignmentIcon, Star as StarIcon, SwapVert as SwapVertIcon, ArrowDropDownCircle as DropdownIcon } from '@mui/icons-material';
import { Person as PersonIcon, Add as AddIcon, Close as CloseIcon, Email as EmailIcon, Phone as PhoneIcon, LocationOn as LocationOnIcon, Language as LanguageIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { FormatListBulleted as FormatListBulletedIcon, Title as TitleIcon, FileUpload as FileUploadIcon, FileDownload as FileDownloadIcon, ArrowDownward as ArrowDownwardIcon, DragIndicator as DragIndicatorIcon } from '@mui/icons-material';
import { Delete as DeleteIcon, DeleteOutline as DeleteOutlineIcon, ContentCopy as ContentCopyIcon, AutoFixHigh as AutoFixHighIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { FormatColorText as FormatColorTextIcon, FormatBold as FormatBoldIcon, FormatItalic as FormatItalicIcon, FormatUnderlined as FormatUnderlinedIcon, FormatListNumbered as FormatListNumberedIcon, Link as LinkIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  newForm, newNode, findNodeById, // Simple functions and helpers
  fetchNodes, fetchForms, saveEditingFormAndNodes, deleteForm, loadFormByRootNodeId, // Async reduxs thunks
  setEditingForm, updateEditingFormMeta, setSelectedNode, updateEditingFormNode, updateNode, appendEditingFormNode, removeEditingFormNode, addTab, removeTab, addNode, // Redux Actions
  selectNodeById, selectChildrenByParentId, selectSelectedNode, selectAllNodes, selectNodeEntities // Memoized selectors
} from './store/slices/formEditorSlice';

const theme = createTheme({
  palette: {
    primary: {
      main: '#047857',
    },
    background: {
      default: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Montserrat, Arial, sans-serif',
  },
});

// Module-level refs for storing collapsed state and scroll positions
// These persist across all renders and component remounts
const globalCollapsedNodesRef = { current: {} };
const globalScrollPositionsRef = { current: {} };

// Context for storing collapsed state of cards and scroll positions (persists across tab switches)
// Using refs to avoid unnecessary re-renders
const EditorStateContext = createContext({
  collapsedNodesRef: globalCollapsedNodesRef,
  setCollapsed: () => {},
  scrollPositionsRef: globalScrollPositionsRef,
  setScrollPosition: () => {},
});
// Keep old name for backward compatibility
const CollapsedStateContext = EditorStateContext;

// Memoized QuestionCard component - defined outside to prevent re-creation on parent renders
const QuestionCard = React.memo(({ nodeId, parentId, depth = 0, allSiblings = {}, onCopy, onDelete, setSubComponentParentPath, setOpenSubComponentModal }) => {
  const dispatch = useDispatch();
  // Select only this specific node from nodesById - prevents re-renders when other nodes change
  const node = useSelector(state => state.formEditor.nodesById[nodeId]);
  const selectedNodeId = useSelector(state => state.formEditor.selectedNodeId);

  // Use context for collapsed state (persists across tab switches and re-renders)
  const { collapsedNodesRef, setCollapsed } = useContext(CollapsedStateContext);

  // Always read from the ref to get the persisted collapsed state
  // This ensures state survives even if the component remounts
  const isCollapsed = collapsedNodesRef.current[nodeId] || false;

  // Force re-render trigger for when this specific card's collapsed state changes
  const [, forceUpdate] = useState(0);

  const xid = nodeId;
  const isSelected = selectedNodeId === xid;

  // Find child nodes - nodes that have x-parent-id pointing to this node
  const childNodes = Object.values(allSiblings).filter(
    sibling => sibling['x-parent-id'] === xid
  );

  const toggleCardCollapse = () => {
    const newValue = !isCollapsed;
    collapsedNodesRef.current[nodeId] = newValue;
    setCollapsed(nodeId, newValue);
    forceUpdate(n => n + 1); // Trigger re-render for this card only
  };

  if (!node) return null;

  const CardHeader = () => {
    const HeaderLeftSide = () => {
      return <Box className="question-card__left-controls">
        <Tooltip title="Drag to reorder">
          <Box className="question-card__drag-handle">
            <DragIndicatorIcon fontSize="small" />
          </Box>
        </Tooltip>
        <Tooltip title={isCollapsed ? "Expand" : "Collapse"}>
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); toggleCardCollapse(); }}
            className="question-card__collapse-btn"
          >
            {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
          </Button>
        </Tooltip>
        <Box className="question-card__widget-icon">
          {(() => {
            const widgetType = node?.['x-widget'] || 'short-text';
            const iconMap = {
              'short-text': <TextFieldsIcon />,
              'multiple-choice': <RadioButtonCheckedIcon />,
              'dropdown': <DropdownIcon />,
              'yes-no': <ThumbsUpDownIcon />,
              'checkbox': <CheckboxIcon />,
              'number': <NumbersIcon />,
              'date': <CalendarMonthIcon />,
              'opinion-scale': <AssignmentIcon />,
              'rating': <StarIcon />,
              'section': <TitleIcon />,
              'root': <TitleIcon />,
              'header': <TitleIcon />,
            };
            return iconMap[widgetType] || <TextFieldsIcon />;
          })()}
        </Box>
        <Select
          size="small"
          value={node?.['x-widget'] || 'short-text'}
          displayEmpty
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const widgetType = e.target.value;
            const widgetToSchemaType = {
              'header': 'string',
              'short-text': 'string',
              'multiple-choice': 'string',
              'dropdown': 'string',
              'yes-no': 'boolean',
              'checkbox': 'array',
              'number': 'number',
              'date': 'string',
              'opinion-scale': 'number',
              'rating': 'number',
              'section': 'object',
              'root': 'object',
            };
            const schemaType = widgetToSchemaType[widgetType] || 'string';
            dispatch(updateEditingFormNode({ node: xid, key: 'x-widget', value: widgetType }));
            dispatch(updateEditingFormNode({ node: xid, key: 'type', value: schemaType }));
            if (widgetType === 'date') {
              dispatch(updateEditingFormNode({ node: xid, key: 'format', value: 'date' }));
            }
          }}
          className="question-card__widget-select"
          renderValue={(value) => {
            const widgetLabels = {
              'short-text': 'Short Text',
              'multiple-choice': 'Multiple Choice',
              'dropdown': 'Dropdown',
              'yes-no': 'Yes/No',
              'checkbox': 'Checkbox',
              'number': 'Number',
              'date': 'Date',
              'opinion-scale': 'Opinion Scale',
              'rating': 'Rating',
              'section': 'Section',
              'root': 'Root',
              'header': 'Header',
            };
            return widgetLabels[value] || value || 'Short Text';
          }}
        >
          <MenuItem value="header" className="question-card__menu-item">
            <TitleIcon /> Header
          </MenuItem>
          <MenuItem value="short-text" className="question-card__menu-item">
            <TextFieldsIcon /> Short Text
          </MenuItem>
          <MenuItem value="multiple-choice" className="question-card__menu-item">
            <RadioButtonCheckedIcon /> Multiple Choice
          </MenuItem>
          <MenuItem value="dropdown" className="question-card__menu-item">
            <DropdownIcon /> Dropdown
          </MenuItem>
          <MenuItem value="yes-no" className="question-card__menu-item">
            <ThumbsUpDownIcon /> Yes/No
          </MenuItem>
          <MenuItem value="checkbox" className="question-card__menu-item">
            <CheckboxIcon /> Checkbox
          </MenuItem>
          <MenuItem value="number" className="question-card__menu-item">
            <NumbersIcon /> Number
          </MenuItem>
          <MenuItem value="date" className="question-card__menu-item">
            <CalendarMonthIcon /> Date
          </MenuItem>
          <MenuItem value="opinion-scale" className="question-card__menu-item">
            <AssignmentIcon /> Opinion Scale
          </MenuItem>
          <MenuItem value="rating" className="question-card__menu-item">
            <StarIcon /> Rating
          </MenuItem>
        </Select>
        {isCollapsed && (
          <Typography className="question-card__collapsed-title">
            {node?.title || 'Untitled'}
          </Typography>
        )}
      </Box>
    };

    const HeaderRightSide = () => {
      return <Box className="question-card__right-controls">
        <Box className="question-card__required-container">
          <Typography className="question-card__required-label">Required</Typography>
          <Switch
            size="small"
            checked={node?.['x-required'] || false}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => dispatch(updateEditingFormNode({ node: xid, key: 'x-required', value: e.target.checked }))}
            className="question-card__required-switch"
          />
        </Box>
        <Tooltip title="Duplicate">
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); onCopy && onCopy(node, parentId); }}
            className="question-card__icon-btn question-card__copy-btn"
          >
            <ContentCopyIcon fontSize="small" />
          </Button>
        </Tooltip>
        <Tooltip title="Delete">
          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this field and all its subquestions?')) { onDelete && onDelete(xid); } }}
            className="question-card__icon-btn question-card__delete-btn"
          >
            <DeleteOutlineIcon fontSize="small" />
          </Button>
        </Tooltip>
      </Box>
    };

    // Call as functions, not components
    return <>
      {HeaderLeftSide()}
      {HeaderRightSide()}
    </>
  };

  const CardBody = () => {
    // Common title and description fields - defined as JSX elements, not components
    const titleField = (
      <TextField
        fullWidth
        label="Title"
        value={node?.title || ''}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => dispatch(updateEditingFormNode({ node: xid, key: 'title', value: e.target.value }))}
        className="question-card__title-field"
      />
    );

    const descriptionField = (
      <TextField
        fullWidth
        multiline
        rows={2}
        label="Description"
        value={node?.description || ''}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => dispatch(updateEditingFormNode({ node: xid, key: 'description', value: e.target.value }))}
      />
    );

    // Widget-specific rendering based on widget type
    const widgetType = node?.['x-widget'] || 'short-text';

    if (widgetType === 'header') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                  Preview: This will display as a section header in the form
                </Typography>
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'short-text') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <TextField
                  fullWidth
                  disabled
                  placeholder={node?.['x-placeholder'] || 'User will type here...'}
                  size="small"
                  sx={{ backgroundColor: '#fff' }}
                />
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    // Helper functions for options (multiple-choice, checkbox)
    // For checkbox, options are stored in items.enum; for multiple-choice, in enum
    const isCheckbox = widgetType === 'checkbox';
    const options = isCheckbox ? (node?.items?.enum || []) : (node?.enum || []);
    const handleAddOption = () => {
      const newOptions = [...options, `Option ${options.length + 1}`];
      if (isCheckbox) {
        dispatch(updateEditingFormNode({ node: xid, key: 'items', value: { ...node?.items, type: 'string', enum: newOptions } }));
      } else {
        dispatch(updateEditingFormNode({ node: xid, key: 'enum', value: newOptions }));
      }
    };
    const handleUpdateOption = (index, value) => {
      const newOptions = [...options];
      newOptions[index] = value;
      if (isCheckbox) {
        dispatch(updateEditingFormNode({ node: xid, key: 'items', value: { ...node?.items, type: 'string', enum: newOptions } }));
      } else {
        dispatch(updateEditingFormNode({ node: xid, key: 'enum', value: newOptions }));
      }
    };
    const handleRemoveOption = (index) => {
      const newOptions = options.filter((_, i) => i !== index);
      if (isCheckbox) {
        dispatch(updateEditingFormNode({ node: xid, key: 'items', value: { ...node?.items, type: 'string', enum: newOptions } }));
      } else {
        dispatch(updateEditingFormNode({ node: xid, key: 'enum', value: newOptions }));
      }
    };

    if (widgetType === 'multiple-choice') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 1 }}>Options:</Typography>
                {options.map((option, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <RadioButtonCheckedIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                    <TextField
                      size="small"
                      value={option}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleRemoveOption(index); }}
                      sx={{ minWidth: 'auto', color: '#ef4444' }}
                    >
                      <CloseIcon fontSize="small" />
                    </Button>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={(e) => { e.stopPropagation(); handleAddOption(); }}
                  sx={{ color: '#047857', textTransform: 'none' }}
                >
                  Add Option
                </Button>
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'dropdown') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 1 }}>Options:</Typography>
                {options.map((option, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <DropdownIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                    <TextField
                      size="small"
                      value={option}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleRemoveOption(index); }}
                      sx={{ minWidth: 'auto', color: '#ef4444' }}
                    >
                      <CloseIcon fontSize="small" />
                    </Button>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={(e) => { e.stopPropagation(); handleAddOption(); }}
                  sx={{ color: '#047857', textTransform: 'none' }}
                >
                  Add Option
                </Button>
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'yes-no') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 1 }}>Preview:</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined" size="small" disabled sx={{ flex: 1 }}>Yes</Button>
                  <Button variant="outlined" size="small" disabled sx={{ flex: 1 }}>No</Button>
                </Box>
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'checkbox') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 1 }}>Options:</Typography>
                {options.map((option, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckboxIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                    <TextField
                      size="small"
                      value={option}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleRemoveOption(index); }}
                      sx={{ minWidth: 'auto', color: '#ef4444' }}
                    >
                      <CloseIcon fontSize="small" />
                    </Button>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={(e) => { e.stopPropagation(); handleAddOption(); }}
                  sx={{ color: '#047857', textTransform: 'none' }}
                >
                  Add Option
                </Button>
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'number') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <TextField fullWidth disabled type="number" placeholder="0" size="small" sx={{ backgroundColor: '#fff' }} />
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'date') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <TextField fullWidth disabled type="date" size="small" sx={{ backgroundColor: '#fff' }} />
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'opinion-scale') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField size="small" type="number" label="Min Value" value={node?.minimum ?? 1} onClick={(e) => e.stopPropagation()} onChange={(e) => dispatch(updateEditingFormNode({ node: xid, key: 'minimum', value: Number(e.target.value) }))} sx={{ flex: 1 }} />
                <TextField size="small" type="number" label="Max Value" value={node?.maximum ?? 10} onClick={(e) => e.stopPropagation()} onChange={(e) => dispatch(updateEditingFormNode({ node: xid, key: 'maximum', value: Number(e.target.value) }))} sx={{ flex: 1 }} />
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 1 }}>Preview:</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  {Array.from({ length: Math.min((node?.maximum || 10) - (node?.minimum || 1) + 1, 10) }, (_, i) => (
                    <Button key={i} variant="outlined" size="small" disabled sx={{ minWidth: 36, px: 1 }}>{(node?.minimum || 1) + i}</Button>
                  ))}
                </Box>
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'rating') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <TextField size="small" type="number" label="Number of Stars" value={node?.maximum ?? 5} onClick={(e) => e.stopPropagation()} onChange={(e) => dispatch(updateEditingFormNode({ node: xid, key: 'maximum', value: Number(e.target.value) }))} sx={{ width: 150 }} inputProps={{ min: 1, max: 10 }} />
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px dashed #d1d5db' }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 1 }}>Preview:</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {Array.from({ length: node?.maximum || 5 }, (_, i) => (
                    <StarIcon key={i} sx={{ color: '#fbbf24', fontSize: 28 }} />
                  ))}
                </Box>
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    if (widgetType === 'section') {
      return (
        <>
          <Divider className="question-card__divider" />
          <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {titleField}
              {descriptionField}
              <Box sx={{ p: 2, backgroundColor: '#f0fdf4', borderRadius: 1, border: '1px dashed #047857' }}>
                <Typography sx={{ fontSize: '12px', color: '#047857', fontStyle: 'italic' }}>
                  This is a section container. Add subquestions below to group related fields.
                </Typography>
              </Box>
            </Box>
            <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
              <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
            </Box>
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map((childNode) => (
                  <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
                ))}
              </Box>
            )}
          </Box>
        </>
      );
    }

    // Default widget
    return (
      <>
        <Divider className="question-card__divider" />
        <Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {titleField}
            {descriptionField}
          </Box>
          <Box className="question-card__subcomponents" sx={{ mt: 2 }}>
            <Typography className="question-card__subcomponents-label">{`Subquestions ${childNodes.length}`}</Typography>
            <Button size="small" onClick={(e) => { e.stopPropagation(); setSubComponentParentPath && setSubComponentParentPath(xid); setOpenSubComponentModal && setOpenSubComponentModal(true); }} className="question-card__add-btn"><AddIcon fontSize="small" /></Button>
          </Box>
          {childNodes.length > 0 && (
            <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
              {childNodes.map((childNode) => (
                <QuestionCard key={childNode['x-id']} nodeId={childNode['x-id']} parentId={xid} depth={depth + 1} allSiblings={allSiblings} onCopy={onCopy} onDelete={onDelete} setSubComponentParentPath={setSubComponentParentPath} setOpenSubComponentModal={setOpenSubComponentModal} />
              ))}
            </Box>
          )}
        </Box>
      </>
    );
  };

  // Call as functions, not as components, to avoid remounting on re-render
  return <Box
    key={xid}
    onClick={(e) => { e.stopPropagation(); dispatch(setSelectedNode(xid)); }}
    className={`question-card ${depth % 2 !== 0 ? 'question-card--alt-bg' : ''} ${isSelected ? 'question-card--selected' : ''} ${isCollapsed ? 'question-card--collapsed' : ''}`}
  >
    {CardHeader()}
    {!isCollapsed && CardBody()}
  </Box>
});

function App() {

  const dispatch = useDispatch();
  const editingForm = useSelector((state) => state.formEditor.editingForm);

  const [leftWidth, setLeftWidth] = useState(20); // percentage
  const [rightWidth, setRightWidth] = useState(20); // percentage
  const [isDragging, setIsDragging] = useState(null);
  const [openPreviewModal, setOpenPreviewModal] = useState(false);
  const [openVersionHistoryModal, setOpenVersionHistoryModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [openPublishModal, setOpenPublishModal] = useState(false);
  const [openConditionalLogicModal, setOpenConditionalLogicModal] = useState(false);
  const [openChatToCreateModal, setOpenChatToCreateModal] = useState(false);
  //const [selectedCard, setSelectedCard] = useState(null);

  const LoadingModal = () => {
    const requests = useSelector((state) => state.dashboard.requests);
    return (<Dialog open={requests.length > 0} paper={{ sx: { backgroundColor: 'transparent', boxShadow: 'none', overflow: 'hidden' } }} >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 4, }} >
        <Box
          sx={{
            width: '60px', height: '60px', border: '4px solid rgba(4, 120, 87, 0.2)', borderTop: '4px solid #047857', borderRadius: '50%',
            animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
          }}
        />
      </Box>
    </Dialog>);
  };

  const TopNavbar = () => {
    return <AppBar position="fixed" sx={{ backgroundColor: '#f9fafb', boxShadow: 1 }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '50px' }} />

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Button
            sx={{
              color: '#374151', textTransform: 'none', fontSize: '14px', fontWeight: 500,
              '&:hover': { backgroundColor: 'transparent', color: '#047857' }
            }}
          >
            Dashboard
          </Button>

          <Button
            sx={{
              color: '#374151',
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': {
                backgroundColor: 'transparent',
                color: '#047857'
              }
            }}
          >
            Reports
            <ExpandMoreIcon sx={{ fontSize: '20px' }} />
          </Button>

          <Button
            sx={{
              color: '#047857',
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: 'transparent',
                color: '#047857'
              }
            }}
          >
            Setup
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Button
                sx={{
                  color: '#374151',
                  textTransform: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: 0,
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: '#047857'
                  }
                }}
              >
                Name and Lastname
              </Button>
              <Typography sx={{ fontSize: '11px', color: '#047857', marginTop: '-4px' }}>
                Super Admin
              </Typography>
            </Box>
            <ExpandMoreIcon sx={{ fontSize: '18px', color: '#374151' }} />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  };

  const SideBar = () => {
    return <Box sx={{ width: '15%', flexShrink: 0 }} />;
  };

  const FormEditor = () => {

    const editingForm = useSelector((state) => state.formEditor.editingForm);
    const [isDragOver, setIsDragOver] = useState(false);
    const [conditions, setConditions] = useState([]);

    // Collapsed state management uses module-level refs (persists across all renders)
    const setCollapsed = useCallback((nodeId, isCollapsed) => {
      globalCollapsedNodesRef.current = { ...globalCollapsedNodesRef.current, [nodeId]: isCollapsed };
    }, []);

    // Scroll position management uses module-level refs
    const setScrollPosition = useCallback((tabId, position) => {
      globalScrollPositionsRef.current = { ...globalScrollPositionsRef.current, [tabId]: position };
    }, []);

    // Context value with global refs - stable reference
    const editorContextValue = useMemo(() => ({
      collapsedNodesRef: globalCollapsedNodesRef,
      setCollapsed,
      scrollPositionsRef: globalScrollPositionsRef,
      setScrollPosition
    }), [setCollapsed, setScrollPosition]);

    // Alias for backward compatibility
    const collapsedContextValue = editorContextValue;

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const container = document.querySelector('[data-flex-container]');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const moveX = e.clientX - containerRect.left;
      const containerWidth = containerRect.width;
      const percentage = (moveX / containerWidth) * 100;

      if (isDragging === 'left') {
        const newLeftWidth = Math.max(10, Math.min(40, percentage));
        setLeftWidth(newLeftWidth);
      } else if (isDragging === 'right') {
        const newRightWidth = Math.max(10, Math.min(40, 100 - percentage));
        setRightWidth(newRightWidth);
      }
    };

    const PreviewModal = () => {
      // Use nodesById for fresh data (updated on each keystroke)
      const nodesById = useSelector(state => state.formEditor.nodesById);
      const [formValues, setFormValues] = useState({});
      const [selectedPreviewTab, setSelectedPreviewTab] = useState(0);
      const [showConditions, setShowConditions] = useState({});
      const [validationErrors, setValidationErrors] = useState({});

      // Reset form when modal opens
      useEffect(() => {
        if (openPreviewModal) {
          setFormValues({});
          setSelectedPreviewTab(0);
          setValidationErrors({});
        }
      }, [openPreviewModal]);

      // Evaluate show/hide conditions
      const evaluateConditions = (node) => {
        const showIf = node['x-show-if'];
        if (!showIf || !showIf.conditions || showIf.conditions.length === 0) {
          return true; // No conditions, always show
        }

        const { logic, conditions } = showIf;

        const evaluateCondition = (condition) => {
          const fieldValue = formValues[condition.field];
          const targetValue = condition.value;

          switch (condition.operator) {
            case 'equals':
              return fieldValue === targetValue;
            case 'not_equals':
              return fieldValue !== targetValue;
            case 'contains':
              return Array.isArray(fieldValue)
                ? fieldValue.includes(targetValue)
                : String(fieldValue || '').includes(String(targetValue));
            case 'not_contains':
              return Array.isArray(fieldValue)
                ? !fieldValue.includes(targetValue)
                : !String(fieldValue || '').includes(String(targetValue));
            case 'is_empty':
              return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
            case 'is_not_empty':
              return fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
            case 'greater_than':
              return Number(fieldValue) > Number(targetValue);
            case 'less_than':
              return Number(fieldValue) < Number(targetValue);
            case 'greater_than_or_equal':
              return Number(fieldValue) >= Number(targetValue);
            case 'less_than_or_equal':
              return Number(fieldValue) <= Number(targetValue);
            default:
              return true;
          }
        };

        const results = conditions.map(evaluateCondition);

        switch (logic) {
          case 'all':
            return results.every(r => r);
          case 'any':
            return results.some(r => r);
          case 'none':
            return !results.some(r => r);
          default:
            return true;
        }
      };

      // Create Ajv instance with formats support
      const ajv = useMemo(() => {
        const instance = new Ajv({ allErrors: true, strict: false });
        addFormats(instance);
        return instance;
      }, []);

      // Convert Ajv error to human-readable message
      const formatAjvError = (error, node) => {
        const { keyword, params, message } = error;

        switch (keyword) {
          case 'required':
            return 'This field is required';
          case 'minLength':
            return `Minimum length is ${params.limit} characters`;
          case 'maxLength':
            return `Maximum length is ${params.limit} characters`;
          case 'minimum':
            return `Minimum value is ${params.limit}`;
          case 'maximum':
            return `Maximum value is ${params.limit}`;
          case 'exclusiveMinimum':
            return `Value must be greater than ${params.limit}`;
          case 'exclusiveMaximum':
            return `Value must be less than ${params.limit}`;
          case 'multipleOf':
            return `Value must be a multiple of ${params.multipleOf}`;
          case 'pattern':
            return node?.['x-pattern-error'] || 'Invalid format';
          case 'format':
            if (params.format === 'email') return 'Invalid email address';
            if (params.format === 'uri') return 'Invalid URL';
            if (params.format === 'date') return 'Invalid date format';
            return `Invalid ${params.format} format`;
          case 'enum':
            return 'Please select a valid option';
          case 'minItems':
            return `Select at least ${params.limit} item${params.limit > 1 ? 's' : ''}`;
          case 'maxItems':
            return `Select at most ${params.limit} item${params.limit > 1 ? 's' : ''}`;
          case 'type':
            return `Expected ${params.type}`;
          default:
            return message || 'Invalid value';
        }
      };

      // Build a JSON Schema for a single node for Ajv validation
      const buildNodeSchema = (node) => {
        const schema = { type: node.type || 'string' };

        // Copy validation properties
        if (node.minLength !== undefined) schema.minLength = node.minLength;
        if (node.maxLength !== undefined) schema.maxLength = node.maxLength;
        if (node.minimum !== undefined) schema.minimum = node.minimum;
        if (node.maximum !== undefined) schema.maximum = node.maximum;
        if (node.exclusiveMinimum !== undefined) schema.exclusiveMinimum = node.exclusiveMinimum;
        if (node.exclusiveMaximum !== undefined) schema.exclusiveMaximum = node.exclusiveMaximum;
        if (node.multipleOf !== undefined) schema.multipleOf = node.multipleOf;
        if (node.pattern) schema.pattern = node.pattern;
        if (node.format) schema.format = node.format;

        // For array types (checkbox), validate items instead of the array itself
        // For non-array types (multiple-choice), use enum directly
        if (node.type === 'array') {
          // Use items.enum for checkbox validation
          if (node.items?.enum) {
            schema.items = { type: 'string', enum: node.items.enum };
          }
        } else {
          // For string types (multiple-choice), use enum directly
          if (node.enum) schema.enum = node.enum;
        }

        if (node.minItems !== undefined) schema.minItems = node.minItems;
        if (node.maxItems !== undefined) schema.maxItems = node.maxItems;

        return schema;
      };

      // Validate a single node using Ajv
      const validateNode = (node, value) => {
        const errors = [];
        if (!node || node['x-hidden'] || !evaluateConditions(node)) return errors;

        const widgetType = node['x-widget'] || 'short-text';

        // Skip validation for non-input widgets
        if (widgetType === 'header' || widgetType === 'section') return errors;

        // Required validation (handle separately since we use x-required)
        if (node['x-required']) {
          const isEmpty = value === undefined || value === null || value === '' ||
            (Array.isArray(value) && value.length === 0);
          if (isEmpty) {
            errors.push('This field is required');
            return errors;
          }
        }

        // Skip further validation if no value
        if (value === undefined || value === null || value === '') return errors;

        // Build schema and validate with Ajv
        const schema = buildNodeSchema(node);

        try {
          const validate = ajv.compile(schema);
          const valid = validate(value);

          if (!valid && validate.errors) {
            validate.errors.forEach(error => {
              errors.push(formatAjvError(error, node));
            });
          }
        } catch (e) {
          console.error('Ajv validation error:', e);
        }

        return errors;
      };

      // Validate all visible fields in a tab using nodesById for fresh data
      const validateTab = (tabPropertyIds) => {
        const errors = {};
        if (!tabPropertyIds || tabPropertyIds.length === 0) return errors;

        // Get fresh node data from nodesById
        const allNodes = tabPropertyIds.map(id => nodesById[id]).filter(Boolean);

        // Only validate top-level visible nodes and their children
        const validateNodeRecursive = (nodeId) => {
          const node = nodesById[nodeId];
          if (!node || node['x-hidden'] || !evaluateConditions(node)) return;

          const nodeErrors = validateNode(node, formValues[nodeId]);
          if (nodeErrors.length > 0) {
            errors[nodeId] = nodeErrors;
          }

          // Validate child nodes - find all nodes with x-parent-id pointing to this node
          const childNodes = Object.values(nodesById).filter(n => n['x-parent-id'] === nodeId);
          childNodes.forEach(child => validateNodeRecursive(child['x-id']));
        };

        // Start with top-level nodes (no x-parent-id)
        allNodes.filter(n => !n['x-parent-id']).forEach(node => validateNodeRecursive(node['x-id']));

        return errors;
      };

      // Handle Next button click with validation
      const handleNext = () => {
        const currentTab = tabs[selectedPreviewTab];
        const tabPropertyIds = currentTab?.properties ? Object.values(currentTab.properties).map(n => n['x-id']) : [];
        const errors = validateTab(tabPropertyIds);

        setValidationErrors(errors);

        if (Object.keys(errors).length === 0) {
          setSelectedPreviewTab(prev => prev + 1);
        }
      };

      // Handle Submit button click with validation
      const handleSubmit = () => {
        const currentTab = tabs[selectedPreviewTab];
        const tabPropertyIds = currentTab?.properties ? Object.values(currentTab.properties).map(n => n['x-id']) : [];
        const errors = validateTab(tabPropertyIds);

        setValidationErrors(errors);

        if (Object.keys(errors).length === 0) {
          console.log('Form submitted:', formValues);
          alert('Form submitted successfully! Check console for values.');
        }
      };

      // Clear errors for a field when its value changes
      const clearFieldError = (nodeId) => {
        if (validationErrors[nodeId]) {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[nodeId];
            return newErrors;
          });
        }
      };

      // Render a single field based on its widget type
      const renderPreviewField = (nodeOrId, allNodes = {}) => {
        // Get fresh node data from nodesById
        const nodeId = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId?.['x-id'];
        const node = nodesById[nodeId] || nodeOrId;

        if (!node || node['x-hidden']) return null;

        // Check conditional visibility
        if (!evaluateConditions(node)) return null;

        const widgetType = node['x-widget'] || 'short-text';
        const value = formValues[nodeId];
        const fieldErrors = validationErrors[nodeId] || [];
        const hasError = fieldErrors.length > 0;
        const setValue = (newValue) => {
          setFormValues(prev => ({ ...prev, [nodeId]: newValue }));
          clearFieldError(nodeId);
        };

        // Get custom styles
        const labelStyle = node['x-label-style'] || {};
        const inputStyle = node['x-input-style'] || {};
        const fieldStyle = node['x-style'] || {};

        // Find child nodes (for hierarchy) - use nodesById for fresh data
        const childNodes = Object.values(nodesById).filter(n => n['x-parent-id'] === nodeId);

        // Field wrapper as a render function (not a component) to prevent focus loss
        const renderFieldWrapper = (inputElement) => (
          <Box key={nodeId} sx={{
            mb: 3,
            p: fieldStyle.backgroundColor ? 2 : 0,
            backgroundColor: fieldStyle.backgroundColor || 'transparent',
            borderRadius: fieldStyle.borderRadius || '8px',
            border: fieldStyle.borderColor ? `${fieldStyle.borderWidth || '1px'} solid ${fieldStyle.borderColor}` : 'none',
          }}>
            {node.title && widgetType !== 'header' && (
              <Typography sx={{
                fontSize: '14px',
                fontWeight: 600,
                color: hasError ? '#ef4444' : (labelStyle.color || '#374151'),
                mb: 0.5
              }}>
                {node.title}
                {node['x-required'] && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
              </Typography>
            )}
            {node.description && widgetType !== 'header' && (
              <Typography sx={{
                fontSize: '12px',
                color: fieldStyle.descriptionColor || '#6b7280',
                mb: 1
              }}>
                {node.description}
              </Typography>
            )}
            {inputElement}
            {/* Validation error messages */}
            {hasError && (
              <Box sx={{ mt: 0.5 }}>
                {fieldErrors.map((error, idx) => (
                  <Typography key={idx} sx={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {error}
                  </Typography>
                ))}
              </Box>
            )}
            {node['x-help-text'] && !hasError && (
              <Typography sx={{ fontSize: '11px', color: '#9ca3af', mt: 0.5 }}>
                {node['x-help-text']}
              </Typography>
            )}
            {/* Render child nodes */}
            {childNodes.length > 0 && (
              <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                {childNodes.map(child => renderPreviewField(child, allNodes))}
              </Box>
            )}
          </Box>
        );

        switch (widgetType) {
          case 'header':
            return (
              <Box key={nodeId} sx={{ mb: 3 }}>
                <Typography sx={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: labelStyle.color || '#111827',
                  mb: 0.5
                }}>
                  {node.title}
                </Typography>
                {node.description && (
                  <Typography sx={{ fontSize: '14px', color: fieldStyle.descriptionColor || '#6b7280' }}>
                    {node.description}
                  </Typography>
                )}
                {childNodes.length > 0 && (
                  <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #e5e7eb' }}>
                    {childNodes.map(child => renderPreviewField(child, allNodes))}
                  </Box>
                )}
              </Box>
            );

          case 'section':
            return (
              <Box key={nodeId} sx={{ mb: 3, p: 2, backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827', mb: 1 }}>
                  {node.title}
                </Typography>
                {node.description && (
                  <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 2 }}>
                    {node.description}
                  </Typography>
                )}
                {childNodes.map(child => renderPreviewField(child, allNodes))}
              </Box>
            );

          case 'short-text':
            return renderFieldWrapper(
              <TextField
                fullWidth
                size="small"
                value={value || ''}
                onChange={(e) => setValue(e.target.value)}
                placeholder={node['x-placeholder'] || ''}
                disabled={node['x-disabled']}
                InputProps={{
                  readOnly: node.readOnly,
                  sx: {
                    backgroundColor: inputStyle.backgroundColor || '#fff',
                    color: inputStyle.color || '#374151',
                  }
                }}
              />
            );

          case 'multiple-choice':
            return renderFieldWrapper(
              <RadioGroup
                value={value || ''}
                onChange={(e) => setValue(e.target.value)}
              >
                {(node.enum || []).map((option, idx) => (
                  <FormControlLabel
                    key={idx}
                    value={option}
                    control={<Radio size="small" sx={{ color: '#047857', '&.Mui-checked': { color: '#047857' } }} />}
                    label={option}
                    disabled={node['x-disabled']}
                  />
                ))}
              </RadioGroup>
            );

          case 'dropdown':
            return renderFieldWrapper(
              <Select
                fullWidth
                size="small"
                value={value || ''}
                onChange={(e) => setValue(e.target.value)}
                displayEmpty
                disabled={node['x-disabled']}
                sx={{
                  backgroundColor: inputStyle.backgroundColor || '#fff',
                  color: inputStyle.color || '#374151',
                }}
              >
                <MenuItem value="" disabled>
                  <em>{node['x-placeholder'] || 'Select an option'}</em>
                </MenuItem>
                {(node.enum || []).map((option, idx) => (
                  <MenuItem key={idx} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            );

          case 'checkbox':
            return renderFieldWrapper(
              <FormGroup>
                {(node.items?.enum || []).map((option, idx) => (
                  <FormControlLabel
                    key={idx}
                    control={
                      <Checkbox
                        size="small"
                        checked={(value || []).includes(option)}
                        onChange={(e) => {
                          const current = value || [];
                          if (e.target.checked) {
                            setValue([...current, option]);
                          } else {
                            setValue(current.filter(v => v !== option));
                          }
                        }}
                        sx={{ color: '#047857', '&.Mui-checked': { color: '#047857' } }}
                      />
                    }
                    label={option}
                    disabled={node['x-disabled']}
                  />
                ))}
              </FormGroup>
            );

          case 'yes-no':
            return renderFieldWrapper(
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant={value === true ? 'contained' : 'outlined'}
                  onClick={() => setValue(true)}
                  disabled={node['x-disabled']}
                  sx={{
                    flex: 1,
                    textTransform: 'none',
                    backgroundColor: value === true ? '#047857' : 'transparent',
                    borderColor: '#047857',
                    color: value === true ? '#fff' : '#047857',
                    '&:hover': {
                      backgroundColor: value === true ? '#036644' : 'rgba(4, 120, 87, 0.04)',
                      borderColor: '#036644',
                    }
                  }}
                >
                  Yes
                </Button>
                <Button
                  variant={value === false ? 'contained' : 'outlined'}
                  onClick={() => setValue(false)}
                  disabled={node['x-disabled']}
                  sx={{
                    flex: 1,
                    textTransform: 'none',
                    backgroundColor: value === false ? '#dc2626' : 'transparent',
                    borderColor: value === false ? '#dc2626' : '#d1d5db',
                    color: value === false ? '#fff' : '#6b7280',
                    '&:hover': {
                      backgroundColor: value === false ? '#b91c1c' : 'rgba(220, 38, 38, 0.04)',
                      borderColor: value === false ? '#b91c1c' : '#9ca3af',
                    }
                  }}
                >
                  No
                </Button>
              </Box>
            );

          case 'number':
            return renderFieldWrapper(
              <TextField
                fullWidth
                size="small"
                type="number"
                value={value ?? ''}
                onChange={(e) => setValue(e.target.value ? Number(e.target.value) : '')}
                placeholder={node['x-placeholder'] || ''}
                disabled={node['x-disabled']}
                InputProps={{
                  readOnly: node.readOnly,
                  inputProps: {
                    min: node.minimum,
                    max: node.maximum,
                    step: node.multipleOf || 1,
                  },
                  sx: {
                    backgroundColor: inputStyle.backgroundColor || '#fff',
                    color: inputStyle.color || '#374151',
                  }
                }}
              />
            );

          case 'date':
            return renderFieldWrapper(
              <TextField
                fullWidth
                size="small"
                type="date"
                value={value || ''}
                onChange={(e) => setValue(e.target.value)}
                disabled={node['x-disabled']}
                InputProps={{
                  readOnly: node.readOnly,
                  sx: {
                    backgroundColor: inputStyle.backgroundColor || '#fff',
                    color: inputStyle.color || '#374151',
                  }
                }}
              />
            );

          case 'rating':
            return renderFieldWrapper(
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    onClick={() => setValue(star)}
                    disabled={node['x-disabled']}
                    sx={{ minWidth: 'auto', p: 0.5 }}
                  >
                    <StarIcon sx={{
                      fontSize: '32px',
                      color: (value || 0) >= star ? '#f59e0b' : '#d1d5db',
                      transition: 'color 0.2s'
                    }} />
                  </Button>
                ))}
              </Box>
            );

          case 'opinion-scale':
            return renderFieldWrapper(
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <Button
                    key={num}
                    variant={value === num ? 'contained' : 'outlined'}
                    onClick={() => setValue(num)}
                    disabled={node['x-disabled']}
                    sx={{
                      minWidth: '40px',
                      height: '40px',
                      p: 0,
                      backgroundColor: value === num ? '#047857' : 'transparent',
                      borderColor: value === num ? '#047857' : '#d1d5db',
                      color: value === num ? '#fff' : '#374151',
                      '&:hover': {
                        backgroundColor: value === num ? '#036644' : 'rgba(4, 120, 87, 0.04)',
                        borderColor: '#047857',
                      }
                    }}
                  >
                    {num}
                  </Button>
                ))}
              </Box>
            );

          default:
            return renderFieldWrapper(
              <TextField
                fullWidth
                size="small"
                value={value || ''}
                onChange={(e) => setValue(e.target.value)}
                placeholder={node['x-placeholder'] || ''}
                disabled={node['x-disabled']}
              />
            );
        }
      };

      // Get tabs from the form - use nodesById to get fresh tab data
      const tabIds = Object.values(editingForm?.properties || {}).map(t => t['x-id']);
      const tabs = tabIds.map(id => nodesById[id]).filter(Boolean);
      const currentTab = tabs[selectedPreviewTab];
      const currentTabId = currentTab?.['x-id'];

      // Get top-level nodes for current tab (nodes without x-parent-id that belong to this tab)
      // We need to find nodes that are direct children of the current tab
      const tabPropertyIds = currentTab?.properties ? Object.values(currentTab.properties).map(n => n['x-id']) : [];
      const topLevelNodes = tabPropertyIds
        .map(id => nodesById[id])
        .filter(node => node && !node['x-parent-id']);

      return (
        <Dialog
          open={openPreviewModal}
          onClose={() => setOpenPreviewModal(false)}
          maxWidth="md"
          fullWidth
          sx={{ '& .MuiDialog-paper': { minHeight: '80vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '10px' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, color: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '18px' }}>Preview</Typography>
              <Typography sx={{ fontSize: '14px', color: '#6b7280' }}>{editingForm?.title || 'Untitled Form'}</Typography>
            </Box>
            <Button
              onClick={() => setOpenPreviewModal(false)}
              sx={{ minWidth: 'auto', padding: '4px', color: '#6b7280', '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
            >
              <CloseIcon sx={{ fontSize: '20px' }} />
            </Button>
          </DialogTitle>

          {/* Tabs */}
          {tabs.length > 1 && (
            <Box sx={{ borderBottom: '1px solid #e5e7eb', px: 3 }}>
              <Tabs
                value={selectedPreviewTab}
                onChange={(e, newValue) => setSelectedPreviewTab(newValue)}
                sx={{
                  '& .MuiTab-root': { color: '#6b7280', textTransform: 'none', fontWeight: 500, '&.Mui-selected': { color: '#047857' } },
                  '& .MuiTabs-indicator': { backgroundColor: '#047857', height: '3px' },
                }}
              >
                {tabs.map((tab, idx) => (
                  <Tab key={tab['x-id']} label={tab.title || `Tab ${idx + 1}`} />
                ))}
              </Tabs>
            </Box>
          )}

          <DialogContent sx={{ flex: 1, overflowY: 'auto', p: 3, backgroundColor: '#f9fafb' }}>
            <Box sx={{ maxWidth: '600px', mx: 'auto' }}>
              {/* Render fields - each top-level field in its own card */}
              {topLevelNodes.length > 0 ? (
                topLevelNodes.map(node => {
                  const nodeErrors = validationErrors[node['x-id']] || [];
                  const hasNodeError = nodeErrors.length > 0;
                  return (
                    <Card
                      key={node['x-id']}
                      sx={{
                        mb: 2,
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        border: hasNodeError ? '2px solid #ef4444' : '1px solid #e5e7eb',
                        overflow: 'visible',
                      }}
                    >
                      <Box sx={{ p: 3 }}>
                        {renderPreviewField(node, currentTab?.properties || {})}
                      </Box>
                    </Card>
                  );
                })
              ) : (
                <Card sx={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography sx={{ color: '#9ca3af' }}>No fields in this section</Typography>
                  </Box>
                </Card>
              )}
            </Box>
          </DialogContent>

          {/* Footer with submit button */}
          <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                onClick={() => {
                  setFormValues({});
                  setSelectedPreviewTab(0);
                  setValidationErrors({});
                }}
                sx={{ textTransform: 'none', color: '#6b7280' }}
              >
                Reset Form
              </Button>
              {Object.keys(validationErrors).length > 0 && (
                <Typography sx={{ fontSize: '13px', color: '#ef4444' }}>
                  Please fix {Object.keys(validationErrors).length} error{Object.keys(validationErrors).length > 1 ? 's' : ''} before continuing
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {selectedPreviewTab > 0 && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setValidationErrors({});
                    setSelectedPreviewTab(prev => prev - 1);
                  }}
                  sx={{ textTransform: 'none', borderColor: '#d1d5db', color: '#374151' }}
                >
                  Previous
                </Button>
              )}
              {selectedPreviewTab < tabs.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{ textTransform: 'none', backgroundColor: '#047857', '&:hover': { backgroundColor: '#036644' } }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  sx={{ textTransform: 'none', backgroundColor: '#047857', '&:hover': { backgroundColor: '#036644' } }}
                >
                  Submit
                </Button>
              )}
            </Box>
          </Box>
        </Dialog>
      );
    };

    const VersionHistoryModal = () => {
      const [versionTitles, setVersionTitles] = useState({
        version1: 'V3 adittion of notes',
        version2: 'Autosaved version',
        version3: 'Autosaved version'
      });

      return <Dialog open={openVersionHistoryModal} onClose={() => setOpenVersionHistoryModal(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { display: 'flex', flexDirection: 'column', borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#111827', margin: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          VERSION HISTORY
          <Button
            onClick={() => setOpenVersionHistoryModal(false)}
            sx={{
              minWidth: 'auto',
              padding: '4px',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: '20px' }} />
          </Button>
        </DialogTitle>
        <Divider sx={{ margin: 0 }} />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '36px' }}>
            {/* Version 1 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 2, borderBottom: '1px solid #e5e7eb', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  value={versionTitles.version1}
                  onChange={(e) => setVersionTitles({ ...versionTitles, version1: e.target.value })}
                  variant="standard"
                  sx={{ fontSize: '14px', fontWeight: 500, marginBottom: 1, '& .MuiInput-input': { fontSize: '14px', fontWeight: 500, color: '#111827' } }}
                />
                <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>Nov 7, 2025 at 2:45 PM by Sarah Johnson</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    borderColor: '#d1d5db',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    backgroundColor: '#047857',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#065f46'
                    }
                  }}
                >
                  Restore
                </Button>
              </Box>
            </Box>

            {/* Version 2 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 2, borderBottom: '1px solid #e5e7eb', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  value={versionTitles.version2}
                  onChange={(e) => setVersionTitles({ ...versionTitles, version2: e.target.value })}
                  variant="standard"
                  sx={{ fontSize: '14px', fontWeight: 500, marginBottom: 1, '& .MuiInput-input': { fontSize: '14px', fontWeight: 500, color: '#111827' } }}
                />
                <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>Nov 7, 2025 at 2:30 PM by Michael Chen</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    borderColor: '#d1d5db',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    backgroundColor: '#047857',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#065f46'
                    }
                  }}
                >
                  Restore
                </Button>
              </Box>
            </Box>

            {/* Version 3 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  value={versionTitles.version3}
                  onChange={(e) => setVersionTitles({ ...versionTitles, version3: e.target.value })}
                  variant="standard"
                  sx={{ fontSize: '14px', fontWeight: 500, marginBottom: 1, '& .MuiInput-input': { fontSize: '14px', fontWeight: 500, color: '#111827' } }}
                />
                <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>Nov 7, 2025 at 2:15 PM by Emma Rodriguez</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    borderColor: '#d1d5db',
                    color: '#374151',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    backgroundColor: '#047857',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#065f46'
                    }
                  }}
                >
                  Restore
                </Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    };

    const ImportModal = () => {
      return <Dialog open={openImportModal} onClose={() => setOpenImportModal(false)} maxWidth="lg" fullWidth sx={{ '& .MuiDialog-paper': { display: 'flex', flexDirection: 'column', borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#111827', margin: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          IMPORT
          <Button
            onClick={() => setOpenImportModal(false)}
            sx={{
              minWidth: 'auto',
              padding: '4px',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: '20px' }} />
          </Button>
        </DialogTitle>
        <Divider sx={{ margin: 0 }} />

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
          <Box sx={{ display: 'flex', gap: 2, padding: '36px' }}>
            {/* Left side - Dropdowns */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 0.6, minWidth: '200px' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Select
                  size="small"
                  defaultValue="tool"
                  sx={{ fontSize: '14px' }}
                  displayEmpty
                >
                  <MenuItem value="tool">Select Tool</MenuItem>
                  <MenuItem value="tool1">Tool 1</MenuItem>
                  <MenuItem value="tool2">Tool 2</MenuItem>
                  <MenuItem value="tool3">Tool 3</MenuItem>
                </Select>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Select
                  size="small"
                  defaultValue="section"
                  sx={{ fontSize: '14px' }}
                  displayEmpty
                >
                  <MenuItem value="section">Select Section (optional)</MenuItem>
                  <MenuItem value="section1">Section 1</MenuItem>
                  <MenuItem value="section2">Section 2</MenuItem>
                  <MenuItem value="section3">Section 3</MenuItem>
                </Select>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Select
                  size="small"
                  defaultValue="question"
                  sx={{ fontSize: '14px' }}
                  displayEmpty
                >
                  <MenuItem value="question">Select Question (optional)</MenuItem>
                  <MenuItem value="question1">Question 1</MenuItem>
                  <MenuItem value="question2">Question 2</MenuItem>
                  <MenuItem value="question2">Question 3</MenuItem>
                </Select>
              </Box>
            </Box>

            {/* Right side - Preview Image Placeholder */}
            <Box sx={{
              flex: 1.2,
              backgroundColor: '#f3f4f6',
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '350px',
              flexDirection: 'column',
              gap: 2
            }}>
              <ImageIcon sx={{ fontSize: '80px', color: '#9ca3af' }} />
              <Typography sx={{ fontSize: '14px', color: '#9ca3af', fontWeight: 500 }}>Preview</Typography>
            </Box>
          </Box>

          <Divider sx={{ margin: 0 }} />

          <Box sx={{ display: 'flex', gap: 1, padding: '36px' }}>
            <Button
              size="small"
              variant="outlined"
              sx={{
                flex: 1,
                textTransform: 'none',
                borderColor: '#d1d5db',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Import Complete Tool
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{
                flex: 1,
                textTransform: 'none',
                borderColor: '#d1d5db',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Import Complete Section
            </Button>
            <Button
              size="small"
              variant="contained"
              sx={{
                flex: 1,
                textTransform: 'none',
                backgroundColor: '#047857',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: '#065f46'
                }
              }}
            >
              Import Question
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    };

    const ExportModal = () => {
      return <Dialog open={openExportModal} onClose={() => setOpenExportModal(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { display: 'flex', flexDirection: 'column', borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#111827', margin: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          EXPORT
          <Button
            onClick={() => setOpenExportModal(false)}
            sx={{
              minWidth: 'auto',
              padding: '4px',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: '20px' }} />
          </Button>
        </DialogTitle>
        <Divider sx={{ margin: 0 }} />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, padding: '36px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Select
                size="small"
                defaultValue="json"
                sx={{ fontSize: '14px' }}
                displayEmpty
              >
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </Select>
            </Box>

          </Box>

          <Divider sx={{ margin: 0 }} />

          <Box sx={{ display: 'flex', gap: 1, padding: '36px' }}>
            <Button
              size="small"
              variant="outlined"
              sx={{
                flex: 1,
                textTransform: 'none',
                borderColor: '#d1d5db',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500
              }}
              onClick={() => setOpenExportModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              sx={{
                flex: 1,
                textTransform: 'none',
                backgroundColor: '#047857',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: '#065f46'
                }
              }}
              onClick={() => setOpenExportModal(false)}
            >
              Export
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    };

    const PublishModal = () => {
      return <Dialog open={openPublishModal} onClose={() => setOpenPublishModal(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { display: 'flex', flexDirection: 'column', borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#111827', margin: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          PUBLISH
          <Button
            onClick={() => setOpenPublishModal(false)}
            sx={{
              minWidth: 'auto',
              padding: '4px',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: '20px' }} />
          </Button>
        </DialogTitle>
        <Divider sx={{ margin: 0 }} />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, padding: '36px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 2 }}>
              <Select
                size="small"
                defaultValue="public"
                sx={{ fontSize: '14px' }}
                displayEmpty
              >
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
              </Select>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>URL</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Link
                  href="https://form.example.com/your-form"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: '14px',
                    color: '#047857',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    flex: 1,
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  https://form.example.com/your-form
                </Link>
                <Button
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText('https://form.example.com/your-form');
                  }}
                  sx={{
                    minWidth: 'auto',
                    padding: '4px',
                    color: '#047857',
                    '&:hover': {
                      backgroundColor: 'rgba(4, 120, 87, 0.08)'
                    }
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: '16px' }} />
                </Button>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ margin: 0 }} />

          <Box sx={{ display: 'flex', gap: 1, padding: '36px' }}>
            <Button
              size="small"
              variant="outlined"
              sx={{
                flex: 1,
                textTransform: 'none',
                borderColor: '#d1d5db',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500
              }}
              onClick={() => setOpenPublishModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              sx={{
                flex: 1,
                textTransform: 'none',
                backgroundColor: '#047857',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: '#065f46'
                }
              }}
              onClick={() => setOpenPublishModal(false)}
            >
              Publish
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    };

    const ConditionalLogicModal = () => {
      return <Dialog open={openConditionalLogicModal} onClose={() => setOpenConditionalLogicModal(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { minHeight: '500px', display: 'flex', flexDirection: 'column', borderRadius: '10px' } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#111827' }}>Add Conditional Logic</DialogTitle>
        <DialogContent sx={{ flex: 1, py: 3 }}>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConditionalLogicModal(false)} sx={{ color: '#374151' }}>
            Cancel
          </Button>
          <Button
            onClick={() => setOpenConditionalLogicModal(false)}
            variant="contained"
            sx={{
              backgroundColor: '#047857',
              '&:hover': { backgroundColor: '#036644' }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    };

    const IAChat = () => {
      return <Dialog open={openChatToCreateModal} onClose={() => setOpenChatToCreateModal(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { display: 'flex', flexDirection: 'column', borderRadius: '10px', height: '600px' } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#111827', margin: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          CHAT TO CREATE
          <Button
            onClick={() => setOpenChatToCreateModal(false)}
            sx={{
              minWidth: 'auto',
              padding: '4px',
              color: '#6b7280',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: '20px' }} />
          </Button>
        </DialogTitle>
        <Divider sx={{ margin: 0 }} />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, padding: '36px', flex: 1, overflowY: 'auto' }}>
            <style>{`
              .chat-bubble-left { gap: 0 !important; }
              .chat-bubble-right { gap: 0 !important; }
            `}</style>
            {/* Bot message 1 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 0 }}>
              <Box sx={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '0px solid transparent',
                borderBottom: '8px solid #f3f4f6',
                alignSelf: 'flex-end'
              }} />
              <Box sx={{ backgroundColor: '#f3f4f6', borderRadius: '8px', borderBottomLeftRadius: 0, padding: '12px 16px', maxWidth: '80%' }}>
                <Typography sx={{ fontSize: '14px', color: '#111827', lineHeight: 1.5 }}>
                  I'm here to help you improve your form. Could you tell me a bit more about what you'd like to do? For example, do you want to add new questions?
                </Typography>
              </Box>
            </Box>

            {/* User message 1 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 0 }}>
              <Box sx={{ backgroundColor: '#047857', borderRadius: '8px', borderBottomRightRadius: 0, padding: '12px 16px', maxWidth: '80%' }}>
                <Typography sx={{ fontSize: '14px', color: '#ffffff', lineHeight: 1.5 }}>
                  I want to create a question of how many students are in the class?
                </Typography>
              </Box>
              <Box sx={{
                width: 0,
                height: 0,
                borderLeft: '0px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: '8px solid #047857',
                alignSelf: 'flex-end'
              }} />
            </Box>

            {/* Bot message 2 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 0 }}>
              <Box sx={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '0px solid transparent',
                borderBottom: '8px solid #f3f4f6',
                alignSelf: 'flex-end'
              }} />
              <Box sx={{ backgroundColor: '#f3f4f6', borderRadius: '8px', borderBottomLeftRadius: 0, padding: '12px 16px', maxWidth: '80%' }}>
                <Typography sx={{ fontSize: '14px', color: '#111827', lineHeight: 1.5 }}>
                  Would you like the question to ask for an exact number, a range, or provide multiple choice options? And what should the second question be about?
                </Typography>
              </Box>
            </Box>

            {/* User message 2 */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 0 }}>
              <Box sx={{ backgroundColor: '#047857', borderRadius: '8px', borderBottomRightRadius: 0, padding: '12px 16px', maxWidth: '80%' }}>
                <Typography sx={{ fontSize: '14px', color: '#ffffff', lineHeight: 1.5 }}>
                  Exact number
                </Typography>
              </Box>
              <Box sx={{
                width: 0,
                height: 0,
                borderLeft: '0px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: '8px solid #047857',
                alignSelf: 'flex-end'
              }} />
            </Box>

            {/* Bot message 3 with Preview button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 0 }}>
              <Box sx={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '0px solid transparent',
                borderBottom: '8px solid #f3f4f6',
                alignSelf: 'flex-start'
              }} />
              <Box sx={{ backgroundColor: '#f3f4f6', borderRadius: '8px', borderBottomLeftRadius: 0, padding: '12px 16px', maxWidth: '80%' }}>
                <Typography sx={{ fontSize: '14px', color: '#111827', lineHeight: 1.5, marginBottom: 1 }}>
                  Got it. Added question for number of students.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    textTransform: 'none',
                    borderColor: '#047857',
                    color: '#047857',
                    fontSize: '12px',
                    fontWeight: 500
                  }}
                >
                  Preview
                </Button>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ margin: 0 }} />

          <Box sx={{ display: 'flex', gap: 1, padding: '36px', alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              placeholder="Ask me anything..."
              multiline
              maxRows={3}
              variant="outlined"
              size="small"
              sx={{ fontSize: '14px' }}
            />
            <Button
              size="small"
              variant="contained"
              sx={{
                textTransform: 'none',
                backgroundColor: '#047857',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                padding: '8px 16px',
                '&:hover': {
                  backgroundColor: '#065f46'
                }
              }}
            >
              Send
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    };

    const MainCard = () => {

      const TopBar = () => {
        const [isEditingTitle, setIsEditingTitle] = useState(false);
        const [titleValue, setTitleValue] = useState('');
        const editingForm = useSelector((state) => state.formEditor.editingForm);

        const handleGoBack = async () => {
          await dispatch(saveEditingFormAndNodes());
          dispatch(setEditingForm(null));
        };

        const handleStartEdit = () => { setTitleValue(editingForm?.title || ''); setIsEditingTitle(true); };

        const handleFinishEdit = () => {
          if (editingForm && titleValue.trim()) {
            dispatch(updateEditingFormMeta({ key: 'title', value: titleValue }));
          }
          setIsEditingTitle(false);
        };

        return <Box className="breadcrumb-bar" sx={{ flexShrink: 0 }}>
          {/* Breadcrumb Section with go back button on left, title centered, action buttons on right */}
          <Box sx={{ px: 3, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

            {/* Left side - Go Back Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: '120px' }}>
              <Tooltip title="Go back to forms list">
                <Button
                  onClick={handleGoBack}
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    textTransform: 'none',
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: '#f3f4f6',
                      color: '#047857'
                    }
                  }}
                >
                  Back
                </Button>
              </Tooltip>
            </Box>

            {/* Center - Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              {isEditingTitle ? (
                <TextField
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFinishEdit();
                    } else if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                    }
                  }}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#111827',
                      '& fieldset': {
                        borderColor: '#047857'
                      }
                    }
                  }}
                />
              ) : (
                <>
                  <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    {editingForm?.title || 'Untitled Form'}
                  </Typography>
                  <Tooltip title="Edit title">
                    <Button
                      onClick={handleStartEdit}
                      size="small"
                      sx={{
                        minWidth: '32px',
                        width: '32px',
                        height: '32px',
                        padding: 0,
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        borderRadius: '4px',
                        '&:hover': {
                          backgroundColor: '#f3f4f6',
                          color: '#047857'
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                </>
              )}
            </Box>

            {/* Right side - Action Buttons and Publish Button */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>

              {/* Import Tool Button */}
              <Tooltip title="Import">
                <Button
                  onClick={() => setOpenImportModal(true)}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#a6a6a6ff',
                    color: '#ffffff',
                    borderRadius: '6px',
                    '&:hover': {
                      backgroundColor: '#717171ff'
                    }
                  }}
                >
                  <FileDownloadIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>

              {/* Chat to Create Button */}
              <Tooltip title="Create with AI">
                <Button
                  onClick={() => setOpenChatToCreateModal(true)}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#a6a6a6ff',
                    color: '#ffffff',
                    borderRadius: '6px',
                    '&:hover': {
                      backgroundColor: '#717171ff'
                    }
                  }}
                >
                  <AutoFixHighIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>

              {/* Preview Button */}
              <Tooltip title="Preview">
                <Button
                  onClick={() => setOpenPreviewModal(true)}
                  variant="contained"
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#e5e7eb',
                    color: '#6b7280',
                    boxShadow: 'none',
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: '#d1d5db',
                      boxShadow: 'none'
                    }
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </Button>
              </Tooltip>

              {/* Version History Button */}
              <Tooltip title="Version history">
                <Button
                  onClick={() => setOpenVersionHistoryModal(true)}
                  variant="contained"
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#e5e7eb',
                    color: '#6b7280',
                    boxShadow: 'none',
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: '#d1d5db',
                      boxShadow: 'none'
                    }
                  }}
                >
                  <HistoryIcon fontSize="small" />
                </Button>
              </Tooltip>

              {/* Export Button */}
              <Tooltip title="Export">
                <Button
                  onClick={() => setOpenExportModal(true)}
                  variant="contained"
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#e5e7eb',
                    color: '#6b7280',
                    boxShadow: 'none',
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: '#d1d5db',
                      boxShadow: 'none'
                    }
                  }}
                >
                  <FileUploadIcon fontSize="small" />
                </Button>
              </Tooltip>


              {/* Publish Button */}
              <Button
                onClick={() => setOpenPublishModal(true)}
                variant="contained"
                sx={{
                  backgroundColor: '#047857',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  padding: '10px 20px',
                  height: '44px',
                  boxShadow: 'none',
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: '#036644',
                    boxShadow: 'none'
                  }
                }}
              >
                PUBLISH
              </Button>
            </Box>
          </Box>
        </Box>
      };

      const TabsRow = () => {
        const selectedNodeId = useSelector(state => state.formEditor.selectedNodeId);
        const nodesById = useSelector(state => state.formEditor.nodesById);
        const [draggedTabId, setDraggedTabId] = useState(null);
        const [dragOverTabId, setDragOverTabId] = useState(null);

        // Get tab IDs from editingForm structure, but read fresh data from nodesById
        const tabIds = Object.values(editingForm?.properties || {}).map(tab => tab['x-id']);
        // Build properties object with fresh data from nodesById
        const properties = {};
        tabIds.forEach(tabId => {
          if (nodesById[tabId]) {
            properties[tabId] = nodesById[tabId];
          }
        });

        // Find which tab is currently selected (same logic as SectionCards)
        const findTabForNode = (nodeId) => {
          if (!nodeId) return tabIds[0];
          if (tabIds.includes(nodeId)) return nodeId;

          // Search through tabs to find which one contains this node
          for (const tab of Object.values(properties || {})) {
            if (tab.properties) {
              const allNodesInTab = Object.values(tab.properties);
              const nodeInTab = allNodesInTab.find(n => n['x-id'] === nodeId);
              if (nodeInTab) {
                return tab['x-id'];
              }
            }
          }
          return tabIds[0];
        };

        const selectedTabId = findTabForNode(selectedNodeId);

        const handleTabChange = (event, newValue) => {
          // When clicking a tab, select that tab's x-id
          dispatch(setSelectedNode(newValue));
        };

        // State for editing tab names
        const [editingTabId, setEditingTabId] = useState(null);
        const [editingTabValue, setEditingTabValue] = useState('');

        const handleTabNameChange = (tabId, newTitle) => {
          if (!newTitle.trim()) return;
          dispatch(updateNode({ nodeId: tabId, changes: { title: newTitle.trim() } }));
        };

        const handleStartEditingTab = (e, tabId, currentTitle) => {
          e.stopPropagation();
          setEditingTabId(tabId);
          setEditingTabValue(currentTitle || '');
        };

        const handleFinishEditingTab = () => {
          if (editingTabId && editingTabValue.trim()) {
            handleTabNameChange(editingTabId, editingTabValue);
          }
          setEditingTabId(null);
          setEditingTabValue('');
        };

        const handleAddTab = () => {
          const tabCount = Object.keys(properties).length;
          // First create the section node to get its x-id
          const newTabNode = newNode({
            type: 'object',
            title: `Section ${tabCount + 1}`,
            description: `Section ${tabCount + 1} Description`,
            'x-widget': 'section',
            properties: {}
          });
          // Create a default header for the new section with the parent reference
          const defaultHeader = newNode({
            type: 'string',
            title: `Section ${tabCount + 1} Header`,
            'x-widget': 'header',
            'x-parent-id': newTabNode['x-id'],
          });
          // Add the header to the section's properties
          newTabNode.properties[defaultHeader['x-id']] = defaultHeader;

          // Generate a unique key that doesn't collide with existing keys
          const existingKeys = Object.keys(editingForm.properties || {});
          let newTabKey = `section${tabCount}`;
          let counter = tabCount;
          while (existingKeys.includes(newTabKey)) {
            counter++;
            newTabKey = `section${counter}`;
          }

          // Use addTab action - only adds the new tab without rebuilding existing nodes
          dispatch(addTab({ tabKey: newTabKey, tab: newTabNode }));
          // Select the new tab
          dispatch(setSelectedNode(newTabNode['x-id']));
        };

        const handleDeleteTab = (tabId) => {
          // Don't allow deleting the last tab
          const tabKeys = Object.keys(editingForm.properties || {});
          if (tabKeys.length <= 1) {
            return;
          }

          // Use removeTab action - only removes this tab without rebuilding other nodes
          dispatch(removeTab({ tabId }));

          // If the deleted tab was selected, select another tab
          if (selectedNodeId === tabId) {
            const remainingTabIds = tabIds.filter(id => id !== tabId);
            if (remainingTabIds.length > 0) {
              dispatch(setSelectedNode(remainingTabIds[0]));
            }
          }
        };

        const AddTabButton = () => {
          return <Tab label={
            <Box onClick={(e) => { e.stopPropagation(); handleAddTab(); }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1, color: '#047857', padding: '4px', fontSize: '14px', fontWeight: 500,
                backgroundColor: '#d6ece0ff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                alignSelf: 'center', textTransform: 'none', gap: '6px', flexShrink: 0, '&:hover': { backgroundColor: '#94d0b4ff' }
              }}
              children={<AddIcon sx={{ fontSize: '18px' }} />}>
            </Box>
          } />
        };

        return <Box sx={{ borderBottom: '1px solid #e5e7eb', px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Tabs
            value={selectedTabId}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': { color: '#6b7280', textTransform: 'none', fontWeight: 500, '&.Mui-selected': { color: '#047857' } },
              '& .MuiTabs-indicator': { backgroundColor: '#047857', height: '3px', zIndex: 1 }, flex: 1, 
              '& > div': { display: 'flex', alignItems: 'center' }
            }}
          >
            {Object.values(properties).map((property) => {
              const propertyKey = property["x-id"];
              const isEditing = editingTabId === propertyKey;
              return <Tab
                key={propertyKey}
                value={propertyKey}
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isEditing ? (
                    <TextField
                      autoFocus
                      size="small"
                      value={editingTabValue}
                      onChange={(e) => setEditingTabValue(e.target.value)}
                      onBlur={handleFinishEditingTab}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleFinishEditingTab();
                        } else if (e.key === 'Escape') {
                          setEditingTabId(null);
                          setEditingTabValue('');
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          fontSize: '14px',
                          height: '28px',
                          minWidth: '80px',
                          '& fieldset': { borderColor: '#047857' },
                          '&:hover fieldset': { borderColor: '#047857' },
                          '&.Mui-focused fieldset': { borderColor: '#047857' },
                        },
                        '& .MuiOutlinedInput-input': {
                          padding: '4px 8px',
                        }
                      }}
                    />
                  ) : (
                    <span
                      style={{ cursor: 'pointer' }}
                      onDoubleClick={(e) => handleStartEditingTab(e, propertyKey, property.title)}
                    >
                      {property.title}
                    </span>
                  )}
                  <CloseIcon
                    sx={{ fontSize: '16px', color: '#6b7280', cursor: 'pointer', marginLeft: '4px', '&:hover': { color: '#dc2626' } }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteTab(propertyKey); }}
                  />
                </Box>}
                sx={{
                  position: 'relative', opacity: draggedTabId === propertyKey ? 0.5 : 1,
                  backgroundColor: dragOverTabId === propertyKey ? '#dbeafe' : 'transparent',
                  borderLeft: dragOverTabId === propertyKey ? '4px solid #047857' : 'transparent',
                  transition: 'all 0.1s', minWidth: 0, cursor: 'grab', '&:active': { cursor: 'grabbing' }, '&:hover': { opacity: 0.8 }
                }}
              />
            })}
            <AddTabButton />
          </Tabs>
        </Box>
      };

      const MainContent = () => {
        // Get selected node from Redux
        // const selectedNode = useSelector(state => state.formEditor.selectedNode);

        // Modal state for component type selection
        const [openComponentModal, setOpenComponentModal] = useState(false);
        const [openSubComponentModal, setOpenSubComponentModal] = useState(false);
        const [subComponentParentPath, setSubComponentParentPath] = useState([]);
        const [showCloneSelection, setShowCloneSelection] = useState(false);

        // // Get the currently selected property
        // const selectedProperty = selectedPropertyKey && editingForm?.properties?.[selectedPropertyKey];
        // const itemProperties = selectedProperty?.items?.properties || {};
        // const itemPropertyKeys = Object.keys(itemProperties);

        // Helper to update item properties
        const updateItemProperty = (itemKey, property, value) => {
          const updatedProperties = { ...editingForm.properties };
          updatedProperties[selectedPropertyKey] = {
            ...selectedProperty,
            items: {
              ...selectedProperty.items,
              properties: {
                ...itemProperties,
                [itemKey]: {
                  ...itemProperties[itemKey],
                  [property]: value
                }
              }
            }
          };
          dispatch(setEditingForm({ ...editingForm, properties: updatedProperties }));
        };

        const handleAddItem = (componentType = 'text') => {
          if (selectedProperty && editingForm) {
            const newItemKey = `item${itemPropertyKeys.length + 1}`;

            // Create item property based on component type
            let newItemProperty = {
              type: 'string',
              title: `Field ${itemPropertyKeys.length + 1}`,
              description: '',
              'x-component': componentType
            };

            // Add specific properties for each component type
            if (componentType === 'header') {
              newItemProperty.title = 'Header Title';
              newItemProperty.description = 'Header description';
            } else if (componentType === 'multiple-choice' || componentType === 'radio') {
              newItemProperty.title = 'Multiple Choice Question';
              newItemProperty.enum = ['Option 1', 'Option 2', 'Option 3'];
              newItemProperty['x-component'] = 'multiple-choice';
            }

            const updatedProperties = { ...editingForm.properties };
            updatedProperties[selectedPropertyKey] = {
              ...selectedProperty,
              items: {
                ...selectedProperty.items,
                properties: {
                  ...itemProperties,
                  [newItemKey]: newItemProperty
                }
              }
            };

            dispatch(setEditingForm({ ...editingForm, properties: updatedProperties }));
            setOpenComponentModal(false);
          }
        };

        const handleDeleteItem = (nodeId) => {
          if (!nodeId || !editingForm) return;

          // Find all descendants recursively (nodes with x-parent-id chain)
          const findDescendantIds = (parentXId, allNodes) => {
            const directChildren = Object.values(allNodes).filter(
              n => n['x-parent-id'] === parentXId
            );
            let allDescendantIds = directChildren.map(n => n['x-id']);
            for (const child of directChildren) {
              allDescendantIds = [...allDescendantIds, ...findDescendantIds(child['x-id'], allNodes)];
            }
            return allDescendantIds;
          };

          // Recursively delete the node and its descendants from the form
          const deleteFromNode = (currentNode) => {
            if (!currentNode.properties) return currentNode;

            // Get all node IDs to delete (the target node + all descendants)
            const descendantIds = findDescendantIds(nodeId, currentNode.properties);
            const idsToDelete = [nodeId, ...descendantIds];

            // Check if any of the nodes to delete exist in this level
            const hasNodesToDelete = Object.values(currentNode.properties).some(
              prop => idsToDelete.includes(prop['x-id'])
            );

            if (hasNodesToDelete) {
              // Filter out all nodes that should be deleted
              const updatedProperties = {};
              for (const [key, child] of Object.entries(currentNode.properties)) {
                if (!idsToDelete.includes(child['x-id'])) {
                  updatedProperties[key] = child;
                }
              }
              return { ...currentNode, properties: updatedProperties };
            }

            // Recursively check children
            const updatedProperties = {};
            for (const [key, child] of Object.entries(currentNode.properties)) {
              updatedProperties[key] = deleteFromNode(child);
            }
            return { ...currentNode, properties: updatedProperties };
          };

          const updatedForm = deleteFromNode(editingForm);
          dispatch(setEditingForm(updatedForm));

          // Clear selection if deleted node was selected
          dispatch(setSelectedNode(null));
        };

        const handleCopyItem = (node, parentId) => {
          console.log('handleCopyItem called', { node, parentId, editingForm });
          if (!node || !editingForm) {
            console.log('Early return - missing node or editingForm');
            return;
          }

          // Find the section containing this node to get all siblings
          const findSectionProperties = (currentNode) => {
            if (currentNode['x-id'] === parentId) {
              return currentNode.properties || {};
            }
            if (currentNode.properties) {
              for (const child of Object.values(currentNode.properties)) {
                const result = findSectionProperties(child);
                if (result) return result;
              }
            }
            return null;
          };

          const sectionProperties = findSectionProperties(editingForm);

          // Find all descendants recursively (nodes with x-parent-id chain)
          const findDescendants = (parentXId, allNodes) => {
            const directChildren = Object.values(allNodes).filter(
              n => n['x-parent-id'] === parentXId
            );
            let allDescendants = [...directChildren];
            for (const child of directChildren) {
              allDescendants = [...allDescendants, ...findDescendants(child['x-id'], allNodes)];
            }
            return allDescendants;
          };

          const originalNodeId = node['x-id'];
          const descendants = sectionProperties ? findDescendants(originalNodeId, sectionProperties) : [];

          // Create a map of old IDs to new IDs for updating x-parent-id references
          const idMap = {};

          // Clone the main node
          const copiedNode = JSON.parse(JSON.stringify(node));
          const originalParentId = copiedNode['x-parent-id']; // Preserve the original parent reference
          delete copiedNode['x-id'];
          delete copiedNode['$id'];

          const clonedNode = newNode({
            ...copiedNode,
            title: copiedNode.title ? `${copiedNode.title} (Copy)` : 'Untitled (Copy)',
          });

          // Preserve x-parent-id - cloned node should point to the same parent as the original
          if (originalParentId) {
            clonedNode['x-parent-id'] = originalParentId;
          }

          // Map original ID to new ID
          idMap[originalNodeId] = clonedNode['x-id'];

          // Clone all descendants with new IDs
          const clonedDescendants = descendants.map(descendant => {
            const copiedDescendant = JSON.parse(JSON.stringify(descendant));
            const originalDescendantId = copiedDescendant['x-id'];
            delete copiedDescendant['x-id'];
            delete copiedDescendant['$id'];

            const clonedDescendant = newNode({
              ...copiedDescendant,
            });

            // Map original ID to new ID
            idMap[originalDescendantId] = clonedDescendant['x-id'];

            return { original: descendant, cloned: clonedDescendant };
          });

          // Update x-parent-id references in cloned descendants
          clonedDescendants.forEach(({ cloned }) => {
            if (cloned['x-parent-id'] && idMap[cloned['x-parent-id']]) {
              cloned['x-parent-id'] = idMap[cloned['x-parent-id']];
            }
          });

          console.log('Cloned node created', clonedNode);
          console.log('Cloned descendants', clonedDescendants);
          console.log('ID map', idMap);

          // Find parent and add all cloned nodes
          const addToParent = (currentNode) => {
            if (currentNode['x-id'] === parentId) {
              console.log('Found parent, adding cloned node and descendants');
              const newProperties = { ...currentNode.properties };

              // Add the main cloned node
              newProperties[clonedNode['x-id']] = clonedNode;

              // Add all cloned descendants
              clonedDescendants.forEach(({ cloned }) => {
                newProperties[cloned['x-id']] = cloned;
              });

              return { ...currentNode, properties: newProperties };
            }
            if (currentNode.properties) {
              const updatedProperties = {};
              for (const [key, child] of Object.entries(currentNode.properties)) {
                updatedProperties[key] = addToParent(child);
              }
              return { ...currentNode, properties: updatedProperties };
            }
            return currentNode;
          };

          const updatedForm = addToParent(editingForm);
          console.log('Updated form', updatedForm);
          dispatch(setEditingForm(updatedForm));
        };

        const handleAddCondition = () => {
          setConditions([...conditions, { id: Date.now(), operator: '', value: '' }]);
        };

        const handleRemoveCondition = (conditionId) => {
          setConditions(conditions.filter(c => c.id !== conditionId));
        };

        const handleUpdateCondition = (conditionId, field, value) => {
          setConditions(conditions.map(c =>
            c.id === conditionId ? { ...c, [field]: value } : c
          ));
        };

        const handleToggleRequired = (itemKey) => {
          if (selectedProperty && editingForm) {
            const currentRequired = selectedProperty.items?.required || [];
            const isCurrentlyRequired = currentRequired.includes(itemKey);

            // Toggle required status
            const newRequired = isCurrentlyRequired
              ? currentRequired.filter(key => key !== itemKey)
              : [...currentRequired, itemKey];

            const updatedProperties = { ...editingForm.properties };
            updatedProperties[selectedPropertyKey] = {
              ...selectedProperty,
              items: {
                ...selectedProperty.items,
                required: newRequired
              }
            };

            dispatch(setEditingForm({ ...editingForm, properties: updatedProperties }));
          }
        };

        const handleAddSubcomponent = (path, componentType = 'text') => {
          if (selectedProperty && editingForm && path.length > 0) {
            // Helper function to navigate and update nested item
            const updateNestedItem = (properties, pathArray, depth = 0) => {
              const currentKey = pathArray[depth];

              if (depth === pathArray.length - 1) {
                // We've reached the parent item - add the subcomponent here
                const parentItem = properties[currentKey];
                const existingSubcomponents = parentItem?.properties || {};
                const subcomponentKeys = Object.keys(existingSubcomponents);
                const newSubKey = `subitem${Date.now()}`; // Use timestamp for uniqueness

                // Create new subcomponent based on type
                let newSubcomponent = {
                  type: 'string',
                  title: `Subfield ${subcomponentKeys.length + 1}`,
                  description: '',
                  'x-component': componentType
                };

                if (componentType === 'header') {
                  newSubcomponent.title = 'Sub Header';
                  newSubcomponent.description = 'Sub description';
                } else if (componentType === 'multiple-choice') {
                  newSubcomponent.title = 'Sub Multiple Choice';
                  newSubcomponent.enum = ['Option 1', 'Option 2', 'Option 3'];
                }

                return {
                  ...properties,
                  [currentKey]: {
                    ...parentItem,
                    type: 'object',
                    properties: {
                      ...existingSubcomponents,
                      [newSubKey]: newSubcomponent
                    }
                  }
                };
              } else {
                // Recurse deeper
                const currentItem = properties[currentKey];
                return {
                  ...properties,
                  [currentKey]: {
                    ...currentItem,
                    properties: updateNestedItem(currentItem.properties || {}, pathArray, depth + 1)
                  }
                };
              }
            };

            const updatedProperties = { ...editingForm.properties };
            updatedProperties[selectedPropertyKey] = {
              ...selectedProperty,
              items: {
                ...selectedProperty.items,
                properties: updateNestedItem(itemProperties, path, 0)
              }
            };

            dispatch(setEditingForm({ ...editingForm, properties: updatedProperties }));
            setOpenSubComponentModal(false);
          }
        };

        // Recursive function to render a card (called by individual card renderers)
        const renderSubcomponents = (itemKey, item, depth = 0, parentPath = []) => {
          const subProperties = item?.properties || {};
          const subPropertyKeys = Object.keys(subProperties);

          if (subPropertyKeys.length === 0) return null;

          const currentPath = [...parentPath, itemKey];

          return (
            <Box sx={{ mt: 2, pl: depth === 0 ? 2 : 3 }}>
              {subPropertyKeys.map((subKey, subIndex) => {
                const subItem = subProperties[subKey];
                return renderCard(subKey, subItem, subIndex, depth + 1, currentPath);
              })}
            </Box>
          );
        };

        const MainContent = () => {

          const LeftSidebar = () => {
            return <Box sx={{
              width: '80px', borderRight: '1px solid #e5e7eb', backgroundColor: '#ffffff', flexShrink: 0, p: 2, display: 'flex',
              flexDirection: 'column', gap: 1, alignItems: 'center', overflowY: 'auto'
            }}>

              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#111827', textAlign: 'center' }} children={"ADD"} />

              {/* Question Type Buttons */}
              <Tooltip title="Header">
                <Button
                  size="small"
                  sx={{
                    minWidth: '40px', width: '40px', height: '40px', padding: 0, backgroundColor: '#f3f4f6',
                    color: '#6b7280', borderRadius: '6px', cursor: 'grab', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': { backgroundColor: '#e5e7eb' },
                    '&:active': { cursor: 'grabbing' }
                  }}
                >
                  <TitleIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Long Text">
                <Button
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <TextFieldsIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Short Text">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Short Text')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <TextFieldsIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Multiple Choice">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Multiple Choice')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <RadioButtonCheckedIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Dropdown">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Dropdown')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <DropdownIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Yes/No">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Yes/No')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <ThumbsUpDownIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Checkbox">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Checkbox')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <CheckboxIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Number">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Number')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <NumbersIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Date">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Date')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <CalendarMonthIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Opinion Scale">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Opinion Scale')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <AssignmentIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
              <Tooltip title="Rating">
                <Button
                  draggable
                  onDragStart={() => handleComponentDragStart('Rating')}
                  size="small"
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    borderRadius: '6px',
                    cursor: 'grab',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      backgroundColor: '#e5e7eb'
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    }
                  }}
                >
                  <StarIcon sx={{ fontSize: '20px' }} />
                </Button>
              </Tooltip>
            </Box>
          };

          const MainColumn = () => {
            const { scrollPositionsRef, setScrollPosition } = useContext(EditorStateContext);
            const scrollContainerRef = useRef(null);
            const editingForm = useSelector(state => state.formEditor.editingForm);
            const selectedNodeId = useSelector(state => state.formEditor.selectedNodeId);

            // Get all tab IDs (root properties of the form)
            const tabIds = Object.values(editingForm?.properties || {}).map(tab => tab['x-id']);

            // Find which tab is currently selected
            const findTabForNode = (nodeId) => {
              if (!nodeId) return tabIds[0];
              if (tabIds.includes(nodeId)) return nodeId;
              for (const tab of Object.values(editingForm?.properties || {})) {
                if (tab.properties && tab.properties[nodeId]) {
                  return tab['x-id'];
                }
                const allNodesInTab = Object.values(tab.properties || {});
                const nodeInTab = allNodesInTab.find(n => n['x-id'] === nodeId);
                if (nodeInTab) {
                  return tab['x-id'];
                }
              }
              return tabIds[0];
            };

            const selectedTabId = findTabForNode(selectedNodeId);
            const prevTabIdRef = useRef(selectedTabId);

            // Save scroll position continuously as user scrolls
            const handleScroll = useCallback(() => {
              if (scrollContainerRef.current) {
                globalScrollPositionsRef.current[selectedTabId] = scrollContainerRef.current.scrollTop;
              }
            }, [selectedTabId]);

            // Restore scroll position after render (handles both tab changes and content updates)
            useEffect(() => {
              const savedPosition = globalScrollPositionsRef.current[selectedTabId] || 0;
              if (scrollContainerRef.current && scrollContainerRef.current.scrollTop !== savedPosition) {
                scrollContainerRef.current.scrollTop = savedPosition;
              }
              prevTabIdRef.current = selectedTabId;
            });

            // Get nodesById for fresh data
            const nodesById = useSelector(state => state.formEditor.nodesById);

            // Get the selected tab from nodesById (fresh data)
            const selectedTab = nodesById[selectedTabId];
            const parentId = selectedTabId;

            // Get node IDs from the editingForm tree structure, but we'll render using nodesById
            const selectedTabFromTree = Object.values(editingForm?.properties || {}).find(
              tab => tab['x-id'] === selectedTabId
            ) || Object.values(editingForm?.properties || {})[0];

            // Get top-level node IDs (those without x-parent-id) from the tree
            const topLevelNodeIds = selectedTabFromTree?.properties
              ? Object.entries(selectedTabFromTree.properties)
                  .filter(([k, v]) => !v['x-parent-id'])
                  .map(([k, v]) => v['x-id'])
              : [];

            // Build allSiblings from nodesById for fresh data (including nested children)
            const allSiblings = useMemo(() => {
              const siblings = {};
              const addNodeAndChildren = (properties) => {
                if (!properties) return;
                Object.keys(properties).forEach(key => {
                  const nodeId = properties[key]['x-id'];
                  if (nodesById[nodeId]) {
                    siblings[key] = nodesById[nodeId];
                    // Recursively add children
                    if (nodesById[nodeId].properties) {
                      addNodeAndChildren(nodesById[nodeId].properties);
                    }
                  }
                });
              };
              if (selectedTabFromTree?.properties) {
                addNodeAndChildren(selectedTabFromTree.properties);
              }
              return siblings;
            }, [selectedTabFromTree?.properties, nodesById]);

            // Render section cards inline (not as a nested component to avoid remounting)
            const sectionCardsContent = (
              <>
                {topLevelNodeIds.map((nodeId) => (
                  <QuestionCard
                    key={nodeId}
                    nodeId={nodeId}
                    parentId={parentId}
                    allSiblings={allSiblings}
                    onCopy={handleCopyItem}
                    onDelete={handleDeleteItem}
                    setSubComponentParentPath={setSubComponentParentPath}
                    setOpenSubComponentModal={setOpenSubComponentModal}
                  />
                ))}

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    // Set parent to current tab for adding top-level field
                    setSubComponentParentPath(parentId);
                    setOpenComponentModal(true);
                  }}
                  sx={{ borderColor: '#047857', color: '#047857', textTransform: 'none', py: 2, '&:hover': { borderColor: '#036644', backgroundColor: 'rgba(4, 120, 87, 0.04)' } }}
                  children={"Add Question"}
                />
              </>
            );

            return <Box
              ref={scrollContainerRef}
              onScroll={handleScroll}
              sx={{
                flex: 1, p: 3, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column',
                gap: 2, backgroundColor: isDragOver ? '#d0eee4ff' : '#e8f6f2', transition: 'background-color 0.2s'
              }}>
              {sectionCardsContent}
            </Box>
          };

          return <Box sx={{
            flex: { xs: '0 0 100%', md: `1 1 auto` }, display: 'flex', flexDirection: 'column',
            borderBottom: { xs: '1px solid #e5e7eb', md: 'none' }, minWidth: '0', minHeight: '0'
          }}>
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: 0 }}>
              <LeftSidebar />
              <MainColumn />
            </Box>
          </Box>
        };

        // Reusable Collapsible Section Component
        const CollapsibleSection = ({ title, children, defaultExpanded = true }) => {
          const [isExpanded, setIsExpanded] = useState(defaultExpanded);

          return (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  mb: isExpanded ? 2 : 0,
                  py: 0.5,
                  '&:hover': { backgroundColor: '#f9fafb' },
                  borderRadius: 1,
                  mx: -1,
                  px: 1,
                }}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                  {title}
                </Typography>
                {isExpanded ? (
                  <ExpandLessIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                ) : (
                  <ExpandMoreIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                )}
              </Box>
              {isExpanded && children}
            </>
          );
        };

        // Styling Section Component for Right Sidebar
        const StylingSection = ({ selectedNode, updateNode }) => {
          // Get current styles from node
          const currentStyles = selectedNode['x-style'] || {};
          const labelStyles = selectedNode['x-label-style'] || {};
          const inputStyles = selectedNode['x-input-style'] || {};

          // Predefined color palette
          const colorPalette = [
            '#000000', '#374151', '#6b7280', '#9ca3af',
            '#ef4444', '#f97316', '#eab308', '#22c55e',
            '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
            '#ffffff', '#f9fafb', '#f3f4f6', '#e5e7eb',
          ];

          // Helper to update nested style objects
          const updateStyle = (styleKey, property, value) => {
            const currentStyleObj = selectedNode[styleKey] || {};
            const updatedStyle = { ...currentStyleObj };

            if (value === '' || value === undefined) {
              delete updatedStyle[property];
            } else {
              updatedStyle[property] = value;
            }

            // If empty object, set to undefined to clean up
            updateNodeProp(styleKey, Object.keys(updatedStyle).length > 0 ? updatedStyle : undefined);
          };

          // Color picker component
          const ColorPicker = ({ label, value, onChange }) => {
            const [showPalette, setShowPalette] = useState(false);

            return (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5 }}>{label}</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box
                    onClick={() => setShowPalette(!showPalette)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      border: '1px solid #d1d5db',
                      backgroundColor: value || '#ffffff',
                      cursor: 'pointer',
                      flexShrink: 0,
                      '&:hover': { borderColor: '#9ca3af' }
                    }}
                  />
                  <TextField
                    size="small"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    sx={{ flex: 1, '& input': { fontSize: '12px', fontFamily: 'monospace' } }}
                  />
                  {value && (
                    <Button
                      size="small"
                      onClick={() => onChange('')}
                      sx={{ minWidth: 'auto', p: 0.5, color: '#9ca3af' }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </Button>
                  )}
                </Box>
                {showPalette && (
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: 0.5,
                    mt: 1,
                    p: 1,
                    backgroundColor: '#f9fafb',
                    borderRadius: 1,
                    border: '1px solid #e5e7eb'
                  }}>
                    {colorPalette.map((color) => (
                      <Box
                        key={color}
                        onClick={() => { onChange(color); setShowPalette(false); }}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 0.5,
                          backgroundColor: color,
                          border: color === '#ffffff' ? '1px solid #d1d5db' : '1px solid transparent',
                          cursor: 'pointer',
                          '&:hover': { transform: 'scale(1.1)', boxShadow: 1 }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            );
          };

          return (
            <CollapsibleSection title="Styling" defaultExpanded={false}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Text Colors */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#374151', mb: 1.5 }}>
                    Text Colors
                  </Typography>

                  <ColorPicker
                    label="Label Color"
                    value={labelStyles.color}
                    onChange={(val) => updateStyle('x-label-style', 'color', val)}
                  />

                  <ColorPicker
                    label="Description Color"
                    value={currentStyles.descriptionColor}
                    onChange={(val) => updateStyle('x-style', 'descriptionColor', val)}
                  />

                  <ColorPicker
                    label="Input Text Color"
                    value={inputStyles.color}
                    onChange={(val) => updateStyle('x-input-style', 'color', val)}
                  />
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Background Colors */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#374151', mb: 1.5 }}>
                    Backgrounds
                  </Typography>

                  <ColorPicker
                    label="Field Background"
                    value={currentStyles.backgroundColor}
                    onChange={(val) => updateStyle('x-style', 'backgroundColor', val)}
                  />

                  <ColorPicker
                    label="Input Background"
                    value={inputStyles.backgroundColor}
                    onChange={(val) => updateStyle('x-input-style', 'backgroundColor', val)}
                  />
                </Box>

                <Divider sx={{ my: 1 }} />

                {/* Border Styles */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#374151', mb: 1.5 }}>
                    Borders
                  </Typography>

                  <ColorPicker
                    label="Border Color"
                    value={currentStyles.borderColor}
                    onChange={(val) => updateStyle('x-style', 'borderColor', val)}
                  />

                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5 }}>Border Width</Typography>
                    <Select
                      size="small"
                      fullWidth
                      value={currentStyles.borderWidth || ''}
                      onChange={(e) => updateStyle('x-style', 'borderWidth', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">Default</MenuItem>
                      <MenuItem value="0px">None</MenuItem>
                      <MenuItem value="1px">1px</MenuItem>
                      <MenuItem value="2px">2px</MenuItem>
                      <MenuItem value="3px">3px</MenuItem>
                      <MenuItem value="4px">4px</MenuItem>
                    </Select>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5 }}>Border Radius</Typography>
                    <Select
                      size="small"
                      fullWidth
                      value={currentStyles.borderRadius || ''}
                      onChange={(e) => updateStyle('x-style', 'borderRadius', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">Default</MenuItem>
                      <MenuItem value="0px">None (Square)</MenuItem>
                      <MenuItem value="4px">Small (4px)</MenuItem>
                      <MenuItem value="8px">Medium (8px)</MenuItem>
                      <MenuItem value="12px">Large (12px)</MenuItem>
                      <MenuItem value="16px">Extra Large (16px)</MenuItem>
                      <MenuItem value="9999px">Full (Pill)</MenuItem>
                    </Select>
                  </Box>
                </Box>

                {/* Preview */}
                {(Object.keys(currentStyles).length > 0 || Object.keys(labelStyles).length > 0 || Object.keys(inputStyles).length > 0) && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ mb: 1 }}>
                      <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#374151', mb: 1 }}>
                        Preview
                      </Typography>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: currentStyles.borderRadius || '8px',
                          backgroundColor: currentStyles.backgroundColor || '#f9fafb',
                          border: `${currentStyles.borderWidth || '1px'} solid ${currentStyles.borderColor || '#e5e7eb'}`,
                        }}
                      >
                        <Typography sx={{ fontSize: '13px', fontWeight: 500, mb: 0.5, color: labelStyles.color || '#374151' }}>
                          {selectedNode.title || 'Field Label'}
                        </Typography>
                        <Typography sx={{ fontSize: '11px', mb: 1, color: currentStyles.descriptionColor || '#6b7280' }}>
                          {selectedNode.description || 'Field description'}
                        </Typography>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: '4px',
                            backgroundColor: inputStyles.backgroundColor || '#ffffff',
                            border: '1px solid #d1d5db',
                            color: inputStyles.color || '#374151',
                            fontSize: '12px',
                          }}
                        >
                          Sample input value
                        </Box>
                      </Box>
                    </Box>

                    {/* Reset button */}
                    <Button
                      size="small"
                      onClick={() => {
                        updateNodeProp('x-style', undefined);
                        updateNodeProp('x-label-style', undefined);
                        updateNodeProp('x-input-style', undefined);
                      }}
                      sx={{
                        textTransform: 'none',
                        color: '#ef4444',
                        fontSize: '12px',
                        justifyContent: 'flex-start',
                        '&:hover': { backgroundColor: '#fef2f2' }
                      }}
                    >
                      Reset all styles
                    </Button>
                  </>
                )}
              </Box>
            </CollapsibleSection>
          );
        };

        // Conditional Logic Section Component for Right Sidebar
        const ConditionalLogicSection = ({ selectedNode, selectedNodeId, updateNode }) => {
          const nodesById = useSelector(state => state.formEditor.nodesById);

          // Get all available fields that can be used as conditions (excluding current node)
          const availableFields = Object.values(nodesById).filter(node =>
            node['x-id'] !== selectedNodeId &&
            node['x-widget'] !== 'section' &&
            node['x-widget'] !== 'root' &&
            node['x-widget'] !== 'header'
          );

          // Get current conditions from node
          const showIfConditions = selectedNode['x-show-if']?.conditions || [];
          const showIfLogic = selectedNode['x-show-if']?.logic || 'all';

          // Logic operator options
          const logicOptions = [
            { value: 'all', label: 'All conditions are met', connector: 'AND' },
            { value: 'any', label: 'Any condition is met', connector: 'OR' },
            { value: 'none', label: 'None of the conditions are met', connector: 'NOR' },
          ];

          // Operators based on field type
          const getOperatorsForType = (fieldType) => {
            const commonOperators = [
              { value: 'equals', label: 'Equals' },
              { value: 'not_equals', label: 'Does not equal' },
            ];

            if (fieldType === 'string') {
              return [
                ...commonOperators,
                { value: 'contains', label: 'Contains' },
                { value: 'not_contains', label: 'Does not contain' },
                { value: 'is_empty', label: 'Is empty' },
                { value: 'is_not_empty', label: 'Is not empty' },
              ];
            }

            if (fieldType === 'number') {
              return [
                ...commonOperators,
                { value: 'greater_than', label: 'Greater than' },
                { value: 'less_than', label: 'Less than' },
                { value: 'greater_than_or_equal', label: 'Greater than or equal' },
                { value: 'less_than_or_equal', label: 'Less than or equal' },
              ];
            }

            if (fieldType === 'boolean') {
              return [
                { value: 'equals', label: 'Is' },
              ];
            }

            if (fieldType === 'array') {
              return [
                { value: 'contains', label: 'Includes' },
                { value: 'not_contains', label: 'Does not include' },
                { value: 'is_empty', label: 'Is empty' },
                { value: 'is_not_empty', label: 'Is not empty' },
              ];
            }

            return commonOperators;
          };

          // Update logic operator
          const handleUpdateLogic = (newLogic) => {
            updateNode('x-show-if', {
              logic: newLogic,
              conditions: showIfConditions
            });
          };

          // Add a new condition
          const handleAddCondition = () => {
            const newCondition = {
              id: `cond_${Date.now()}`,
              field: '',
              operator: 'equals',
              value: '',
            };
            updateNode('x-show-if', {
              logic: showIfLogic,
              conditions: [...showIfConditions, newCondition]
            });
          };

          // Update a condition
          const handleUpdateCondition = (index, key, value) => {
            const updatedConditions = [...showIfConditions];
            updatedConditions[index] = { ...updatedConditions[index], [key]: value };

            // Reset value when field or operator changes
            if (key === 'field' || key === 'operator') {
              if (key === 'field') {
                updatedConditions[index].operator = 'equals';
              }
              if (['is_empty', 'is_not_empty'].includes(updatedConditions[index].operator)) {
                updatedConditions[index].value = '';
              }
            }

            updateNode('x-show-if', {
              logic: showIfLogic,
              conditions: updatedConditions
            });
          };

          // Remove a condition
          const handleRemoveCondition = (index) => {
            const updatedConditions = showIfConditions.filter((_, i) => i !== index);
            if (updatedConditions.length > 0) {
              updateNode('x-show-if', {
                logic: showIfLogic,
                conditions: updatedConditions
              });
            } else {
              updateNode('x-show-if', undefined);
            }
          };

          // Get the current logic option for display
          const currentLogicOption = logicOptions.find(opt => opt.value === showIfLogic) || logicOptions[0];

          // Get value input based on field type and operator
          const getValueInput = (condition, index, field) => {
            if (['is_empty', 'is_not_empty'].includes(condition.operator)) {
              return null;
            }

            if (!field) {
              return (
                <TextField
                  size="small"
                  fullWidth
                  value={condition.value || ''}
                  onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                  placeholder="Value"
                  disabled
                />
              );
            }

            const fieldType = field.type;
            const widgetType = field['x-widget'];

            // For multiple choice / checkbox / dropdown with enum
            if ((widgetType === 'multiple-choice' || widgetType === 'checkbox' || widgetType === 'dropdown') && field.enum) {
              return (
                <Select
                  size="small"
                  fullWidth
                  value={condition.value || ''}
                  onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>Select value</MenuItem>
                  {field.enum.map((opt, optIndex) => (
                    <MenuItem key={optIndex} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              );
            }

            // For checkbox with items.enum
            if (widgetType === 'checkbox' && field.items?.enum) {
              return (
                <Select
                  size="small"
                  fullWidth
                  value={condition.value || ''}
                  onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>Select value</MenuItem>
                  {field.items.enum.map((opt, optIndex) => (
                    <MenuItem key={optIndex} value={opt}>{opt}</MenuItem>
                  ))}
                </Select>
              );
            }

            // For yes/no (boolean)
            if (fieldType === 'boolean' || widgetType === 'yes-no') {
              return (
                <Select
                  size="small"
                  fullWidth
                  value={condition.value === true ? 'true' : condition.value === false ? 'false' : ''}
                  onChange={(e) => handleUpdateCondition(index, 'value', e.target.value === 'true')}
                  displayEmpty
                >
                  <MenuItem value="" disabled>Select value</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              );
            }

            // For numbers
            if (fieldType === 'number') {
              return (
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  value={condition.value ?? ''}
                  onChange={(e) => handleUpdateCondition(index, 'value', e.target.value ? Number(e.target.value) : '')}
                  placeholder="Value"
                />
              );
            }

            // Default text input
            return (
              <TextField
                size="small"
                fullWidth
                value={condition.value || ''}
                onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                placeholder="Value"
              />
            );
          };

          return (
            <CollapsibleSection title="Conditional Logic" defaultExpanded={false}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                  Show this field only when conditions are met
                </Typography>

                {/* Logic operator selector - show when there are conditions */}
                {showIfConditions.length > 0 && (
                  <Box sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5 }}>Show when</Typography>
                    <Select
                      size="small"
                      fullWidth
                      value={showIfLogic}
                      onChange={(e) => handleUpdateLogic(e.target.value)}
                      sx={{
                        backgroundColor: '#fff',
                        '& .MuiSelect-select': { py: 1 }
                      }}
                    >
                      {logicOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                )}

                {showIfConditions.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {showIfConditions.map((condition, index) => {
                      const selectedField = availableFields.find(f => f['x-id'] === condition.field);
                      const operators = getOperatorsForType(selectedField?.type || 'string');

                      return (
                        <Box
                          key={condition.id || index}
                          sx={{
                            p: 2,
                            backgroundColor: '#f9fafb',
                            borderRadius: 1,
                            border: '1px solid #e5e7eb',
                            position: 'relative'
                          }}
                        >
                          {/* Remove condition button */}
                          <Button
                            size="small"
                            onClick={() => handleRemoveCondition(index)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              minWidth: 'auto',
                              p: 0.5,
                              color: '#9ca3af',
                              '&:hover': { color: '#ef4444' }
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </Button>

                          {index > 0 && (
                            <Typography sx={{ fontSize: '11px', color: '#9ca3af', mb: 1, fontWeight: 500 }}>
                              {currentLogicOption.connector}
                            </Typography>
                          )}

                          {/* Field selector */}
                          <Box sx={{ mb: 1.5 }}>
                            <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5 }}>When</Typography>
                            <Select
                              size="small"
                              fullWidth
                              value={condition.field || ''}
                              onChange={(e) => handleUpdateCondition(index, 'field', e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="" disabled>Select a field</MenuItem>
                              {availableFields.map((field) => (
                                <MenuItem key={field['x-id']} value={field['x-id']}>
                                  {field.title || field['x-id']}
                                </MenuItem>
                              ))}
                            </Select>
                          </Box>

                          {/* Operator selector */}
                          <Box sx={{ mb: 1.5 }}>
                            <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5 }}>Operator</Typography>
                            <Select
                              size="small"
                              fullWidth
                              value={condition.operator || 'equals'}
                              onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value)}
                            >
                              {operators.map((op) => (
                                <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                              ))}
                            </Select>
                          </Box>

                          {/* Value input */}
                          {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                            <Box>
                              <Typography sx={{ fontSize: '11px', color: '#6b7280', mb: 0.5 }}>Value</Typography>
                              {getValueInput(condition, index, selectedField)}
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Add condition button */}
                <Button
                  size="small"
                  onClick={handleAddCondition}
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    textTransform: 'none',
                    color: '#047857',
                    justifyContent: 'flex-start',
                    '&:hover': { backgroundColor: '#f0fdf4' }
                  }}
                >
                  {showIfConditions.length > 0 ? 'Add another condition' : 'Add condition'}
                </Button>

                {showIfConditions.length > 0 && (
                  <Box sx={{ p: 1.5, backgroundColor: showIfLogic === 'none' ? '#fef2f2' : '#f0fdf4', borderRadius: 1, border: `1px solid ${showIfLogic === 'none' ? '#fecaca' : '#bbf7d0'}` }}>
                    <Typography sx={{ fontSize: '11px', color: showIfLogic === 'none' ? '#dc2626' : '#047857' }}>
                      {showIfLogic === 'all' && (
                        showIfConditions.length === 1
                          ? 'This field will be shown when the condition is met.'
                          : 'This field will be shown when ALL conditions are met.'
                      )}
                      {showIfLogic === 'any' && (
                        showIfConditions.length === 1
                          ? 'This field will be shown when the condition is met.'
                          : 'This field will be shown when ANY of the conditions is met.'
                      )}
                      {showIfLogic === 'none' && (
                        showIfConditions.length === 1
                          ? 'This field will be hidden when the condition is met.'
                          : 'This field will be hidden when ANY of the conditions is met.'
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CollapsibleSection>
          );
        };

        const RigthSideBar = () => {
          const selectedNodeId = useSelector(state => state.formEditor.selectedNodeId);
          // Select the node directly from nodesById for consistent behavior
          const selectedNode = useSelector(state => selectedNodeId ? state.formEditor.nodesById[selectedNodeId] : null);

          // Get tab node IDs (direct children of editingForm.properties)
          const tabNodeIds = Object.values(editingForm?.properties || {}).map(tab => tab['x-id']);
          const isTabSelected = tabNodeIds.includes(selectedNodeId);

          // Helper to update node property - using new updateNode action
          const updateNodeProp = (key, value) => {
            if (selectedNodeId) {
              dispatch(updateEditingFormNode({ node: selectedNodeId, key, value }));
            }
          };

          // Hide sidebar when no node is selected OR when a tab node is selected
          if (!selectedNode || isTabSelected) {
            return null;
          }

          const nodeType = selectedNode.type;
          const widgetType = selectedNode['x-widget'];

          return (
            <Box sx={{ width: '300px', borderLeft: '1px solid #e5e7eb', backgroundColor: '#ffffff', overflowY: 'auto', p: 3 }}>
              {/* Header with close button */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111827', flex: 1 }}>
                  {selectedNode.title || 'Untitled Field'}
                </Typography>
                <Button
                  onClick={() => dispatch(setSelectedNode(tabNodeIds[0] || null))}
                  sx={{ minWidth: 'auto', p: 0.5, color: '#9ca3af', '&:hover': { color: '#6b7280', backgroundColor: '#f3f4f6' } }}
                >
                  <CloseIcon fontSize="small" />
                </Button>
              </Box>
              <Typography sx={{ fontSize: '12px', color: '#9ca3af', mb: 3 }}>
                Type: {nodeType} | Widget: {widgetType}
              </Typography>

              {/* General Settings */}
              <CollapsibleSection title="General" defaultExpanded={true}>
                {/* Required */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ fontSize: '13px', color: '#6b7280' }}>Required</Typography>
                  <Switch
                    size="small"
                    checked={selectedNode['x-required'] || false}
                    onChange={(e) => updateNodeProp('x-required', e.target.checked)}
                  />
                </Box>

                {/* Placeholder */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Placeholder</Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={selectedNode['x-placeholder'] || ''}
                    onChange={(e) => updateNodeProp('x-placeholder', e.target.value)}
                    placeholder="Enter placeholder text..."
                  />
                </Box>

                {/* Help Text */}
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Help Text</Typography>
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    value={selectedNode['x-help-text'] || ''}
                    onChange={(e) => updateNodeProp('x-help-text', e.target.value)}
                    placeholder="Additional instructions for users..."
                  />
                </Box>
              </CollapsibleSection>

              <Divider sx={{ my: 3 }} />

              {/* String Validations */}
              {nodeType === 'string' && (
                <CollapsibleSection title="Text Validation" defaultExpanded={false}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Min Length</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.minLength ?? ''}
                        onChange={(e) => updateNodeProp('minLength', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="0"
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Max Length</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.maxLength ?? ''}
                        onChange={(e) => updateNodeProp('maxLength', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="No limit"
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Pattern (Regex)</Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={selectedNode.pattern || ''}
                      onChange={(e) => updateNodeProp('pattern', e.target.value || undefined)}
                      placeholder="e.g., ^[A-Za-z]+$"
                    />
                  </Box>

                  {widgetType === 'date' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Date Format</Typography>
                      <Select
                        size="small"
                        fullWidth
                        value={selectedNode.format || 'date'}
                        onChange={(e) => updateNodeProp('format', e.target.value)}
                      >
                        <MenuItem value="date">Date (YYYY-MM-DD)</MenuItem>
                        <MenuItem value="date-time">Date & Time</MenuItem>
                        <MenuItem value="time">Time Only</MenuItem>
                      </Select>
                    </Box>
                  )}
                </CollapsibleSection>
              )}

              {/* Number Validations */}
              {nodeType === 'number' && (
                <CollapsibleSection title="Number Validation" defaultExpanded={false}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Minimum</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.minimum ?? ''}
                        onChange={(e) => updateNodeProp('minimum', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="No min"
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Maximum</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.maximum ?? ''}
                        onChange={(e) => updateNodeProp('maximum', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="No max"
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Multiple Of</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.multipleOf ?? ''}
                        onChange={(e) => updateNodeProp('multipleOf', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="1"
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Default</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.default ?? ''}
                        onChange={(e) => updateNodeProp('default', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="None"
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography sx={{ fontSize: '13px', color: '#6b7280' }}>Exclusive Min</Typography>
                    <Switch
                      size="small"
                      checked={selectedNode.exclusiveMinimum !== undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateNodeProp('exclusiveMinimum', selectedNode.minimum || 0);
                        } else {
                          updateNodeProp('exclusiveMinimum', undefined);
                        }
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography sx={{ fontSize: '13px', color: '#6b7280' }}>Exclusive Max</Typography>
                    <Switch
                      size="small"
                      checked={selectedNode.exclusiveMaximum !== undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateNodeProp('exclusiveMaximum', selectedNode.maximum || 100);
                        } else {
                          updateNodeProp('exclusiveMaximum', undefined);
                        }
                      }}
                    />
                  </Box>
                </CollapsibleSection>
              )}

              {/* Array Validations */}
              {nodeType === 'array' && (
                <CollapsibleSection title="Array Validation" defaultExpanded={false}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Min Items</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.minItems ?? ''}
                        onChange={(e) => updateNodeProp('minItems', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="0"
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Max Items</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.maxItems ?? ''}
                        onChange={(e) => updateNodeProp('maxItems', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="No limit"
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography sx={{ fontSize: '13px', color: '#6b7280' }}>Unique Items</Typography>
                    <Switch
                      size="small"
                      checked={selectedNode.uniqueItems || false}
                      onChange={(e) => updateNodeProp('uniqueItems', e.target.checked)}
                    />
                  </Box>
                </CollapsibleSection>
              )}

              {/* Boolean (Yes/No) Settings */}
              {nodeType === 'boolean' && (
                <CollapsibleSection title="Yes/No Settings" defaultExpanded={false}>
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Default Value</Typography>
                    <Select
                      size="small"
                      fullWidth
                      value={selectedNode.default === true ? 'true' : selectedNode.default === false ? 'false' : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateNodeProp('default', val === 'true' ? true : val === 'false' ? false : undefined);
                      }}
                    >
                      <MenuItem value="">No default</MenuItem>
                      <MenuItem value="true">Yes</MenuItem>
                      <MenuItem value="false">No</MenuItem>
                    </Select>
                  </Box>
                </CollapsibleSection>
              )}

              {/* Object (Section) Settings */}
              {nodeType === 'object' && (
                <CollapsibleSection title="Section Settings" defaultExpanded={false}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Min Properties</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.minProperties ?? ''}
                        onChange={(e) => updateNodeProp('minProperties', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="0"
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '13px', color: '#6b7280', mb: 1 }}>Max Properties</Typography>
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        value={selectedNode.maxProperties ?? ''}
                        onChange={(e) => updateNodeProp('maxProperties', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="No limit"
                      />
                    </Box>
                  </Box>
                </CollapsibleSection>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Advanced Settings */}
              <CollapsibleSection title="Advanced" defaultExpanded={false}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ fontSize: '13px', color: '#6b7280' }}>Read Only</Typography>
                  <Switch
                    size="small"
                    checked={selectedNode.readOnly || false}
                    onChange={(e) => updateNodeProp('readOnly', e.target.checked)}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ fontSize: '13px', color: '#6b7280' }}>Hidden</Typography>
                  <Switch
                    size="small"
                    checked={selectedNode['x-hidden'] || false}
                    onChange={(e) => updateNodeProp('x-hidden', e.target.checked)}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ fontSize: '13px', color: '#6b7280' }}>Disabled</Typography>
                  <Switch
                    size="small"
                    checked={selectedNode['x-disabled'] || false}
                    onChange={(e) => updateNodeProp('x-disabled', e.target.checked)}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ fontSize: '13px', color: '#6b7280' }}>Deprecated</Typography>
                  <Switch
                    size="small"
                    checked={selectedNode.deprecated || false}
                    onChange={(e) => updateNodeProp('deprecated', e.target.checked)}
                  />
                </Box>
              </CollapsibleSection>

              <Divider sx={{ my: 3 }} />

              {/* Conditional Logic - Show/Hide */}
              <ConditionalLogicSection
                selectedNode={selectedNode}
                selectedNodeId={selectedNodeId}
                updateNode={updateNodeProp}
              />

              <Divider sx={{ my: 3 }} />

              {/* Styling Section */}
              {/* <StylingSection
                selectedNode={selectedNode}
                updateNode={updateNode}
              /> */}

              {/* Node ID (read-only info) */}
              <Box sx={{ mt: 3, p: 2, backgroundColor: '#f9fafb', borderRadius: 1 }}>
                <Typography sx={{ fontSize: '11px', color: '#9ca3af', mb: 0.5 }}>Node ID</Typography>
                <Typography sx={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {selectedNode['x-id']}
                </Typography>
              </Box>
            </Box>
          );
        };

        // State for clone selection in top-level modal
        const [showTopLevelCloneSelection, setShowTopLevelCloneSelection] = useState(false);

        const ComponentSelectionModal = () => {
          const fieldTypes = [
            { type: 'section', icon: <TitleIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Section', description: 'Group related fields together' },
            { type: 'header', icon: <TitleIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Header', description: 'Add a title and description' },
            { type: 'short-text', icon: <TextFieldsIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Short Text', description: 'Single line text input' },
            { type: 'multiple-choice', icon: <RadioButtonCheckedIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Multiple Choice', description: 'Select one from multiple options' },
            { type: 'dropdown', icon: <DropdownIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Dropdown', description: 'Select one option from a dropdown' },
            { type: 'checkbox', icon: <CheckboxIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Checkbox', description: 'Select multiple options' },
            { type: 'yes-no', icon: <ThumbsUpDownIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Yes/No', description: 'Simple yes or no question' },
            { type: 'number', icon: <NumbersIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Number', description: 'Numeric input field' },
            { type: 'date', icon: <CalendarMonthIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Date', description: 'Date picker field' },
            { type: 'rating', icon: <StarIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Rating', description: 'Star rating scale' },
            { type: 'opinion-scale', icon: <AssignmentIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Opinion Scale', description: 'Numeric scale (e.g., 1-10)' },
          ];

          // Get all cloneable nodes from current form
          const getCloneableNodes = () => {
            const nodes = [];
            const collectNodes = (node, path = '') => {
              if (node['x-id'] && node['x-widget']) {
                nodes.push({
                  ...node,
                  path: path ? `${path} > ${node.title || 'Untitled'}` : (node.title || 'Untitled')
                });
              }
              if (node.properties) {
                for (const key of Object.keys(node.properties)) {
                  const child = node.properties[key];
                  if (typeof child === 'object' && child !== null) {
                    collectNodes(child, path ? `${path} > ${node.title || 'Untitled'}` : (node.title || 'Untitled'));
                  }
                }
              }
            };
            if (editingForm) {
              collectNodes(editingForm);
            }
            return nodes;
          };

          const cloneableNodes = getCloneableNodes();

          // Widget icon mapping for clone list
          const getWidgetIcon = (widgetType) => {
            const iconMap = {
              'header': <TitleIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'short-text': <TextFieldsIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'multiple-choice': <RadioButtonCheckedIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'dropdown': <DropdownIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'checkbox': <CheckboxIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'yes-no': <ThumbsUpDownIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'number': <NumbersIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'date': <CalendarMonthIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'rating': <StarIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'opinion-scale': <AssignmentIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'section': <TitleIcon sx={{ fontSize: '20px', color: '#047857' }} />,
            };
            return iconMap[widgetType] || <TextFieldsIcon sx={{ fontSize: '20px', color: '#047857' }} />;
          };

          // Handle cloning for top-level fields
          const handleCloneTopLevel = (nodeToClone) => {
            if (!editingForm || !subComponentParentPath) return;

            // Deep clone the node and assign new x-id to all nodes
            const deepCloneWithNewIds = (node) => {
              const cloned = { ...node };
              cloned['x-id'] = crypto.randomUUID();
              delete cloned['x-parent-id']; // Top-level fields don't have parent
              cloned.title = `${node.title || 'Field'} (Copy)`;

              if (cloned.properties) {
                const newProperties = {};
                for (const key of Object.keys(cloned.properties)) {
                  const child = cloned.properties[key];
                  if (typeof child === 'object' && child !== null) {
                    const clonedChild = deepCloneWithNewIds(child);
                    newProperties[clonedChild['x-id']] = clonedChild;
                  } else {
                    newProperties[key] = child;
                  }
                }
                cloned.properties = newProperties;
              }

              return cloned;
            };

            const clonedNode = deepCloneWithNewIds(nodeToClone);

            dispatch(addNode({ parentId: subComponentParentPath, node: clonedNode }));
            setOpenComponentModal(false);
            setShowTopLevelCloneSelection(false);
          };

          return (
            <Dialog
              open={openComponentModal}
              onClose={() => { setOpenComponentModal(false); setShowTopLevelCloneSelection(false); }}
              maxWidth="sm"
              fullWidth
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  {showTopLevelCloneSelection && (
                    <Button
                      onClick={() => setShowTopLevelCloneSelection(false)}
                      sx={{ minWidth: 'auto', p: 0.5, color: '#6b7280', mr: 1 }}
                    >
                      <ArrowBackIcon />
                    </Button>
                  )}
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', flex: 1 }}>
                    {showTopLevelCloneSelection ? 'Clone Existing Field' : 'Add New Field'}
                  </Typography>
                  <Button
                    onClick={() => { setOpenComponentModal(false); setShowTopLevelCloneSelection(false); }}
                    sx={{ minWidth: 'auto', p: 0.5, color: '#6b7280' }}
                  >
                    <CloseIcon />
                  </Button>
                </Box>

                {showTopLevelCloneSelection ? (
                  // Clone selection view
                  <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                    {cloneableNodes.length === 0 ? (
                      <Typography sx={{ color: '#6b7280', textAlign: 'center', py: 4 }}>
                        No fields available to clone
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {cloneableNodes.map((node) => (
                          <Box
                            key={node['x-id']}
                            onClick={() => handleCloneTopLevel(node)}
                            sx={{
                              p: 2,
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                borderColor: '#047857',
                                backgroundColor: '#f0fdf4'
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {getWidgetIcon(node['x-widget'])}
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                                  {node.title || 'Untitled'}
                                </Typography>
                                <Typography sx={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {node['x-widget']} • {node.path}
                                </Typography>
                              </Box>
                              <ContentCopyIcon sx={{ fontSize: '18px', color: '#9ca3af' }} />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  // Field type selection view
                  <>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                      {fieldTypes.map((field) => (
                        <Box
                          key={field.type}
                          onClick={() => handleAddTopLevelField(subComponentParentPath, field.type)}
                          sx={{
                            p: 2,
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: '#047857',
                              backgroundColor: '#f0fdf4'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {field.icon}
                            <Box>
                              <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                                {field.label}
                              </Typography>
                              <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                                {field.description}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                      {/* Clone option */}
                      <Box
                        onClick={() => setShowTopLevelCloneSelection(true)}
                        sx={{
                          p: 2,
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: '#047857',
                            backgroundColor: '#f0fdf4'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <ContentCopyIcon sx={{ fontSize: '28px', color: '#047857' }} />
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                              Clone
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                              Copy a field from this form
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </>
                )}

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => { setOpenComponentModal(false); setShowTopLevelCloneSelection(false); }}
                    sx={{ textTransform: 'none', color: '#6b7280' }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Dialog>
          );
        };

        // Handle adding a top-level field (without x-parent-id)
        const handleAddTopLevelField = (parentId, widgetType) => {
          if (!editingForm || !parentId) return;

          const widgetToSchemaType = {
            'header': 'string',
            'short-text': 'string',
            'multiple-choice': 'string',
            'dropdown': 'string',
            'yes-no': 'boolean',
            'checkbox': 'array',
            'number': 'number',
            'date': 'string',
            'opinion-scale': 'number',
            'rating': 'number',
            'section': 'object',
          };

          const widgetLabels = {
            'header': 'Header',
            'short-text': 'Short Text',
            'multiple-choice': 'Multiple Choice',
            'dropdown': 'Dropdown',
            'yes-no': 'Yes/No',
            'checkbox': 'Checkbox',
            'number': 'Number',
            'date': 'Date',
            'opinion-scale': 'Opinion Scale',
            'rating': 'Rating',
            'section': 'Section',
          };

          const schemaType = widgetToSchemaType[widgetType] || 'string';

          // Create new node WITHOUT x-parent-id (top-level node)
          const newFieldNode = newNode({
            type: schemaType,
            title: `New ${widgetLabels[widgetType] || 'Field'}`,
            description: '',
            'x-widget': widgetType,
          });

          // Add enum for multiple choice and dropdown
          if (widgetType === 'multiple-choice' || widgetType === 'dropdown') {
            newFieldNode.enum = ['Option 1', 'Option 2', 'Option 3'];
          }

          // Add format for date
          if (widgetType === 'date') {
            newFieldNode.format = 'date';
          }

          // Add items for checkbox (array type)
          if (widgetType === 'checkbox') {
            newFieldNode.items = { type: 'string', enum: ['Option 1', 'Option 2', 'Option 3'] };
          }

          // Use addNode action - only adds the new node without rebuilding existing nodes
          dispatch(addNode({ parentId, node: newFieldNode }));
          setOpenComponentModal(false);
        };

        // Handle adding a new field to a parent node (with x-parent-id for subcomponents)
        const handleAddField = (currentNodeId, widgetType) => {
          if (!editingForm || !currentNodeId) return;

          const widgetToSchemaType = {
            'header': 'string',
            'short-text': 'string',
            'multiple-choice': 'string',
            'dropdown': 'string',
            'yes-no': 'boolean',
            'checkbox': 'array',
            'number': 'number',
            'date': 'string',
            'opinion-scale': 'number',
            'rating': 'number',
            'section': 'object',
          };

          const widgetLabels = {
            'header': 'Header',
            'short-text': 'Short Text',
            'multiple-choice': 'Multiple Choice',
            'dropdown': 'Dropdown',
            'yes-no': 'Yes/No',
            'checkbox': 'Checkbox',
            'number': 'Number',
            'date': 'Date',
            'opinion-scale': 'Opinion Scale',
            'rating': 'Rating',
            'section': 'Section',
          };

          const schemaType = widgetToSchemaType[widgetType] || 'string';

          // Find the current node to get its parent id
          const findNodeAndParent = (node, parentId = null) => {
            if (node['x-id'] === currentNodeId) {
              return { node, parentId };
            }
            if (node.properties) {
              for (const key of Object.keys(node.properties)) {
                const child = node.properties[key];
                if (typeof child === 'object' && child !== null) {
                  const result = findNodeAndParent(child, node['x-id']);
                  if (result) return result;
                }
              }
            }
            return null;
          };

          const nodeInfo = findNodeAndParent(editingForm);
          if (!nodeInfo || !nodeInfo.parentId) {
            console.warn('Could not find parent for node:', currentNodeId);
            return;
          }

          const actualParentId = nodeInfo.parentId;

          // Create new node with proper defaults and x-parent-id set to the current node
          const newFieldNode = newNode({
            type: schemaType,
            title: `New ${widgetLabels[widgetType] || 'Field'}`,
            description: '',
            'x-widget': widgetType,
            'x-parent-id': currentNodeId, // Set parent reference to the card where add was clicked
          });

          // Add enum for multiple choice and dropdown
          if (widgetType === 'multiple-choice' || widgetType === 'dropdown') {
            newFieldNode.enum = ['Option 1', 'Option 2', 'Option 3'];
          }

          // Add format for date
          if (widgetType === 'date') {
            newFieldNode.format = 'date';
          }

          // Add items for checkbox (array type)
          if (widgetType === 'checkbox') {
            newFieldNode.items = { type: 'string', enum: ['Option 1', 'Option 2', 'Option 3'] };
          }

          // Use addNode action - only adds the new node without rebuilding existing nodes
          dispatch(addNode({ parentId: actualParentId, node: newFieldNode }));
          setOpenSubComponentModal(false);
          setShowCloneSelection(false);
        };

        // Handle cloning an existing node
        const handleCloneNode = (nodeToClone, currentNodeId) => {
          if (!editingForm || !currentNodeId) return;

          // Find the current node to get its parent id
          const findNodeAndParent = (node, parentId = null) => {
            if (node['x-id'] === currentNodeId) {
              return { node, parentId };
            }
            if (node.properties) {
              for (const key of Object.keys(node.properties)) {
                const child = node.properties[key];
                if (typeof child === 'object' && child !== null) {
                  const result = findNodeAndParent(child, node['x-id']);
                  if (result) return result;
                }
              }
            }
            return null;
          };

          const nodeInfo = findNodeAndParent(editingForm);
          if (!nodeInfo || !nodeInfo.parentId) {
            console.warn('Could not find parent for node:', currentNodeId);
            return;
          }

          const actualParentId = nodeInfo.parentId;

          // Deep clone the node and assign new x-id to all nodes
          const deepCloneWithNewIds = (node) => {
            const cloned = { ...node };
            cloned['x-id'] = crypto.randomUUID();
            cloned['x-parent-id'] = currentNodeId;
            cloned.title = `${node.title || 'Field'} (Copy)`;

            if (cloned.properties) {
              const newProperties = {};
              for (const key of Object.keys(cloned.properties)) {
                const child = cloned.properties[key];
                if (typeof child === 'object' && child !== null) {
                  const clonedChild = deepCloneWithNewIds(child);
                  newProperties[clonedChild['x-id']] = clonedChild;
                } else {
                  newProperties[key] = child;
                }
              }
              cloned.properties = newProperties;
            }

            return cloned;
          };

          const clonedNode = deepCloneWithNewIds(nodeToClone);

          dispatch(addNode({ parentId: actualParentId, node: clonedNode }));
          setOpenSubComponentModal(false);
          setShowCloneSelection(false);
        };

        const AddFieldModal = () => {
          const fieldTypes = [
            { type: 'section', icon: <TitleIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Section', description: 'Group related fields together' },
            { type: 'header', icon: <TitleIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Header', description: 'Add a title and description' },
            { type: 'short-text', icon: <TextFieldsIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Short Text', description: 'Single line text input' },
            { type: 'multiple-choice', icon: <RadioButtonCheckedIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Multiple Choice', description: 'Select one from multiple options' },
            { type: 'dropdown', icon: <DropdownIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Dropdown', description: 'Select one option from a dropdown' },
            { type: 'checkbox', icon: <CheckboxIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Checkbox', description: 'Select multiple options' },
            { type: 'yes-no', icon: <ThumbsUpDownIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Yes/No', description: 'Simple yes or no question' },
            { type: 'number', icon: <NumbersIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Number', description: 'Numeric input field' },
            { type: 'date', icon: <CalendarMonthIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Date', description: 'Date picker field' },
            { type: 'rating', icon: <StarIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Rating', description: 'Star rating scale' },
            { type: 'opinion-scale', icon: <AssignmentIcon sx={{ fontSize: '28px', color: '#047857' }} />, label: 'Opinion Scale', description: 'Numeric scale (e.g., 1-10)' },
          ];

          // Get all cloneable nodes from current form
          const getCloneableNodes = () => {
            const nodes = [];
            const collectNodes = (node, path = '') => {
              if (node['x-id'] && node['x-widget'] && node['x-widget'] !== 'section') {
                nodes.push({
                  ...node,
                  path: path ? `${path} > ${node.title || 'Untitled'}` : (node.title || 'Untitled')
                });
              }
              if (node.properties) {
                for (const key of Object.keys(node.properties)) {
                  const child = node.properties[key];
                  if (typeof child === 'object' && child !== null) {
                    collectNodes(child, path ? `${path} > ${node.title || 'Untitled'}` : (node.title || 'Untitled'));
                  }
                }
              }
            };
            if (editingForm) {
              collectNodes(editingForm);
            }
            return nodes;
          };

          const cloneableNodes = getCloneableNodes();

          // Widget icon mapping for clone list
          const getWidgetIcon = (widgetType) => {
            const iconMap = {
              'header': <TitleIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'short-text': <TextFieldsIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'multiple-choice': <RadioButtonCheckedIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'dropdown': <DropdownIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'checkbox': <CheckboxIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'yes-no': <ThumbsUpDownIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'number': <NumbersIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'date': <CalendarMonthIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'rating': <StarIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'opinion-scale': <AssignmentIcon sx={{ fontSize: '20px', color: '#047857' }} />,
              'section': <TitleIcon sx={{ fontSize: '20px', color: '#047857' }} />,
            };
            return iconMap[widgetType] || <TextFieldsIcon sx={{ fontSize: '20px', color: '#047857' }} />;
          };

          return (
            <Dialog
              open={openSubComponentModal}
              onClose={() => { setOpenSubComponentModal(false); setShowCloneSelection(false); }}
              maxWidth="sm"
              fullWidth
            >
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  {showCloneSelection && (
                    <Button
                      onClick={() => setShowCloneSelection(false)}
                      sx={{ minWidth: 'auto', p: 0.5, color: '#6b7280', mr: 1 }}
                    >
                      <ArrowBackIcon />
                    </Button>
                  )}
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', flex: 1 }}>
                    {showCloneSelection ? 'Clone Existing Field' : 'Add New Field'}
                  </Typography>
                  <Button
                    onClick={() => { setOpenSubComponentModal(false); setShowCloneSelection(false); }}
                    sx={{ minWidth: 'auto', p: 0.5, color: '#6b7280' }}
                  >
                    <CloseIcon />
                  </Button>
                </Box>

                {showCloneSelection ? (
                  // Clone selection view
                  <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
                    {cloneableNodes.length === 0 ? (
                      <Typography sx={{ color: '#6b7280', textAlign: 'center', py: 4 }}>
                        No fields available to clone
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {cloneableNodes.map((node) => (
                          <Box
                            key={node['x-id']}
                            onClick={() => handleCloneNode(node, subComponentParentPath)}
                            sx={{
                              p: 2,
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                borderColor: '#047857',
                                backgroundColor: '#f0fdf4'
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {getWidgetIcon(node['x-widget'])}
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                                  {node.title || 'Untitled'}
                                </Typography>
                                <Typography sx={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {node['x-widget']} • {node.path}
                                </Typography>
                              </Box>
                              <ContentCopyIcon sx={{ fontSize: '18px', color: '#9ca3af' }} />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  // Field type selection view
                  <>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                      {fieldTypes.map((field) => (
                        <Box
                          key={field.type}
                          onClick={() => handleAddField(subComponentParentPath, field.type)}
                          sx={{
                            p: 2,
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: '#047857',
                              backgroundColor: '#f0fdf4'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {field.icon}
                            <Box>
                              <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                                {field.label}
                              </Typography>
                              <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                                {field.description}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                      {/* Clone option */}
                      <Box
                        onClick={() => setShowCloneSelection(true)}
                        sx={{
                          p: 2,
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: '#047857',
                            backgroundColor: '#f0fdf4'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <ContentCopyIcon sx={{ fontSize: '28px', color: '#047857' }} />
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                              Clone
                            </Typography>
                            <Typography sx={{ fontSize: '12px', color: '#6b7280' }}>
                              Copy a field from this form
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </>
                )}

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => { setOpenSubComponentModal(false); setShowCloneSelection(false); }}
                    sx={{ textTransform: 'none', color: '#6b7280' }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Dialog>
          );
        };

        return <Box data-flex-container sx={{ flex: 1, display: { xs: 'flex', md: 'flex' }, width: '100%', flexDirection: { xs: 'column', md: 'row' }, backgroundColor: '#ffffff', overflow: 'hidden' }} >
          <MainContent />
          <RigthSideBar />
          <ComponentSelectionModal />
          <AddFieldModal />
        </Box>
      };

      return <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px', boxShadow: 1 }}>
        <TopBar />
        <TabsRow />
        <MainContent />
      </Card>
    };

    return <CollapsedStateContext.Provider value={collapsedContextValue}>
      <Box className="root-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} >
        <TopNavbar />
        <Box className="content-container">
          <SideBar />
          <MainCard />
        </Box>
      </Box>

      <PreviewModal />
      <VersionHistoryModal />
      <ImportModal />
      <ExportModal />
      <PublishModal />
      <ConditionalLogicModal />
      <IAChat />
    </CollapsedStateContext.Provider>;
  };

  const FormsTable = () => {
    const { forms, loading } = useSelector(state => state.formEditor);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [allNodes, setAllNodes] = useState([]);
    useEffect(() => { dispatch(fetchForms()) }, [dispatch]);

    // Load all nodes from localStorage to count sections/questions
    useEffect(() => {
      const nodes = JSON.parse(localStorage.getItem('json-schema-nodes') || '[]');
      setAllNodes(nodes);
    }, [forms]); // Reload when forms change

    // Helper to count sections and questions for a form
    const getFormCounts = (rootNodeId) => {
      if (!rootNodeId || allNodes.length === 0) return { sections: 0, questions: 0 };

      // Find the root node
      const nodesMap = {};
      allNodes.forEach(node => {
        if (node['x-id']) {
          nodesMap[node['x-id']] = node;
        }
      });

      const rootNode = nodesMap[rootNodeId];
      if (!rootNode) return { sections: 0, questions: 0 };

      let sections = 0;
      let questions = 0;

      // Recursively count through properties
      const countInNode = (node) => {
        if (!node || typeof node !== 'object') return;

        // Count this node if it has a widget
        if (node['x-widget']) {
          if (node['x-widget'] === 'section') {
            sections++;
          } else {
            questions++;
          }
        }

        // Recurse into properties
        if (node.properties) {
          Object.values(node.properties).forEach(child => {
            if (typeof child === 'object' && child !== null) {
              countInNode(child);
            }
          });
        }
      };

      countInNode(rootNode);

      return { sections, questions };
    };

    const columns = [
      { field: 'name', headerName: 'Title', flex: 1, minWidth: 200, },
      { field: 'description', headerName: 'Description', flex: 1, minWidth: 250, },
      {
        field: 'sections',
        headerName: 'Sections',
        width: 100,
        valueGetter: (v, r) => r ? getFormCounts(r.rootNodeId).sections : 0,
      },
      {
        field: 'questions',
        headerName: 'Questions',
        width: 100,
        valueGetter: (v, r) => r ? getFormCounts(r.rootNodeId).questions : 0,
      },
      {
        field: 'updatedAt',
        headerName: 'Last Update',
        width: 180,
        valueGetter: (value, row) => {
          if (!row) return '';
          const date = row.updatedAt || row.createdAt;
          if (!date) return '';
          return new Date(date).toLocaleString();
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 200,
        sortable: false,
        renderCell: (params) => {
          if (!params || !params.row) return null;
          return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleEditForm(params.row)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteForm(params.row.$id || params.row.id)}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ];

    const handleEditForm = (form) => {
      // Load the full form structure by its rootNodeId
      if (form.rootNodeId) {
        dispatch(loadFormByRootNodeId(form.rootNodeId));
      } else {
        // Fallback for forms without rootNodeId (legacy)
        dispatch(setEditingForm(form));
      }
    };

    const handleDeleteForm = async (formId) => {
      if (window.confirm('Are you sure you want to delete this form?')) {
        try {
          await dispatch(deleteForm(formId)).unwrap();
          // Refresh the forms list after deletion
          await dispatch(fetchForms());
        } catch (error) {
          console.error('Failed to delete form:', error);
        }
      }
    };

    const handleCreateNew = () => {
      const form = newForm();
      console.log('Created new form with default schema:', form);
      dispatch(setEditingForm(form));
    };

    return <>
      <Box className="root-container">
        <TopNavbar />
        <Box className="content-container">
          <SideBar />
          <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px', boxShadow: 1 }}>
            <Box sx={{ flexGrow: 1, width: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                  Observation Tools
                </Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreateNew} >
                  New Tool
                </Button>
              </Box>

              <Box sx={{ flexGrow: 1, width: '100%' }}>
                <DataGrid
                  rows={forms || []}
                  columns={columns}
                  loading={loading}
                  pageSizeOptions={[5, 10, 25, 50]}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  getRowId={(row) => row?.$id || row?.id || Math.random().toString()}
                  disableRowSelectionOnClick
                  initialState={{
                    sorting: {
                      sortModel: [{ field: 'updatedAt', sort: 'desc' }],
                    },
                  }}
                  sx={{
                    '& .MuiDataGrid-cell': {
                      borderBottom: '1px solid #e5e7eb',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: '#f9fafb',
                      borderBottom: '2px solid #e5e7eb',
                    },
                  }}
                />
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>
    </>;
  }

  return (<ThemeProvider theme={theme}>
    <CssBaseline />
    {editingForm ? <FormEditor /> : <FormsTable />}
    <LoadingModal />
  </ThemeProvider>);
}

export default App;

