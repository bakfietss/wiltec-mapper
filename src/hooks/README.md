# Custom Hooks Documentation

## Data Management Hooks

### useJsonData
A hook for managing JSON data import and state:
- Handles JSON parsing and validation
- Maintains node data state
- Supports array and object data structures
- Provides error handling for invalid JSON
- Optional callback for field generation

**Usage:** Used in nodes that need to import and manage JSON data

### useSchemaFields
A sophisticated hook for managing schema field structures:
- Handles field creation, updates, and deletion
- Supports nested field structures
- Automatic field generation from objects
- Type management (string, number, boolean, date, object, array)
- Path tracking for nested fields

**Usage:** Used in components that need to manage and display field schemas

### useNodeValueUpdates
A complex hook for managing node value calculations:
- Handles different node types (target, transform, coalesce, concat)
- Manages field value propagation
- Supports nested data structures
- Handles edge connections and value passing
- Provides transformation logic

**Usage:** Core hook for the node mapping system

### useNodeDataSync
A hook for synchronizing node data with React Flow:
- Ensures immediate updates in the pipeline
- Handles cleanup on disconnection
- Provides data change notifications
- Maintains node state consistency

**Usage:** Used in nodes to keep their internal state synchronized with the flow

## UI and State Management Hooks

### useIsMobile
A responsive design hook for mobile detection:
- Tracks viewport width changes
- Provides mobile state boolean
- Uses 768px breakpoint
- Handles window resize events

**Usage:** Used for responsive UI adjustments

### useToast
A comprehensive toast notification system:
- Manages toast notifications queue
- Handles toast lifecycle (add, update, dismiss, remove)
- Supports custom toast actions
- Limits concurrent toasts
- Provides toast update and dismiss functions

**Usage:** Used throughout the application for user notifications

### useManualUpdateTrigger
A simple hook for triggering manual updates:
- Provides update counter state
- Callback function for triggering updates
- Useful for forcing re-renders

**Usage:** Used when manual component updates are needed

## Hook Interactions

1. **Data Flow**
   - `useJsonData` → `useSchemaFields`: JSON data is used to generate schema fields
   - `useSchemaFields` → `useNodeValueUpdates`: Schema defines how values are calculated
   - `useNodeValueUpdates` → `useNodeDataSync`: Calculated values are synced to the flow

2. **UI Updates**
   - `useIsMobile` affects layout and component rendering
   - `useToast` provides feedback for user actions
   - `useManualUpdateTrigger` forces updates when needed

## Best Practices

1. Use `useJsonData` for all JSON imports to ensure consistent error handling
2. Combine `useSchemaFields` with `useNodeValueUpdates` for complete field management
3. Always use `useNodeDataSync` when modifying node data
4. Use `useToast` for user feedback on important actions
5. Consider mobile breakpoints with `useIsMobile` for responsive design
6. Use `useManualUpdateTrigger` sparingly, only when other update methods aren't suitable