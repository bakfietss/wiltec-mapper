export interface DatabaseService {
  from(table: string): any;
  rpc(procedure: string, params: any): Promise<any>;
  getMappings(userId: string): Promise<SavedMapping[]>;
  saveMapping(mapping: {
    name: string;
    nodes: Node[];
    edges: Edge[];
    userId: string;
    category?: string;
    description?: string;
    tags?: string[];
    executionConfig?: ExecutionMappingConfig;
    providedVersion?: string;
    transformType?: string;
  }): Promise<SavedMapping>;
}