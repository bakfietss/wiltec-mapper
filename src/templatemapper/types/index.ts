export interface TemplateGeneratorConfig {
  variablePrefix?: string;
  variableSuffix?: string;
  defaultValue?: string;
}

export interface TemplateData {
  nodes: any[];
  edges: any[];
  sampleData: any;
}