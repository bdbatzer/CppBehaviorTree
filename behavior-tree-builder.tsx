'use client'

import React, { useState } from 'react';
import { Upload, Plus, Minus, Code, File, GripVertical, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import "reactflow/dist/style.css";

const defaultNodes = [
  { type: 'decorator', name: 'InvertNode', description: 'Inverts the result of its child node', maxChildren: 1 },
  { type: 'decorator', name: 'RepeatNode', description: 'Repeats child node until it fails', maxChildren: 1 },
  { type: 'decorator', name: 'RetryNode', description: 'Retries child node until it succeeds', maxChildren: 1 },
  { type: 'control', name: 'SelectorNode', description: 'Runs children until one succeeds', maxChildren: Infinity },
  { type: 'control', name: 'SequenceNode', description: 'Runs children until one fails', maxChildren: Infinity },
  { type: 'control', name: 'ParallelNode', description: 'Runs all children simultaneously', maxChildren: Infinity }
];

const BehaviorTreeBuilder = () => {
  const [sourceFiles, setSourceFiles] = useState([]);
  const [availableNodes, setAvailableNodes] = useState(defaultNodes);
  const [treeNodes, setTreeNodes] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOverInfo, setDragOverInfo] = useState(null);
  const [setTreeContainerRef] = useState(null);

  // Calculate tree layout dimensions
  const nodeWidth = 250;
  const nodeHeight = 60;
  const levelHeight = 100;
  const nodeHorizontalSpacing = 20;

  const findNodesInContent = (content) => {
    const matches = content.match(/(?:class|struct)\s+(\w+)[^{]*{[^}]*Tick\s*\([^)]*\)[^}]*}/g);
    if (!matches) return [];

    return matches.map(match => {
      const nameMatch = match.match(/(?:class|struct)\s+(\w+)/);
      const name = nameMatch ? nameMatch[1] : 'UnknownNode';
      return {
        type: 'leaf',
        name,
        description: 'Custom leaf node with Tick function',
        maxChildren: 0,
        children: []
      };
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const newNodes = findNodesInContent(content);
      if (newNodes.length > 0) {
        setSourceFiles(prev => [...prev, { name: file.name, content }]);
        setAvailableNodes(prev => [...prev, ...newNodes]);
      }
    };
    reader.readAsText(file);
  };

  const addNode = (node) => {
    const newNode = {
      ...node,
      id: Date.now(),
      children: [],
      parent: null
    };
    setTreeNodes(prev => [...prev, newNode]);
    if (node.type !== 'leaf') {
      setExpandedNodes(prev => new Set([...prev, newNode.id]));
    }
  };

  const insertAsSibling = (sourceNode, targetId, tree) => {
    // First try to find the target node
    const targetInfo = findNodeById(tree, targetId);
    if (!targetInfo) return tree;

    // If target has no parent (root level), add to root level
    if (!targetInfo.parent) {
      const targetIndex = tree.findIndex(node => node.id === targetId);
      if (targetIndex === -1) return tree;

      const updatedTree = [...tree];
      updatedTree.splice(targetIndex, 0, {
        ...sourceNode,
        parent: null
      });
      return updatedTree;
    }

    // Handle nodes with parents
    const result = JSON.parse(JSON.stringify(tree));
    const insertSibling = (nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === targetId) {
          nodes.splice(i, 0, {
            ...sourceNode,
            parent: nodes[i].parent
          });
          return true;
        }
        if (nodes[i].children) {
          if (insertSibling(nodes[i].children)) {
            return true;
          }
        }
      }
      return false;
    };

    insertSibling(result);
    return result;
  };

  const toggleExpand = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const findNodeById = (nodes, id, parent = null) => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        return {
          node: nodes[i],
          path: [i],
          parent
        };
      }
      if (nodes[i].children && nodes[i].children.length > 0) {
        const result = findNodeById(nodes[i].children, id, nodes[i]);
        if (result) {
          return {
            ...result,
            path: [i, ...result.path]
          };
        }
      }
    }
    return null;
  };

  // Check if target is a descendant of source
  const isDescendant = (sourceId, targetChildren) => {
    const sourceInfo = findNodeById(targetChildren, sourceId);
    if (!sourceInfo) return false;
    return true;
  };

  const removeNode = (nodes, path) => {
    if (path.length === 0) return nodes;

    if (path.length === 1) {
      return nodes.filter((_, index) => index !== path[0]);
    }

    return nodes.map((node, index) => {
      if (index === path[0]) {
        return {
          ...node,
          children: removeNode(node.children, path.slice(1))
        };
      }
      return node;
    });
  };

  const handleDrop = (e, targetId, position) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNode || !dragOverInfo || draggedNode === targetId) {
      setDragOverInfo(null);
      return;
    }

    const currentTree = JSON.parse(JSON.stringify(treeNodes));
    const sourceInfo = findNodeById(currentTree, draggedNode);
    const targetInfo = findNodeById(currentTree, targetId);

    if (!sourceInfo || !targetInfo) {
      setDragOverInfo(null);
      return;
    }

    // Prevent cycles
    if (isDescendant(targetId, sourceInfo.node.children)) {
      setDragOverInfo(null);
      return;
    }

    // Check if we're trying to add a child to a decorator that already has one
    if (position === 'child' &&
      targetInfo.node.type === 'decorator' &&
      targetInfo.node.children &&
      targetInfo.node.children.length >= 1) {
      setDragOverInfo(null);
      return; // Just return without doing anything
    }

    // Remove node from its original position
    let newTree = removeNode(currentTree, sourceInfo.path);

    if (position === 'sibling') {
      // Handle sibling insertion
      newTree = insertAsSibling(sourceInfo.node, targetId, newTree);
    } else if (position === 'child') {
      // Only allow child insertion for non-leaf nodes
      if (targetInfo.node.type !== 'leaf') {
        const targetNode = findNodeById(newTree, targetId);
        if (targetNode) {
          const updatedSourceNode = {
            ...sourceInfo.node,
            parent: targetId
          };

          if (!targetNode.node.children) {
            targetNode.node.children = [];
          }

          targetNode.node.children.push(updatedSourceNode);
          setExpandedNodes(prev => new Set([...prev, targetId]));
        }
      }
    }

    setTreeNodes(newTree);
    setDraggedNode(null);
    setDragOverInfo(null);
  };

  // Rest of the component remains the same...
  const generateNodeCode = (node) => {
    if (!node) return '';

    if (node.type === 'leaf') {
      return node.name;
    } else if (node.type === 'decorator') {
      const childCode = node.children.length > 0
        ? generateNodeCode(node.children[0])
        : 'void';
      return `${node.name}<${childCode}>`;
    } else {
      const childrenCode = node.children.length > 0
        ? node.children.map(generateNodeCode).join(', ')
        : 'void';
      return `${node.name}<${childrenCode}>`;
    }
  };

  const calculateNodePositions = (nodes) => {
    const positions = new Map();

    const processNode = (node, level = 0, offsetX = 0) => {
      if (!node) return { width: 0 };

      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;

      let totalChildrenWidth = 0;
      let childrenResults = [];

      if (hasChildren && isExpanded) {
        node.children.forEach((child) => {
          const childResult = processNode(child, level + 1, offsetX + totalChildrenWidth);
          childrenResults.push(childResult);
          totalChildrenWidth += childResult.width + nodeHorizontalSpacing;
        });
      }

      const width = Math.max(nodeWidth, totalChildrenWidth || nodeWidth);
      const x = offsetX + (width - nodeWidth) / 2;
      const y = level * levelHeight;

      positions.set(node.id, { x, y, width: nodeWidth, height: nodeHeight });

      return { width };
    };

    let totalWidth = 0;
    nodes.forEach((node) => {
      const result = processNode(node, 0, totalWidth);
      totalWidth += result.width + nodeHorizontalSpacing;
    });

    return { positions, totalWidth };
  };

  const renderConnectingLines = (node, positions) => {
    if (!node || !positions.has(node.id)) return null;

    const isExpanded = expandedNodes.has(node.id);
    const parentPos = positions.get(node.id);

    if (!node.children || !isExpanded || node.children.length === 0) return null;

    return node.children.map((child) => {
      const childPos = positions.get(child.id);
      if (!childPos) return null;

      return (
        <g key={`line-${node.id}-${child.id}`}>
          <line
            x1={parentPos.x + parentPos.width / 2}
            y1={parentPos.y + parentPos.height}
            x2={childPos.x + childPos.width / 2}
            y2={childPos.y}
            stroke="#94a3b8"
            strokeWidth="2"
          />
          {renderConnectingLines(child, positions)}
        </g>
      );
    });
  };

  const renderNode = (node, positions) => {
    if (!positions.has(node.id)) return null;

    const pos = positions.get(node.id);
    const isExpanded = expandedNodes.has(node.id);
    const canHaveChildren = node.type !== 'leaf';
    const isDraggedOver = dragOverInfo?.targetId === node.id;
    const dropPosition = dragOverInfo?.position;

    const handleDragStart = (e) => {
      setDraggedNode(node.id);
      e.dataTransfer.effectAllowed = 'move';
      const emptyImg = document.createElement('div');
      e.dataTransfer.setDragImage(emptyImg, 0, 0);
    };

    const handleRemove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nodeInfo = findNodeById(treeNodes, node.id);
      if (nodeInfo) {
        setTreeNodes(prev => removeNode(prev, nodeInfo.path));
      }
    };

    return (
      <React.Fragment key={node.id}>
        <div
          style={{
            position: 'absolute',
            left: pos.x,
            top: pos.y,
            width: pos.width,
          }}
          className="relative"
          draggable
          onDragStart={handleDragStart}
        >
          {/* Drop zones */}
          <div
            className="absolute left-0 w-1/2 h-full z-10"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedNode === null || draggedNode === node.id) return;
              setDragOverInfo({ targetId: node.id, position: 'sibling' });
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget.contains(e.relatedTarget)) return;
              setDragOverInfo(null);
            }}
            onDrop={(e) => handleDrop(e, node.id, 'sibling')}
          />

          {canHaveChildren && (
            <div
              className="absolute right-0 w-1/2 h-full z-10"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedNode === null || draggedNode === node.id) return;
                setDragOverInfo({ targetId: node.id, position: 'child' });
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget)) return;
                setDragOverInfo(null);
              }}
              onDrop={(e) => handleDrop(e, node.id, 'child')}
            />
          )}

          <div
            className={`
              flex items-center p-4 rounded bg-white
              transition-all duration-200 relative
              ${isDraggedOver && dropPosition === 'child' ? 'bg-green-100 ring-2 ring-green-500' : ''}
              ${isDraggedOver && dropPosition === 'sibling' ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
              ${!isDraggedOver ? 'border border-gray-200' : ''}
              cursor-move
              touch-none
              group
            `}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <GripVertical className="w-5 h-5 text-gray-400 shrink-0" />
              {canHaveChildren && node.children && node.children.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(node.id);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              )}
              <div className="truncate">
                <span className="font-medium">{node.name}</span>
                <span className="ml-2 text-sm text-gray-600">({node.type})</span>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0 ml-2 z-20"
              aria-label="Remove node"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>
        {canHaveChildren && isExpanded && node.children?.map(child => renderNode(child, positions))}
      </React.Fragment>
    );
  };

  const renderTree = () => {
    if (treeNodes.length === 0) {
      return (
        <Alert>
          <AlertDescription>
            Click on available nodes to start building your behavior tree
          </AlertDescription>
        </Alert>
      );
    }

    const { positions, totalWidth } = calculateNodePositions(treeNodes);
    const maxY = Math.max(...Array.from(positions.values(), pos => pos.y)) || 0;
    const totalHeight = maxY + nodeHeight + 80; // Add padding

    return (
      <div className="relative" style={{
        height: `${totalHeight}px`,
        width: `${Math.max(totalWidth, 500)}px`,
        minHeight: '200px'
      }}>
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          {treeNodes.map(node => (
            <g key={`lines-${node.id}`}>
              {renderConnectingLines(node, positions)}
            </g>
          ))}
        </svg>
        <div className="relative" style={{ zIndex: 1 }}>
          {treeNodes.map(node => renderNode(node, positions))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="w-5 h-5" />
              Source Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                <Upload className="w-5 h-5" />
                <span>Upload C++ File</span>
                <input
                  type="file"
                  accept=".cpp,.hpp,.h"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <div className="space-y-2">
                {sourceFiles.map(file => (
                  <div key={file.name} className="text-sm text-gray-600">
                    {file.name}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Nodes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Available Nodes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableNodes.map(node => (
                <div
                  key={node.name}
                  className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => addNode(node)}
                >
                  <div>
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-600">{node.description}</div>
                  </div>
                  <Plus className="w-4 h-4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Tree Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto" ref={setTreeContainerRef}>
              {renderTree()}
            </div>

            {treeNodes.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Generated Code:</h3>
                <pre className="bg-gray-50 p-4 rounded overflow-x-auto">
                  {treeNodes.map(generateNodeCode).join('\n')}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BehaviorTreeBuilder;