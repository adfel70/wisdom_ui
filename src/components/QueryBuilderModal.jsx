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
} from '@mui/material';
import { Close as CloseIcon, Add, Close as DeleteIcon } from '@mui/icons-material';

/**
 * QueryBuilderModal Component
 * Visual query builder for creating complex AND/OR queries with nested groups
 */
const QueryBuilderModal = ({ open, onClose, onApply, initialQuery = '' }) => {
  // Root state: holds the entire query tree
  // Each node can be a condition {id, type: 'condition', value, operator}
  // or a group {id, type: 'group', operator, children: [...nodes]}
  const [queryTree, setQueryTree] = useState({
    id: 'root',
    type: 'group',
    operator: 'and', // This doesn't apply to root, but we'll keep for consistency
    children: [
      { id: generateId(), type: 'condition', value: '', operator: 'and' }
    ]
  });

  // Generate unique IDs for conditions and groups
  function generateId() {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Parse query string into builder tree structure
  // Simple direct parser: respects parentheses as group boundaries, no flattening
  const parseQueryToTree = (queryString) => {
    if (!queryString || !queryString.trim()) {
      return {
        id: 'root',
        type: 'group',
        operator: 'and',
        children: [
          { id: generateId(), type: 'condition', value: '', operator: 'and' }
        ]
      };
    }

    // Tokenize: split by whitespace/parens, handle quoted strings
    const tokenize = (str) => {
      const tokens = [];
      const quotedRegex = /"([^"]*)"/g;
      const quotedParts = [];
      let match;

      // Find all quoted strings
      while ((match = quotedRegex.exec(str)) !== null) {
        quotedParts.push({
          start: match.index,
          end: match.index + match[0].length,
          value: match[1]
        });
      }

      let currentPos = 0;

      // Parse non-quoted portions
      const parseSegment = (text) => {
        const result = [];
        let i = 0;
        let word = '';

        while (i < text.length) {
          const char = text[i];
          if (char === '(' || char === ')') {
            if (word.trim()) {
              const lower = word.trim().toLowerCase();
              result.push({
                type: lower === 'and' || lower === 'or' ? 'keyword' : 'term',
                value: lower === 'and' || lower === 'or' ? lower : word.trim()
              });
              word = '';
            }
            result.push({ type: 'parenthesis', value: char });
            i++;
          } else if (/\s/.test(char)) {
            if (word.trim()) {
              const lower = word.trim().toLowerCase();
              result.push({
                type: lower === 'and' || lower === 'or' ? 'keyword' : 'term',
                value: lower === 'and' || lower === 'or' ? lower : word.trim()
              });
              word = '';
            }
            i++;
          } else {
            word += char;
            i++;
          }
        }

        if (word.trim()) {
          const lower = word.trim().toLowerCase();
          result.push({
            type: lower === 'and' || lower === 'or' ? 'keyword' : 'term',
            value: lower === 'and' || lower === 'or' ? lower : word.trim()
          });
        }

        return result;
      };

      // Process segments between quoted strings
      quotedParts.forEach(quoted => {
        if (quoted.start > currentPos) {
          tokens.push(...parseSegment(str.substring(currentPos, quoted.start)));
        }
        tokens.push({ type: 'term', value: quoted.value });
        currentPos = quoted.end;
      });

      if (currentPos < str.length) {
        tokens.push(...parseSegment(str.substring(currentPos)));
      }

      return tokens;
    };

    // Simple recursive parser that respects parentheses literally
    const parseTokens = (tokens) => {
      let index = 0;

      const createGroup = (operator = 'and') => ({
        id: generateId(),
        type: 'group',
        operator,
        children: []
      });

      const parseGroup = (operator = 'and') => {
        const group = createGroup(operator);
        let nextOp = 'and';

        while (index < tokens.length) {
          const token = tokens[index];

          if (token.type === 'term') {
            group.children.push({
              id: generateId(),
              type: 'condition',
              value: token.value,
              operator: nextOp
            });
            nextOp = 'and'; // Reset to default
            index++;
          } else if (token.type === 'keyword') {
            nextOp = token.value; // 'and' or 'or'
            index++;
          } else if (token.type === 'parenthesis' && token.value === '(') {
            index++; // Skip '('
            const subGroup = parseGroup(nextOp); // Recurse with operator that applies to this group
            group.children.push({
              ...subGroup,
              operator: nextOp
            });
            nextOp = 'and'; // Reset after using
            // Skip the matching ')'
            if (index < tokens.length && tokens[index].type === 'parenthesis' && tokens[index].value === ')') {
              index++;
            }
          } else if (token.type === 'parenthesis' && token.value === ')') {
            // End of this group
            break;
          } else {
            index++;
          }
        }

        return group;
      };

      const tokens_array = tokens;
      return parseGroup('and');
    };

    const tokens = tokenize(queryString);
    const tree = parseTokens(tokens);

    // Ensure we have a valid root
    if (!tree || !tree.children || tree.children.length === 0) {
      return {
        id: 'root',
        type: 'group',
        operator: 'and',
        children: [
          { id: generateId(), type: 'condition', value: '', operator: 'and' }
        ]
      };
    }

    return {
      ...tree,
      id: 'root'
    };
  };

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
        { id: generateId(), type: 'condition', value: '', operator: 'and' }
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
            { id: generateId(), type: 'condition', value: '', operator: 'and' }
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

  // Convert query tree to string with parentheses
  // Adds parentheses when operators change to preserve left-to-right evaluation
  const buildQueryString = (node) => {
    if (node.type === 'condition') {
      return node.value.trim();
    }

    if (node.type === 'group') {
      if (node.children.length === 0) return '';

      // Build expression left-to-right, wrapping when operators change
      let result = buildQueryString(node.children[0]);
      if (!result) return '';

      let prevOp = null;

      for (let i = 1; i < node.children.length; i++) {
        const child = node.children[i];
        const childStr = buildQueryString(child);
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
    const queryString = buildQueryString(queryTree);
    if (queryString.trim()) {
      onApply(queryString);
    }
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
        { id: generateId(), type: 'condition', value: '', operator: 'and' }
      ]
    });
    onClose();
  };

  // Render a condition (input field)
  const renderCondition = (condition, isFirst, parentId) => {
    return (
      <Box
        key={condition.id}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
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
                backgroundColor: 'rgba(37, 99, 235, 0.06)',
                borderRadius: '6px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.light',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
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
              backgroundColor: 'error.light',
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
          mb: isRoot ? 0 : 2,
        }}
      >
        {/* Group container with visual styling */}
        <Paper
          elevation={isRoot ? 0 : 2}
          sx={{
            p: 2.5,
            pt: isRoot ? 0 : 3.5,
            pl: isRoot ? 0 : 3,
            border: isRoot ? 'none' : 'none',
            borderLeft: isRoot ? 'none' : '3px solid',
            borderLeftColor: isRoot ? 'transparent' : 'primary.main',
            borderColor: isRoot ? 'transparent' : 'transparent',
            backgroundColor: isRoot ? 'transparent' : '#f0f7ff',
            position: 'relative',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': !isRoot ? {
              elevation: 3,
              boxShadow: '0 10px 25px -5px rgb(37, 99, 235, 0.15), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              backgroundColor: '#ffffff',
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
                  fontWeight: 700,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s ease',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
              >
                <MenuItem value="and" sx={{ fontSize: '0.875rem' }}>AND</MenuItem>
                <MenuItem value="or" sx={{ fontSize: '0.875rem' }}>OR</MenuItem>
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
                return renderCondition(child, index === 0, group.id);
              } else if (child.type === 'group') {
                return renderGroup(child, false);
              }
              return null;
            })}
          </Box>

          {/* Add buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Add />}
              onClick={() => addCondition(group.id)}
              sx={{
                fontSize: '0.8125rem',
                padding: '6px 14px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'primary.main',
                fontWeight: 600,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'rgba(37, 99, 235, 0.2)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.15)',
                  borderColor: 'primary.main',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)',
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
                fontSize: '0.8125rem',
                padding: '6px 14px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                color: 'text.secondary',
                fontWeight: 600,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'rgba(37, 99, 235, 0.15)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                  borderColor: 'rgba(37, 99, 235, 0.3)',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.1)',
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

      <DialogContent dividers sx={{ backgroundColor: '#fafbfc' }}>
        <Box sx={{ minHeight: 200 }}>
          {renderGroup(queryTree, true)}
        </Box>

        {/* Preview */}
        <Box sx={{
          mt: 3,
          p: 2,
          backgroundColor: 'grey.100',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.200',
          transition: 'all 0.2s ease',
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
            {buildQueryString(queryTree) || <span style={{ color: '#cbd5e1' }}>(empty)</span>}
          </Typography>
        </Box>
      </DialogContent>

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
