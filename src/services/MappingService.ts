import { supabase } from "@/integrations/supabase/client";
import { Node, Edge } from '@xyflow/react';

export interface SavedMappingConfig {
  name: string;
  version: string;
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    description?: string;
    tags?: string[];
    author?: string;
    created_at?: string;
    created_by?: string;
  };
}

export interface SavedMapping {
  id: string;
  name: string;
  version: string;
  config: SavedMappingConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class MappingService {
  static async saveMapping(
    name: string,
    nodes: Node[],
    edges: Edge[],
    userId: string
  ): Promise<SavedMapping> {
    if (!userId) {
      throw new Error('User authentication is required to save mappings');
    }

    // Get next version using user ID
    const { data: version, error: versionError } = await supabase
      .rpc('get_next_version', {
        p_user_id: userId,
        p_name: name
      });

    if (versionError) {
      throw new Error(`Failed to get next version: ${versionError.message}`);
    }

    // Create mapping configuration
    const config: SavedMappingConfig = {
      name,
      version,
      nodes,
      edges,
      metadata: {
        description: `Mapping version ${version}`,
        author: userId,
        created_at: new Date().toISOString(),
        created_by: userId
      }
    };

    // Deactivate previous versions for this user
    const { error: deactivateError } = await supabase
      .from('mappings')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('name', name);

    if (deactivateError) {
      throw new Error(`Failed to deactivate previous versions: ${deactivateError.message}`);
    }

    // Save new mapping with user ID
    const { data, error } = await supabase
      .from('mappings')
      .insert({
        user_id: userId,
        name,
        version,
        config: config as any,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save mapping: ${error.message}`);
    }

    return {
      ...data,
      config: data.config as unknown as SavedMappingConfig
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
      config: item.config as unknown as SavedMappingConfig
    }));
  }

  static async getActiveMapping(name: string, userId: string): Promise<SavedMapping | null> {
    if (!userId) {
      throw new Error('User authentication is required to fetch mappings');
    }

    const { data, error } = await supabase
      .rpc('get_active_mapping', {
        p_user_id: userId,
        p_name: name
      });

    if (error) {
      throw new Error(`Failed to fetch active mapping: ${error.message}`);
    }

    return data ? {
      ...data,
      config: data.config as unknown as SavedMappingConfig
    } : null;
  }
}