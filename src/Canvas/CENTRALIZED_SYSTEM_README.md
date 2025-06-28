# Centralized Node Rendering System

## Overview
This project uses a centralized system for calculating and rendering node values. All data flow and transformations are handled through a single pipeline.

## Core Components

### 1. `useNodeValueUpdates.ts` - The Central Engine
**Purpose**: Calculates all node field values based on connections and transformations.

**What it does**:
- Processes all nodes and edges to calculate field values
- Handles different node types (source, target, transform, ifThen, etc.)
- Returns `enhancedNodes` with calculated `fieldValues`
- Automatically triggers when connections change

**Used by**: Pipeline.tsx

### 2. `useManualUpdateTrigger.ts` - Update Coordination
**Purpose**: Triggers recalculation when connections/data changes.

**What it does**:
- Provides `triggerUpdate()` function to force recalculation
- Increments update counter to trigger useNodeValueUpdates
- Called on: connection changes, node data changes, imports

**Used by**: Pipeline.tsx

### 3. `useNodeDataSync.ts` - Node State Sync
**Purpose**: Syncs individual node internal state with React Flow.

**What it does**:
- Updates React Flow node data when component state changes
- Ensures immediate updates in the pipeline
- Used by individual node components for their internal state

**Used by**: All node components (TransformNode, CoalesceTransformNode, etc.)

## Data Flow Architecture

```
User Action (connect, import, edit)
    ↓
Pipeline triggers useManualUpdateTrigger
    ↓
useNodeValueUpdates recalculates all values
    ↓
enhancedNodes with fieldValues returned
    ↓
Pipeline renders updated nodes
```

## Creating New Node Types

When creating a new node type, follow this pattern:

### 1. Create the Node Component
```jsx
const MyNewNode = ({ data, id }) => {
  const [localState, setLocalState] = useState(data.someValue);
  
  // Sync local state with centralized system
  useNodeDataSync(id, { 
    someValue: localState,
    nodeType: 'myNewType'
  }, [localState]);
  
  return (
    // Your node JSX
  );
};
```

### 2. Add to NodeFactories.tsx
```jsx
export const nodeTypes = {
  // ... existing types
  myNewType: MyNewNode,
};
```

### 3. Add Value Calculation Logic
In `useNodeValueUpdates.ts`, add your node type to `calculateNodeFieldValues`:

```jsx
// Handle your new node type
if (node.type === 'myNewType') {
  return calculateMyNewNodeValues(node, nodes, edges);
}
```

### 4. Create Calculation Function
```jsx
const calculateMyNewNodeValues = (node, nodes, edges) => {
  // Get incoming connections
  const inputEdges = edges.filter(e => e.target === node.id);
  
  // Calculate your node's output values
  const calculatedValue = /* your logic */;
  
  return {
    ...node,
    data: {
      ...node.data,
      calculatedValue
    }
  };
};
```

## Import/Export System

### Configuration Structure
- **UI Config**: Node positions, visual state, UI-specific data
- **Execution Config**: Business logic, mappings, transformation rules
- **Documentation**: Human-readable mapping documentation

### Import Flow
1. `importMappingConfiguration()` processes the config
2. Individual importers handle different node types
3. `triggerUpdate('MAPPING_IMPORTED')` recalculates values

## Node Types Supported

- **source**: Data input nodes with schema fields
- **target**: Data output nodes that receive mapped values
- **transform**: Generic transformation nodes
- **coalesceTransform**: Priority-based fallback logic
- **ifThen**: Conditional logic nodes
- **staticValue**: Fixed value nodes
- **conversionMapping**: Value mapping/conversion nodes
- **splitterTransform**: Text splitting nodes

## Debugging Tips

1. **Check Console Logs**: The system logs all major operations
2. **Update Triggers**: Look for "MANUAL UPDATE TRIGGERED" messages
3. **Value Calculation**: Check "CENTRALIZED VALUE CALCULATION" logs
4. **Connection Issues**: Verify edges are being passed correctly

## Common Issues

1. **Values not updating**: Check if `triggerUpdate()` is being called
2. **Import not working**: Verify importer is setting correct data structure
3. **Node not rendering**: Ensure node type is registered in `nodeTypes`
4. **State not syncing**: Use `useNodeDataSync` in your node component
