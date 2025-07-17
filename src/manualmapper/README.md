# ManualMapper Component Documentation

## Core Components

### NodeEditSheet
A reusable modal component for editing node properties:
- Slides in from the side of the screen
- Triggered by a small edit icon button
- Customizable title and content
- Built on shadcn/ui Sheet component
- Supports custom trigger button styling

**UI Location:** Appears when clicking the edit icon (pencil) on any node in the mapping interface

### DataSidebar
A collapsible sidebar for data management:
- Configurable for left or right side positioning
- Toggle button for show/hide
- JSON data import functionality
- Formatted data display
- Clear data functionality
- JSON validation with error handling

**UI Location:** Visible on either side of your screen, with a chevron button to toggle visibility

### TreeFieldSelector
A hierarchical data visualization component:
- Expandable tree structure for nested data
- Color-coded type indicators
- Handles arrays and objects
- Field selection capability
- Array length display
- Value preview for primitive types
- Auto-expansion for better visibility

**UI Location:** Appears when working with structured data, displaying the field hierarchy within nodes

### FieldRenderer
A sophisticated field rendering component:
- Supports multiple data types (string, number, boolean, date, object, array)
- Connection handles for node linking
- Array grouping functionality
- Color-coded type display
- Field selection and expansion controls
- Value display and update capabilities

**UI Location:** Used within nodes to display available fields and their connections to other nodes

### FormatSelector
A versatile data format parsing component:
- Supports multiple data formats:
  - JSON
  - CSV (with delimiter configuration)
  - XML
  - EDI
  - Plain text
- Format-specific configuration options
- Error handling and validation
- Preview placeholders for each format
- Customizable parsing options

**UI Location:** Opens as a modal dialog when importing data, allowing format selection and configuration

### JsonImportDialog
A modal dialog for JSON data import:
- Clean, focused interface for JSON input
- Customizable trigger button and title
- Import confirmation
- Built on shadcn/ui Dialog component
- Integrated with Upload icon for better UX

**UI Location:** Accessible via import buttons throughout the interface, particularly in nodes and sidebars

## Component Interactions

### Data Import Flow
1. Click import button → Opens FormatSelector or JsonImportDialog
2. Select format and input data → Data is parsed and validated
3. Parsed data appears in DataSidebar
4. TreeFieldSelector automatically generates field hierarchy
5. FieldRenderer displays the fields within nodes

### Node Editing Flow
1. Click node's edit icon → Opens NodeEditSheet
2. Make changes in the sheet
3. Changes reflect immediately in FieldRenderer
4. Connected nodes update through the handles

### Field Mapping Flow
1. Use DataSidebar to view source/target data
2. Navigate structure with TreeFieldSelector
3. Connect fields using FieldRenderer's handles
4. Configure mappings through NodeEditSheet

## Usage Tips

- Use the DataSidebar's toggle buttons to maximize workspace when needed
- Take advantage of FormatSelector's preview placeholders for correct data formatting
- Use TreeFieldSelector's auto-expansion for better data visibility
- Leverage FieldRenderer's color coding for quick type identification
- Access advanced configurations through NodeEditSheet
- Use JsonImportDialog for quick JSON-only imports