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
    currentUser: any
  ): Promise<SavedMapping> {
    if (!currentUser) {
      throw new Error('User must be authenticated to save mappings');
    }

    // Get next version
    const { data: version, error: versionError } = await supabase
      .rpc('get_next_version', {
        p_user_id: currentUser.id,
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
        author: currentUser.email || currentUser.id,
        created_at: new Date().toISOString(),
        created_by: currentUser.email || currentUser.id
      }
    };

    // Deactivate previous versions
    const { error: deactivateError } = await supabase
      .from('mappings')
      .update({ is_active: false })
      .eq('user_id', currentUser.id)
      .eq('name', name);

    if (deactivateError) {
      throw new Error(`Failed to deactivate previous versions: ${deactivateError.message}`);
    }

    // Save new mapping
    const { data, error } = await supabase
      .from('mappings')
      .insert({
        user_id: currentUser.id,
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

  static async getMappings(currentUser: any): Promise<SavedMapping[]> {
    if (!currentUser) {
      throw new Error('User must be authenticated to fetch mappings');
    }

    const { data, error } = await supabase
      .from('mappings')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch mappings: ${error.message}`);
    }

    return (data || []).map(item => ({
      ...item,
      config: item.config as unknown as SavedMappingConfig
    }));
  }

  static async getActiveMapping(name: string, currentUser: any): Promise<SavedMapping | null> {
    if (!currentUser) {
      throw new Error('User must be authenticated to fetch mappings');
    }

    const { data, error } = await supabase
      .rpc('get_active_mapping', {
        p_user_id: currentUser.id,
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