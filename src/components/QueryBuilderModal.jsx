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
import { Close as CloseIcon, Add, Delete } from '@mui/icons-material';

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

    // Parse using the same logic as search (with proper AST)
    const parseTokens = (str) => {
      const tokens = [];
      const quotedRegex = /"([^"]*)"/g;
      const quotedParts = [];
      let match;

      while ((match = quotedRegex.exec(str)) !== null) {
        quotedParts.push({
          start: match.index,
          end: match.index + match[0].length,
          value: match[1]
        });
      }

      let currentPos = 0;
      const parseNonQuoted = (text) => {
        const result = [];
        let i = 0;
        let word = '';

        while (i < text.length) {
          const char = text[i];
          if (char === '(' || char === ')') {
            if (word.trim()) {
              const lower = word.trim().toLowerCase();
              if (lower === 'and' || lower === 'or') {
                result.push({ type: 'keyword', value: lower });
              } else {
                result.push({ type: 'term', value: word.trim() });
              }
              word = '';
            }
            result.push({ type: 'parenthesis', value: char });
            i++;
          } else if (char === ' ' || char === '\t' || char === '\n') {
            if (word.trim()) {
              const lower = word.trim().toLowerCase();
              if (lower === 'and' || lower === 'or') {
                result.push({ type: 'keyword', value: lower });
              } else {
                result.push({ type: 'term', value: word.trim() });
              }
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
          if (lower === 'and' || lower === 'or') {
            result.push({ type: 'keyword', value: lower });
          } else {
            result.push({ type: 'term', value: word.trim() });
          }
        }
        return result;
      };

      quotedParts.forEach(quoted => {
        if (quoted.start > currentPos) {
          const nonQuoted = str.substring(currentPos, quoted.start);
          tokens.push(...parseNonQuoted(nonQuoted));
        }
        if (quoted.value) {
          tokens.push({ type: 'term', value: quoted.value });
        }
        currentPos = quoted.end;
      });

      if (currentPos < str.length) {
        const remaining = str.substring(currentPos);
        tokens.push(...parseNonQuoted(remaining));
      }

      return tokens;
    };

    // Build AST (same as search logic)
    const buildAST = (tokens) => {
      if (tokens.length === 0) return null;
      let index = 0;

      const parseOr = () => {
        let left = parseAnd();
        while (index < tokens.length && tokens[index].type === 'keyword' && tokens[index].value === 'or') {
          index++;
          const right = parseAnd();
          left = { type: 'or', left, right };
        }
        return left;
      };

      const parseAnd = () => {
        let left = parsePrimary();
        while (index < tokens.length && tokens[index].type === 'keyword' && tokens[index].value === 'and') {
          index++;
          const right = parsePrimary();
          left = { type: 'and', left, right };
        }
        return left;
      };

      const parsePrimary = () => {
        if (index < tokens.length && tokens[index].type === 'parenthesis' && tokens[index].value === '(') {
          index++;
          const expr = parseOr();
          if (index < tokens.length && tokens[index].type === 'parenthesis' && tokens[index].value === ')') {
            index++;
          }
          return expr;
        }
        if (index < tokens.length && tokens[index].type === 'term') {
          const term = tokens[index];
          index++;
          return { type: 'term', value: term.value };
        }
        if (index < tokens.length) {
          index++;
          return parsePrimary();
        }
        return null;
      };

      return parseOr();
    };

    // Convert AST to builder tree format
    // Preserves nested structure from parentheses
    const astToBuilderTree = (astNode, parentOperator = 'and', isFirst = true) => {
      if (!astNode) return null;

      // Base case: term node becomes a condition
      if (astNode.type === 'term') {
        return {
          id: generateId(),
          type: 'condition',
          value: astNode.value,
          operator: isFirst ? parentOperator : astNode.operator || parentOperator
        };
      }

      // Recursive case: AND/OR node
      const nodeOperator = astNode.type; // 'and' or 'or'

      // Collect all children with the same operator (flatten)
      const collectSameOperator = (node, op) => {
        if (!node) return [];

        if (node.type === op) {
          // Same operator - recurse on both sides
          return [
            ...collectSameOperator(node.left, op),
            ...collectSameOperator(node.right, op)
          ];
        } else {
          // Different operator or term - this becomes a child
          return [node];
        }
      };

      const flattenedNodes = collectSameOperator(astNode, nodeOperator);

      // Convert each flattened node to builder format
      const children = flattenedNodes.map((node, index) => {
        if (node.type === 'term') {
          return {
            id: generateId(),
            type: 'condition',
            value: node.value,
            operator: index === 0 ? (isFirst ? parentOperator : nodeOperator) : nodeOperator
          };
        } else {
          // This is a nested group with different operator
          const nestedTree = astToBuilderTree(node, nodeOperator, index === 0);
          if (nestedTree && nestedTree.type === 'condition') {
            // Single condition, just return it with correct operator
            return {
              ...nestedTree,
              operator: index === 0 ? (isFirst ? parentOperator : nodeOperator) : nodeOperator
            };
          }
          // Return nested group with correct operator
          return {
            ...nestedTree,
            operator: index === 0 ? (isFirst ? parentOperator : nodeOperator) : nodeOperator
          };
        }
      }).filter(Boolean);

      // If only one child and it's a condition, return it directly
      if (children.length === 1 && children[0].type === 'condition') {
        return children[0];
      }

      // Return as a group
      return {
        id: generateId(),
        type: 'group',
        operator: isFirst ? parentOperator : nodeOperator,
        children
      };
    };

    const tokens = parseTokens(queryString);
    const ast = buildAST(tokens);
    const builderTree = astToBuilderTree(ast, 'and');

    if (!builderTree) {
      return {
        id: 'root',
        type: 'group',
        operator: 'and',
        children: [
          { id: generateId(), type: 'condition', value: '', operator: 'and' }
        ]
      };
    }

    // Wrap in root if not already a group
    if (builderTree.type === 'condition') {
      return {
        id: 'root',
        type: 'group',
        operator: 'and',
        children: [builderTree]
      };
    }

    // Make it the root
    return {
      ...builderTree,
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
      <Box key={condition.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        {/* Operator dropdown - only show if not the first condition */}
        {!isFirst && (
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <Select
              value={condition.operator}
              onChange={(e) => updateNodeOperator(condition.id, e.target.value)}
            >
              <MenuItem value="and">AND</MenuItem>
              <MenuItem value="or">OR</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Input field */}
        <TextField
          size="small"
          fullWidth
          value={condition.value}
          onChange={(e) => updateNodeValue(condition.id, e.target.value)}
          placeholder="Enter search term..."
          sx={{ flex: 1 }}
        />

        {/* Delete button */}
        <IconButton
          size="small"
          onClick={() => deleteNode(condition.id)}
          color="error"
        >
          <Delete fontSize="small" />
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
          mb: 2,
        }}
      >
        {/* Group container with visual styling */}
        <Paper
          elevation={isRoot ? 0 : 3}
          sx={{
            p: 2,
            border: isRoot ? 'none' : '1px solid',
            borderColor: isRoot ? 'transparent' : 'grey.300',
            backgroundColor: isRoot ? 'transparent' : 'grey.50',
            position: 'relative',
          }}
        >
          {/* Operator badge for non-root groups - positioned half in/half out */}
          {!isRoot && (
            <FormControl
              size="small"
              sx={{
                position: 'absolute',
                top: -14,
                left: 16,
                minWidth: 80,
                backgroundColor: 'white',
                zIndex: 1,
              }}
            >
              <Select
                value={group.operator}
                onChange={(e) => updateNodeOperator(group.id, e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                  },
                }}
              >
                <MenuItem value="and">AND</MenuItem>
                <MenuItem value="or">OR</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Delete button for groups (top-right corner) */}
          {!isRoot && (
            <IconButton
              size="small"
              onClick={() => deleteNode(group.id)}
              color="error"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          )}

          {/* Render all children */}
          <Box sx={{ mt: isRoot ? 0 : 2 }}>
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
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => addCondition(group.id)}
            >
              Add Condition
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => addGroup(group.id)}
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
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Query Builder</Typography>
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ minHeight: 200 }}>
          {renderGroup(queryTree, true)}
        </Box>

        {/* Preview */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Query Preview:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
            {buildQueryString(queryTree) || '(empty)'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QueryBuilderModal;
