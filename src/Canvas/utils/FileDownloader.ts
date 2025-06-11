
import { Node, Edge } from '@xyflow/react';
import { exportUIMappingConfiguration } from '../exporters/UIConfigExporter';
import { exportExecutionMapping } from '../exporters/ExecutionConfigExporter';

export const downloadBothMappingFiles = (
  nodes: Node[],
  edges: Edge[],
  name: string = 'Untitled Mapping'
) => {
  const uiConfig = exportUIMappingConfiguration(nodes, edges, name);
  const executionConfig = exportExecutionMapping(nodes, edges, name);
  
  // Download UI config file
  const uiBlob = new Blob([JSON.stringify(uiConfig, null, 2)], { type: 'application/json' });
  const uiUrl = URL.createObjectURL(uiBlob);
  const uiLink = document.createElement('a');
  uiLink.href = uiUrl;
  uiLink.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ui_config.json`;
  document.body.appendChild(uiLink);
  uiLink.click();
  document.body.removeChild(uiLink);
  URL.revokeObjectURL(uiUrl);
  
  // Download execution config file
  const execBlob = new Blob([JSON.stringify(executionConfig, null, 2)], { type: 'application/json' });
  const execUrl = URL.createObjectURL(execBlob);
  const execLink = document.createElement('a');
  execLink.href = execUrl;
  execLink.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_execution_config.json`;
  document.body.appendChild(execLink);
  execLink.click();
  document.body.removeChild(execLink);
  URL.revokeObjectURL(execUrl);
};
