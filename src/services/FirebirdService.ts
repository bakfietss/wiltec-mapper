import { DatabaseService } from './DatabaseService';
import { Node, Edge } from '@xyflow/react';
import { SavedMapping, ExecutionMappingConfig } from './MappingService';

export class FirebirdService implements DatabaseService {
  private apiUrl = 'http://localhost:3000/api';

  from(table: string) {
    console.log('FirebirdService.from called with table:', table);
    if (!table) {
      console.error('Table name is required');
      throw new Error('Table name is required');
    }

    return {
      select: async (columns: string = '*') => {
        console.log('FirebirdService.select called with columns:', columns);
        try {
          const response = await fetch(`${this.apiUrl}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              operation: 'select',
              columns
            })
          });
          return await response.json();
        } catch (error) {
          console.error('Error in Firebird query:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Database query failed' };
        }
      },

      insert: async (data: any) => {
        try {
          const response = await fetch(`${this.apiUrl}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              operation: 'insert',
              data
            })
          });
          return await response.json();
        } catch (error) {
          console.error('Error in Firebird insert:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Database insert failed' };
        }
      },

      update: async (data: any, where: any) => {
        try {
          const response = await fetch(`${this.apiUrl}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              operation: 'update',
              data,
              where
            })
          });
          return await response.json();
        } catch (error) {
          console.error('Error in Firebird update:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Database update failed' };
        }
      },

      delete: async (where: any) => {
        try {
          const response = await fetch(`${this.apiUrl}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              operation: 'delete',
              where
            })
          });
          return await response.json();
        } catch (error) {
          console.error('Error in Firebird delete:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Database delete failed' };
        }
      },

      eq: async (column: string, value: any) => {
        try {
          const response = await fetch(`${this.apiUrl}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              operation: 'select',
              where: { [column]: value }
            })
          });
          return await response.json();
        } catch (error) {
          console.error('Error in Firebird eq:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Database query failed' };
        }
      },

      order: async (column: string, { ascending = true } = {}) => {
        try {
          const response = await fetch(`${this.apiUrl}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              operation: 'select',
              orderBy: { column, ascending }
            })
          });
          return await response.json();
        } catch (error) {
          console.error('Error in Firebird order:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Database query failed' };
        }
      },

      single: async () => {
        try {
          const response = await fetch(`${this.apiUrl}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table,
              operation: 'select',
              limit: 1
            })
          });
          const result = await response.json();
          return {
            data: result.data?.[0] || null,
            error: result.error
          };
        } catch (error) {
          console.error('Error in Firebird single:', error);
          return { data: null, error: error instanceof Error ? error.message : 'Database query failed' };
        }
      }
    };
  }

  async rpc(procedure: string, params: any): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedure, params })
      });
      return await response.json();
    } catch (error) {
      console.error('Error in Firebird RPC:', error);
      return { data: null, error: error instanceof Error ? error.message : 'RPC call failed' };
    }
  }

  async getMappings(userId: string): Promise<SavedMapping[]> {
    try {
      const response = await fetch(`${this.apiUrl}/mappings?userId=${userId}`);
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error getting mappings:', error);
      return [];
    }
  }

  async saveMapping(mapping: {
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
  }): Promise<SavedMapping> {
    try {
      const response = await fetch(`${this.apiUrl}/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapping)
      });
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error saving mapping:', error);
      throw error;
    }
  }
}