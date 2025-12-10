import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Box,
  IconButton,
  Typography,
  Paper,
  InputLabel,
} from '@mui/material';
import { Close as CloseIcon, Add, Close as DeleteIcon } from '@mui/icons-material';
import { useBdts } from '../context/BdtsContext';

/**
 * QueryBuilderModal Component
 * Visual query builder for creating complex AND/OR queries with nested groups
 */
const QueryBuilderModal = ({ open, onClose, onApply, initialQuery = '' }) => {
  // Root state: holds the entire query tree
  // Each node can be a condition {id, type: 'condition', value, operator, bdt}
  // or a group {id, type: 'group', operator, children: [...nodes]}
  const [queryTree, setQueryTree] = useState({
    id: 'root',
    type: 'group',
    operator: 'and', // This doesn't apply to root, but we'll keep for consistency
    children: [
      { id: generateId(), type: 'condition', value: '', operator: 'and', bdt: null }
    ]
  });

  // Column types (business data types) for dropdown
  const { bdts } = useBdts();
  const [columnTypes, setColumnTypes] = useState([]);

  // Generate unique IDs for conditions and groups
  function generateId() {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Parse query (JSON array or empty) into builder tree structure
  const parseQueryToTree = (query) => {
    // Handle empty/null query
    if (!query || (Array.isArray(query) && query.length === 0)) {
      return {
        id: 'root',
        type: 'group',
        operator: 'and',
        children: [
          { id: generateId(), type: 'condition', value: '', operator: 'and', bdt: null }
        ]
      };
    }

    // Handle JSON array format (new format)
    if (Array.isArray(query)) {
      return parseJSONToTree(query);
    }

    // Fallback for invalid input
    return {
      id: 'root',
      type: 'group',
      operator: 'and',
      children: [
        { id: generateId(), type: 'condition', value: '', operator: 'and', bdt: null }
      ]
    };
  };

  // Parse JSON query array into builder tree structure
  const parseJSONToTree = (queryJSON) => {
    const children = [];
    let i = 0;
    let previousOperator = null; // Track operator that comes BEFORE current element

    while (i < queryJSON.length) {
      const element = queryJSON[i];

      if (element.type === 'clause') {
        // Use the operator that came BEFORE this clause (connects to previous element)
        // First element defaults to 'and' (operator won't be shown anyway)
        const operator = previousOperator ? previousOperator.toLowerCase() : 'and';

        children.push({
          id: generateId(),
          type: 'condition',
          value: element.content.value,
          operator: operator,
          bdt: element.content.bdt || null  // Preserve column type
        });

        previousOperator = null; // Reset after using
        i++;
      } else if (element.type === 'subQuery') {
        // Use the operator that came BEFORE this subquery
        const operator = previousOperator ? previousOperator.toLowerCase() : 'and';

        // Recursively parse the subquery
        const subTree = parseJSONToTree(element.content.elements);
        children.push({
          ...subTree,
          id: generateId(),
          operator: operator
        });

        previousOperator = null; // Reset after using
        i++;
      } else if (element.type === 'operator') {
        // Store the operator for the next element
        previousOperator = element.content.operator;
        i++;
      } else {
        i++;
      }
    }

    return {
      id: 'root',
      type: 'group',
      operator: 'and',
      children: children.length > 0 ? children : [
        { id: generateId(), type: 'condition', value: '', operator: 'and', bdt: null }
      ]
    };
  };


  // Load column types from context when modal opens
  useEffect(() => {
    if (open) {
      setColumnTypes(bdts || []);
    }
  }, [open, bdts]);

  // Initialize tree from initialQuery when modal opens
  useEffect(() => {
    if (open) {
      const parsedTree = parseQueryToTree(initialQuery);
      setQueryTree(parsedTree);
    }
  }, [open, initialQuery]);

  // Add a condition to a parent group
  const addCondition = (parentId) => {
    setQueryTree(prev => updateTreeNode(prev, parentId, (node) => ({
      ...node,
      children: [
        ...node.children,
        { id: generateId(), type: 'condition', value: '', operator: 'and', bdt: null }
      ]
    })));
  };

  // Add a nested group to a parent group
  const addGroup = (parentId) => {
    setQueryTree(prev => updateTreeNode(prev, parentId, (node) => ({
      ...node,
      children: [
        ...node.children,
        {
          id: generateId(),
          type: 'group',
          operator: 'and',
          children: [
            { id: generateId(), type: 'condition', value: '', operator: 'and', bdt: null }
          ]
        }
      ]
    })));
  };

  // Delete a node (condition or group)
  const deleteNode = (nodeId) => {
    setQueryTree(prev => removeNodeFromTree(prev, nodeId));
  };

  // Update a node's value
  const updateNodeValue = (nodeId, value) => {
    setQueryTree(prev => updateTreeNode(prev, nodeId, (node) => ({
      ...node,
      value
    })));
  };

  // Update a node's operator (AND/OR)
  const updateNodeOperator = (nodeId, operator) => {
    setQueryTree(prev => updateTreeNode(prev, nodeId, (node) => ({
      ...node,
      operator
    })));
  };

  // Update a node's column type (bdt)
  const updateNodeBdt = (nodeId, bdt) => {
    setQueryTree(prev => updateTreeNode(prev, nodeId, (node) => ({
      ...node,
      bdt: bdt === '' ? null : bdt  // Convert empty string to null
    })));
  };

  // Recursively update a node in the tree
  const updateTreeNode = (node, targetId, updateFn) => {
    if (node.id === targetId) {
      return updateFn(node);
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateTreeNode(child, targetId, updateFn))
      };
    }
    return node;
  };

  // Recursively remove a node from the tree
  const removeNodeFromTree = (node, targetId) => {
    if (node.id === targetId) {
      // Can't remove root
      return node;
    }
    if (node.children) {
      return {
        ...node,
        children: node.children
          .filter(child => child.id !== targetId)
          .map(child => removeNodeFromTree(child, targetId))
      };
    }
    return node;
  };

  // Convert query tree to JSON array format
  // Returns array of elements: clause, operator, or subQuery
  const buildQueryJSON = (node) => {
    if (node.type === 'condition') {
      // Single condition - return as clause element
      const value = node.value.trim();
      if (!value) return null;

      return {
        type: 'clause',
        content: {
          value: value,
          bdt: node.bdt || null  // Column type from dropdown (null if not selected)
        }
      };
    }

    if (node.type === 'group') {
      const children = node.children || [];
      if (children.length === 0) return null;

      const elements = [];

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childJSON = buildQueryJSON(child);

        if (!childJSON) continue; // Skip empty nodes

        // Add operator before this child (if not the first)
        if (elements.length > 0) {
          elements.push({
            type: 'operator',
            content: {
              operator: child.operator.toUpperCase()
            }
          });
        }

        // Add the child element
        // If it's a nested group, wrap it in a subQuery
        if (child.type === 'group') {
          elements.push({
            type: 'subQuery',
            content: {
              elements: childJSON
            }
          });
        } else {
          elements.push(childJSON);
        }
      }

      // Root group returns the elements array directly
      // Nested groups return just the elements (caller wraps in subQuery)
      return elements;
    }

    return null;
  };

  // Convert query tree to string for preview display
  // Adds parentheses when operators change to preserve left-to-right evaluation
  const buildQueryStringPreview = (node) => {
    if (node.type === 'condition') {
      return node.value.trim();
    }

    if (node.type === 'group') {
      if (node.children.length === 0) return '';

      // Build expression left-to-right, wrapping when operators change
      let result = buildQueryStringPreview(node.children[0]);
      if (!result) return '';

      let prevOp = null;

      for (let i = 1; i < node.children.length; i++) {
        const child = node.children[i];
        const childStr = buildQueryStringPreview(child);
        if (!childStr) continue;

        const op = child.operator.toLowerCase();

        // If operator changed from previous, wrap result to force left-to-right evaluation
        // This ensures "(a OR b) AND c" instead of "a OR (b AND c)"
        if (prevOp && prevOp !== op) {
          result = `(${result})`;
        }

        result = `${result} ${op.toUpperCase()} ${childStr}`;
        prevOp = op;
      }

      // Add parentheses for non-root groups
      return node.id === 'root' ? result : `(${result})`;
    }

    return '';
  };

  // Handle Apply button
  const handleApply = () => {
    const queryJSON = buildQueryJSON(queryTree);

    // Validate: query must not be empty
    if (!queryJSON || queryJSON.length === 0) {
      alert('Error: Query cannot be empty. Please add at least one search term.');
      return;
    }

    // Validate: all clauses must have values
    const hasEmptyClause = queryJSON.some(element => {
      if (element.type === 'clause' && !element.content.value.trim()) {
        return true;
      }
      if (element.type === 'subQuery') {
        // Recursively check subquery elements
        const checkSubQuery = (elements) => {
          return elements.some(el => {
            if (el.type === 'clause' && !el.content.value.trim()) return true;
            if (el.type === 'subQuery') return checkSubQuery(el.content.elements);
            return false;
          });
        };
        return checkSubQuery(element.content.elements);
      }
      return false;
    });

    if (hasEmptyClause) {
      alert('Error: All search terms must have a value. Please fill in or remove empty conditions.');
      return;
    }

    // Pass the JSON array to parent
    onApply(queryJSON);
    onClose();
  };

  // Handle Cancel button
  const handleCancel = () => {
    // Reset to initial state
    setQueryTree({
      id: 'root',
      type: 'group',
      operator: 'and',
      children: [
        { id: generateId(), type: 'condition', value: '', operator: 'and', bdt: null }
      ]
    });
    onClose();
  };

  // Render a condition (input field)
  const renderCondition = (condition, isFirst, parentId, isRoot = false) => {
    return (
      <Box
        key={condition.id}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
          mt: isFirst ? 2 : 0,
          '&:hover': {
            '& .delete-condition-btn': {
              opacity: 1,
            }
          }
        }}
      >
        {/* Operator dropdown - only show if not the first condition */}
        {!isFirst && (
          <FormControl size="small" sx={{ minWidth: 76 }}>
            <Select
              value={condition.operator}
              onChange={(e) => updateNodeOperator(condition.id, e.target.value)}
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                borderRadius: '20px',
                backgroundColor: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(37, 99, 235, 0.3)',
                  borderWidth: '1.5px',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(37, 99, 235, 0.4)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.light',
                },
              }}
            >
              <MenuItem value="and">AND</MenuItem>
              <MenuItem value="or">OR</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Input field */}
        <TextField
          size="small"
          value={condition.value}
          onChange={(e) => updateNodeValue(condition.id, e.target.value)}
          placeholder="Enter search term..."
          sx={{
            width: '50%',
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#ffffff',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.light',
              },
              '&.Mui-focused': {
                borderColor: 'primary.main',
              }
            }
          }}
        />

        {/* Column Type dropdown */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id={`column-type-label-${condition.id}`}>Column Type</InputLabel>
          <Select
            labelId={`column-type-label-${condition.id}`}
            value={condition.bdt || ''}
            onChange={(e) => updateNodeBdt(condition.id, e.target.value)}
            label="Column Type"
            sx={{
              fontSize: '0.875rem',
              backgroundColor: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 0, 0, 0.23)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 0, 0, 0.4)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            }}
          >
            <MenuItem value="">
              <em>All Columns</em>
            </MenuItem>
            {columnTypes.map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Delete button - shows on hover */}
        <IconButton
          className="delete-condition-btn"
          size="small"
          onClick={() => deleteNode(condition.id)}
          sx={{
            color: 'text.secondary',
            opacity: 0,
            transition: 'opacity 0.2s ease, color 0.2s ease',
            '&:hover': {
              color: 'error.main',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
            }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  };

  // Render a group (nested container with conditions and/or groups)
  const renderGroup = (group, isRoot = false) => {
    const children = group.children || [];

    return (
      <Box
        key={group.id}
        sx={{
          position: 'relative',
          mb: isRoot ? 0 : 3.5,
        }}
      >
        {/* Group container with visual styling */}
        <Paper
          elevation={isRoot ? 0 : 3}
          sx={{
            p: 2.5,
            pt: isRoot ? 0 : 4.5,
            pl: isRoot ? 0 : 3,
            border: isRoot ? 'none' : '1px solid',
            borderLeft: isRoot ? 'none' : '3px solid',
            borderLeftColor: isRoot ? 'transparent' : 'primary.main',
            borderColor: isRoot ? 'transparent' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: isRoot ? 'transparent' : '#ffffff',
            position: 'relative',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': !isRoot ? {
              boxShadow: '0 10px 25px -5px rgb(37, 99, 235, 0.15), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              '& .delete-group-btn': {
                color: 'error.main',
              }
            } : {},
          }}
        >
          {/* Operator badge for non-root groups - positioned half in/half out */}
          {!isRoot && (
            <FormControl
              size="small"
              sx={{
                position: 'absolute',
                top: -11,
                left: 20,
                minWidth: 76,
                zIndex: 2,
              }}
            >
              <Select
                value={group.operator}
                onChange={(e) => updateNodeOperator(group.id, e.target.value)}
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  borderRadius: '20px',
                  backgroundColor: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(37, 99, 235, 0.3)',
                    borderWidth: '1.5px',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(37, 99, 235, 0.4)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.light',
                  },
                }}
              >
                <MenuItem value="and">AND</MenuItem>
                <MenuItem value="or">OR</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Delete button for groups - distinctly styled */}
          {!isRoot && (
            <IconButton
              className="delete-group-btn"
              size="small"
              onClick={() => deleteNode(group.id)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: 'error.main',
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}

          {/* Render all children */}
          <Box sx={{ mt: isRoot ? 0 : 0 }}>
            {children.map((child, index) => {
              if (child.type === 'condition') {
                return renderCondition(child, index === 0, group.id, isRoot);
              } else if (child.type === 'group') {
                return renderGroup(child, false);
              }
              return null;
            })}
          </Box>

          {/* Add buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => addCondition(group.id)}
              sx={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                backgroundColor: 'rgba(37, 99, 235, 0.06)',
                color: 'text.secondary',
                fontWeight: 500,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'rgba(37, 99, 235, 0.15)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  borderColor: 'rgba(37, 99, 235, 0.25)',
                }
              }}
            >
              Add Condition
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => addGroup(group.id)}
              sx={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                backgroundColor: 'rgba(37, 99, 235, 0.04)',
                color: 'text.secondary',
                fontWeight: 500,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'rgba(37, 99, 235, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  borderColor: 'rgba(37, 99, 235, 0.2)',
                }
              }}
            >
              Add Group
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Query Builder</Typography>
          <IconButton onClick={handleCancel} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ backgroundColor: '#fafbfc', overflowY: 'auto' }}>
        <Box sx={{ minHeight: 200 }}>
          {renderGroup(queryTree, true)}
        </Box>
      </DialogContent>

      {/* Preview - pinned to bottom */}
      <Box sx={{
        p: 2,
        backgroundColor: 'grey.100',
        borderRadius: 0,
        border: '1px solid',
        borderColor: 'grey.200',
        transition: 'all 0.2s ease',
        borderTop: '1px solid',
        borderTopColor: 'grey.200',
      }}>
        <Typography variant="caption" color="text.secondary" gutterBottom sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
          Query Preview
        </Typography>
        <Typography variant="body2" sx={{
          fontFamily: 'monospace',
          wordBreak: 'break-word',
          color: 'text.primary',
          mt: 1,
          fontSize: '0.875rem',
          lineHeight: 1.6,
        }}>
          {buildQueryStringPreview(queryTree) || <span style={{ color: '#cbd5e1' }}>(empty)</span>}
        </Typography>
      </Box>

      <DialogActions sx={{ pt: 2, pb: 2, px: 3, backgroundColor: 'grey.50' }}>
        <Button onClick={handleCancel} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply Query
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QueryBuilderModal;
