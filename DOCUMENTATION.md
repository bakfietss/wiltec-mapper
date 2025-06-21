
# Data Mapping Application Documentation

## Overview
This is a React-based data mapping application that allows users to create visual data transformation pipelines using a node-based interface. Built with React Flow, it supports various transformation nodes, source/target schemas, and data mapping configurations.

## Core Architecture

### Main Application Structure
```
src/
├── Canvas/           # Core canvas and pipeline logic
├── compontents/      # UI components for nodes
├── store/           # Zustand state management
├── Theme/           # Theme context
└── components/      # General UI components
```

## Core Components and Functions

### 1. Canvas/Pipeline.tsx (654 lines - NEEDS REFACTORING)
**Primary Purpose**: Main canvas component that orchestrates the entire mapping interface

#### Key Functions:
- **`calculateTargetFieldValues()`** - Calculates output values for target nodes based on connections
- **`getSourceValue()`** - Extracts values from source nodes using handle IDs
- **`evaluateCondition()`** - Evaluates IF-THEN conditions with various operators
- **`applyStringTransform()`** - Applies string transformations (uppercase, lowercase, etc.)
- **`applyCoalesceTransform()`** - Handles coalesce logic with priority-based rules
- **`parseDate()`** - Parses various date formats for date operations

#### Usage Status:
- ✅ **ACTIVELY USED**: All functions are core to the data transformation pipeline
- ⚠️ **COMPLEX**: This file is too large and needs refactoring

#### Node Types Supported:
- `source` - Data source nodes
- `target` - Data target nodes  
- `transform` - Generic transformation nodes
- `coalesceTransform` - Coalesce transformation nodes
- `splitterTransform` - Text splitting nodes
- `ifThen` - Conditional logic nodes
- `staticValue` - Static value nodes
- `conversionMapping` - Value mapping nodes

### 2. Canvas/NodeFactories.tsx
**Primary Purpose**: Factory functions for creating different types of nodes

#### Key Functions:
- **`addSchemaNode(type)`** - Creates source or target schema nodes
- **`addTransformNode(transformType)`** - Creates transformation nodes
- **`addMappingNode()`** - Creates conversion mapping nodes

#### Usage Status:
- ✅ **ACTIVELY USED**: Essential for node creation in the toolbar

### 3. Canvas/importers/ConfigImporter.ts (248 lines - NEEDS REFACTORING)
**Primary Purpose**: Imports mapping configurations from JSON files

#### Key Functions:
- **`importMappingConfiguration(config)`** - Main import function that processes JSON config

#### Node Import Handlers:
- **Source Nodes**: Preserves fields and sample data
- **Target Nodes**: Preserves fields and output data
- **Transform Nodes**: Handles different transform types with specific logic
- **Coalesce Nodes**: ⚠️ **COMPLEX LOGIC** - Multiple data extraction paths
- **IF-THEN Nodes**: Conditional logic preservation
- **Static Value Nodes**: Static data preservation
- **Mapping Nodes**: Conversion mapping preservation

#### Usage Status:
- ✅ **ACTIVELY USED**: Critical for loading saved mappings
- ⚠️ **ISSUE PRONE**: Complex coalesce handling may be source of import issues

### 4. Store/fieldStore.ts
**Primary Purpose**: Zustand store for managing field and schema state

#### Key Functions:
- **Legacy Field Management**:
  - `addSourceField()`, `updateField()`, `addTargetField()`, `updateTargetField()`
- **Schema Management**:
  - `setSourceSchema()`, `setTargetSchema()`, `setSourceData()`, `updateTargetData()`
- **Conversion Logic**:
  - `setConversionMode()`, `addConversionMapping()`, `updateConversionMapping()`

#### Usage Status:
- ⚠️ **PARTIALLY USED**: Legacy field functions may be unused
- ✅ **ACTIVELY USED**: Schema and conversion functions are core

## Node Components

### 5. Components/SourceNode.tsx
**Primary Purpose**: Displays source data with expandable field tree

#### Key Features:
- Tree-based field display
- Sample data visualization
- Handle generation for connections

#### Usage Status:
- ✅ **ACTIVELY USED**: Core component for data sources

### 6. Components/TargetNode.tsx  
**Primary Purpose**: Displays target schema with calculated values

#### Key Features:
- Field value calculation from connected nodes
- Real-time data transformation display
- Output handle generation

#### Usage Status:
- ✅ **ACTIVELY USED**: Core component for data targets

### 7. Components/CoalesceTransformNode.tsx
**Primary Purpose**: Handles coalesce transformation with multiple inputs

#### Key Features:
- Multiple input handles
- Priority-based rule management
- Default value configuration
- Output type selection

#### Usage Status:
- ✅ **ACTIVELY USED**: Essential for coalesce operations
- ⚠️ **COMPLEX**: May have integration issues with import/export

### 8. Components/TransformNode.tsx
**Primary Purpose**: Generic transformation node wrapper

#### Key Features:
- Renders different transform types based on `transformType`
- Delegates to specific transform components

#### Usage Status:
- ✅ **ACTIVELY USED**: Router for different transform types

## Transformation Functions (in Pipeline.tsx)

### String Transformations
- **`applyStringTransform()`** - Handles:
  - uppercase, lowercase, trim
  - prefix, suffix, substring
  - regex replace operations

### Coalesce Logic
- **`applyCoalesceTransform()`** - Handles:
  - Priority-based value selection
  - Default value fallback
  - Output value mapping

### Conditional Logic  
- **`evaluateCondition()`** - Supports:
  - Basic comparisons (=, !=, >, <, >=, <=)
  - Date comparisons (before/after today, before/after date)

## Data Flow

### Import Process
1. **File Upload** → `MappingManager`
2. **JSON Parsing** → `ConfigImporter.importMappingConfiguration()`
3. **Node Creation** → Individual node type handlers
4. **Edge Creation** → Connection validation and creation
5. **State Update** → `setNodes()` and `setEdges()`

### Export Process
1. **Current State** → `exportUIMappingConfiguration()`
2. **Data Serialization** → JSON configuration creation
3. **File Download** → Blob creation and download

### Real-time Calculation
1. **Node Changes** → `enhancedNodes` memo
2. **Value Calculation** → `calculateTargetFieldValues()`
3. **Transform Application** → Various transform functions
4. **UI Update** → Node data updates

## Potential Issues and Areas of Concern

### 1. ConfigImporter Complexity ⚠️
**File**: `Canvas/importers/ConfigImporter.ts`
**Issues**:
- Multiple data extraction paths for coalesce nodes
- Complex type casting with `as any`
- Nested parameter handling
- Inconsistent data structure expectations

### 2. Pipeline.tsx Size ⚠️
**File**: `Canvas/Pipeline.tsx` 
**Issues**:
- 654 lines - too large for maintainability
- Multiple responsibilities in one file
- Complex transformation logic mixed with UI logic

### 3. Type Safety Issues ⚠️
**Areas**:
- Dynamic property access in ConfigImporter
- `any` type usage for transform configurations
- Inconsistent data structure handling

### 4. Legacy Code ⚠️
**Areas**:
- Field store has both legacy and new approaches
- Some functions may be unused
- Potential dead code in transformation logic

## Recommended Actions

### Immediate Fixes
1. **Refactor ConfigImporter** - Simplify coalesce data extraction
2. **Add Type Safety** - Define proper interfaces for transform configs
3. **Split Pipeline.tsx** - Extract transformation logic to separate files

### Long-term Improvements
1. **Audit Legacy Functions** - Remove unused field management functions
2. **Standardize Data Structures** - Consistent transform configuration format
3. **Add Error Handling** - Better error messages for import/export failures

## Usage Summary

### Actively Used Functions ✅
- All Pipeline.tsx transformation functions
- All NodeFactories functions
- Schema management in fieldStore
- All node components
- Import/export functionality

### Potentially Unused Functions ⚠️
- Legacy field management in fieldStore (`addSourceField`, `updateField`, etc.)
- Some conversion transform toggles
- Certain transform configuration paths

### Problem Areas 🚨
- CoalesceTransformNode import/export integration
- Complex data structure handling in ConfigImporter
- Type safety in transform configurations
- File size and complexity of core files
