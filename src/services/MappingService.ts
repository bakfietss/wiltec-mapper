import { supabase } from '@/integrations/supabase/client';
import { Node, Edge } from '@xyflow/react';
import { FirebirdService } from './FirebirdService';
import { DatabaseService } from './DatabaseService';

export interface SavedMappingConfig {
  name: string;
  version: string;
  category: string;
  description?: string;
  tags?: string[];
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    author?: string;
    created_at?: string;
    created_by?: string;
  };
}

export interface ExecutionMappingConfig {
  name: string;
  version: string;
  category: string;
  mappings: any[];
  arrays?: any[];
  metadata?: {
    description?: string;
    author?: string;
  };
}

export interface SavedMapping {
  id: string;
  name: string;
  version: string;
  category: string;
  description?: string;
  tags?: string[];
  transform_type?: string;
  ui_config: SavedMappingConfig;
  execution_config?: ExecutionMappingConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class MappingService {
  private static getService(database: 'supabase' | 'firebird'): DatabaseService {
    if (!database) {
      throw new Error('Database type must be specified');
    }
    return database === 'supabase' ? supabase : FirebirdService;
  }

  static async saveMapping(
    name: string,
    nodes: Node[],
    edges: Edge[],
    userId: string,
    category: string = 'General',
    description?: string,
    tags?: string[],
    executionConfig?: ExecutionMappingConfig,
    providedVersion?: string,
    transformType: string = 'JsonToJson',
    database: 'supabase' | 'firebird' = 'supabase'
  ): Promise<SavedMapping> {
    if (!userId) {
      throw new Error('User authentication is required to save mappings');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Mapping name is required');
    }

    const service = this.getService(database);
    const mappingData = {
      name: name.trim(),
      nodes,
      edges,
      userId,
      category: category.trim(),
      description,
      tags,
      executionConfig,
      providedVersion,
      transformType: transformType.trim()
    };

    return await service.saveMapping(mappingData);
  }

  static async getMappings(userId: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<SavedMapping[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const service = this.getService(database);
    return await service.getMappings(userId);
  }

  static async getActiveMapping(name: string, userId: string, category?: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<SavedMapping | null> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const service = this.getService(database);
    const result = await service.rpc('get_active_mapping', {
      p_user_id: userId,
      p_name: name,
      p_category: category
    });

    return result.data || null;
  }

  static async toggleMappingStatus(id: string, userId: string, isActive: boolean, database: 'supabase' | 'firebird' = 'supabase'): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to update mappings');
    }

    const service = this.getService(database);
    await service.from('mappings')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('user_id', userId);
  }

  static async activateVersion(id: string, userId: string, name: string, category: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to update mappings');
    }

    const service = this.getService(database);
    
    // First deactivate all versions of this mapping
    let deactivateQuery = service.from('mappings')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('name', name);
    
    if (category) {
      deactivateQuery = deactivateQuery.eq('category', category);
    } else {
      deactivateQuery = deactivateQuery.is('category', null);
    }
    
    await deactivateQuery;

    // Then activate the specific version
    await service.from('mappings')
      .update({ is_active: true })
      .eq('id', id)
      .eq('user_id', userId);
  }

  static async deleteMapping(id: string, userId: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to delete mappings');
    }

    const service = this.getService(database);
    await service.from('mappings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
  }

  static async getMappingsByCategory(userId: string, category?: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<SavedMapping[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const service = this.getService(database);
    let query = service.from('mappings')
      .select('*')
      .eq('user_id', userId);

    if (category) {
      query = query.eq('category', category);
    }

    const result = await query.order('updated_at', { ascending: false });

    return (result.data || []).map(item => ({
      ...item,
      ui_config: item.ui_config as unknown as SavedMappingConfig,
      execution_config: item.execution_config as unknown as ExecutionMappingConfig
    }));
  }

  static async getLatestMappings(userId: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<SavedMapping[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const service = this.getService(database);
    const result = await service.from('mappings')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
      .order('version', { ascending: false });

    if (!result.data) {
      return [];
    }

    // Group by mapping_group_id and get the active version or latest if no active
    const groupMap = new Map<string, any>();
    
    result.data.forEach(item => {
      const groupId = item.mapping_group_id;
      const existing = groupMap.get(groupId);
      
      if (!existing) {
        groupMap.set(groupId, item);
      } else {
        // If current item is active, prioritize it
        if (item.is_active && !existing.is_active) {
          groupMap.set(groupId, item);
        }
        // If both have same active status, keep the latest version (already sorted)
      }
    });

    return Array.from(groupMap.values()).map(item => ({
      ...item,
      ui_config: item.ui_config as unknown as SavedMappingConfig,
      execution_config: item.execution_config as unknown as ExecutionMappingConfig
    }));
  }

  static async getMappingVersions(userId: string, name: string, category: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<SavedMapping[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const service = this.getService(database);
    const result = await service.from('mappings')
      .select('*')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('category', category)
      .order('version', { ascending: false });

    return (result.data || []).map(item => ({
      ...item,
      ui_config: item.ui_config as unknown as SavedMappingConfig,
      execution_config: item.execution_config as unknown as ExecutionMappingConfig
    }));
  }

  static async updateMapping(id: string, userId: string, name: string, category: string, transformType?: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to update mappings');
    }

    const service = this.getService(database);
    
    // Get the original mapping
    const existingMapping = await service.from('mappings')
      .select('mapping_group_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existingMapping.data) {
      throw new Error('Mapping not found');
    }

    // Check for name conflicts with other mapping groups
    const nameConflict = await service.from('mappings')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name.trim())
      .neq('mapping_group_id', existingMapping.data.mapping_group_id)
      .limit(1);

    if (nameConflict.data && nameConflict.data.length > 0) {
      throw new Error(`A mapping with the name "${name.trim()}" already exists. Please choose a different name.`);
    }

    // Get all mappings in the group
    const allMappings = await service.from('mappings')
      .select('*')
      .eq('mapping_group_id', existingMapping.data.mapping_group_id)
      .eq('user_id', userId);

    if (!allMappings.data) {
      throw new Error('Failed to fetch mapping group');
    }

    // Update each mapping in the group
    for (const mapping of allMappings.data) {
      const updateData: any = { 
        name: name.trim(),
        category: category.trim()
      };
      
      if (transformType) {
        updateData.transform_type = transformType.trim();
      }

      // Update ui_config with new name
      if (mapping.ui_config) {
        const uiConfig = mapping.ui_config as any;
        const updatedUiConfig = {
          ...uiConfig,
          name: name.trim()
        };
        updateData.ui_config = updatedUiConfig;
      }

      // Update execution_config with new name
      if (mapping.execution_config) {
        const executionConfig = mapping.execution_config as any;
        const updatedExecutionConfig = {
          ...executionConfig,
          name: name.trim()
        };
        updateData.execution_config = updatedExecutionConfig;
      }

      // Update this specific mapping
      await service.from('mappings')
        .update(updateData)
        .eq('id', mapping.id)
        .eq('user_id', userId);
    }
  }

  static async copyMapping(mappingId: string, userId: string, newName: string, transformType?: string, database: 'supabase' | 'firebird' = 'supabase'): Promise<SavedMapping> {
    if (!userId) {
      throw new Error('User authentication is required to copy mappings');
    }

    const service = this.getService(database);

    // Check if the new name already exists
    const existingMapping = await service.from('mappings')
      .select('id')
      .eq('user_id', userId)
      .eq('name', newName.trim())
      .limit(1);

    if (existingMapping.data && existingMapping.data.length > 0) {
      throw new Error(`A mapping with the name "${newName.trim()}" already exists. Please choose a different name.`);
    }

    // Get the original mapping
    const originalMapping = await service.from('mappings')
      .select('*')
      .eq('id', mappingId)
      .eq('user_id', userId)
      .single();

    if (!originalMapping.data) {
      throw new Error('Original mapping not found');
    }

    // Generate new mapping group ID and version
    const newMappingGroupId = crypto.randomUUID();
    const newVersion = 'v1.01';

    // Create the copy with new group ID and metadata
    const originalUiConfig = originalMapping.data.ui_config as any;
    const originalExecutionConfig = originalMapping.data.execution_config as any;
    
    const copyConfig = {
      ...originalUiConfig,
      name: newName.trim(),
      version: newVersion,
      metadata: {
        ...(originalUiConfig?.metadata || {}),
        created_at: new Date().toISOString(),
        created_by: userId
      }
    };

    const copyExecutionConfig = originalExecutionConfig ? {
      ...originalExecutionConfig,
      name: newName.trim(),
      version: newVersion
    } : undefined;

    // Insert the copy
    const newMapping = await service.from('mappings')
      .insert({
        user_id: userId,
        name: newName.trim(),
        version: newVersion,
        category: originalMapping.data.category,
        description: originalMapping.data.description,
        tags: originalMapping.data.tags,
        transform_type: transformType || originalMapping.data.transform_type || 'JsonToJson',
        mapping_group_id: newMappingGroupId,
        ui_config: copyConfig,
        execution_config: copyExecutionConfig,
        is_active: true
      })
      .select()
      .single();

    if (!newMapping.data) {
      throw new Error('Failed to copy mapping');
    }

    return {
      ...newMapping.data,
      ui_config: newMapping.data.ui_config as unknown as SavedMappingConfig,
      execution_config: newMapping.data.execution_config as unknown as ExecutionMappingConfig
    };
  }
}