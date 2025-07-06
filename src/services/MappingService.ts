import { supabase } from "@/integrations/supabase/client";
import { Node, Edge } from '@xyflow/react';

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
  ui_config: SavedMappingConfig;
  execution_config?: ExecutionMappingConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class MappingService {
  static async saveMapping(
    name: string,
    nodes: Node[],
    edges: Edge[],
    userId: string,
    category: string = 'General',
    description?: string,
    tags?: string[],
    executionConfig?: ExecutionMappingConfig
  ): Promise<SavedMapping> {
    if (!userId) {
      throw new Error('User authentication is required to save mappings');
    }

    // Get next version using user ID and category
    const { data: version, error: versionError } = await supabase
      .rpc('get_next_version', {
        p_user_id: userId,
        p_name: name,
        p_category: category
      });

    if (versionError) {
      throw new Error(`Failed to get next version: ${versionError.message}`);
    }

    // Create UI configuration
    const uiConfig: SavedMappingConfig = {
      name,
      version,
      category,
      description,
      tags,
      nodes,
      edges,
      metadata: {
        author: userId,
        created_at: new Date().toISOString(),
        created_by: userId
      }
    };

    // Deactivate all previous versions of this mapping
    await supabase
      .from('mappings')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('name', name)
      .eq('category', category);

    // Save new mapping with user ID
    const { data, error } = await supabase
      .from('mappings')
      .insert({
        user_id: userId,
        name,
        version,
        category,
        description,
        tags,
        config: uiConfig as any, // Keep for backward compatibility
        ui_config: uiConfig as any,
        execution_config: executionConfig as any,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save mapping: ${error.message}`);
    }

    return {
      ...data,
      ui_config: data.ui_config as unknown as SavedMappingConfig,
      execution_config: data.execution_config as unknown as ExecutionMappingConfig
    };
  }

  static async getMappings(userId: string): Promise<SavedMapping[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const { data, error } = await supabase
      .from('mappings')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch mappings: ${error.message}`);
    }

    return (data || []).map(item => ({
      ...item,
      ui_config: item.ui_config as unknown as SavedMappingConfig,
      execution_config: item.execution_config as unknown as ExecutionMappingConfig
    }));
  }

  static async getActiveMapping(name: string, userId: string, category?: string): Promise<SavedMapping | null> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const { data, error } = await supabase
      .rpc('get_active_mapping', {
        p_user_id: userId,
        p_name: name,
        p_category: category
      });

    if (error) {
      throw new Error(`Failed to fetch active mapping: ${error.message}`);
    }

    return data ? {
      ...data,
      ui_config: data.ui_config as unknown as SavedMappingConfig,
      execution_config: data.execution_config as unknown as ExecutionMappingConfig
    } : null;
  }

  static async toggleMappingStatus(id: string, userId: string, isActive: boolean): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to update mappings');
    }

    const { error } = await supabase
      .from('mappings')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update mapping status: ${error.message}`);
    }
  }

  static async activateVersion(id: string, userId: string, name: string, category: string): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to update mappings');
    }

    // First deactivate all versions of this mapping
    await supabase
      .from('mappings')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('name', name)
      .eq('category', category);

    // Then activate the specific version
    const { error } = await supabase
      .from('mappings')
      .update({ is_active: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to activate mapping version: ${error.message}`);
    }
  }

  static async deleteMapping(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to delete mappings');
    }

    const { error } = await supabase
      .from('mappings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete mapping: ${error.message}`);
    }
  }

  static async getMappingsByCategory(userId: string, category?: string): Promise<SavedMapping[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    let query = supabase
      .from('mappings')
      .select('*')
      .eq('user_id', userId);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch mappings: ${error.message}`);
    }

    return (data || []).map(item => ({
      ...item,
      ui_config: item.ui_config as unknown as SavedMappingConfig,
      execution_config: item.execution_config as unknown as ExecutionMappingConfig
    }));
  }

  static async getLatestMappings(userId: string): Promise<SavedMapping[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const { data, error } = await supabase
      .from('mappings')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch mappings: ${error.message}`);
    }

    // Group by name+category and get only the latest version of each
    const latestMappings = new Map<string, any>();
    
    (data || []).forEach(item => {
      const key = `${item.name}-${item.category}`;
      if (!latestMappings.has(key)) {
        latestMappings.set(key, item);
      }
    });

    return Array.from(latestMappings.values()).map(item => ({
      ...item,
      ui_config: item.ui_config as unknown as SavedMappingConfig,
      execution_config: item.execution_config as unknown as ExecutionMappingConfig
    }));
  }

  static async getMappingVersions(userId: string, name: string, category: string): Promise<SavedMapping[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const { data, error } = await supabase
      .from('mappings')
      .select('*')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('category', category)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch mapping versions: ${error.message}`);
    }

    return (data || []).map(item => ({
      ...item,
      ui_config: item.ui_config as unknown as SavedMappingConfig,
      execution_config: item.execution_config as unknown as ExecutionMappingConfig
    }));
  }
}