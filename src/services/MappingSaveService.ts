import { Node, Edge } from '@xyflow/react';
import { MappingService } from './MappingService';
import { toast } from 'sonner';

export class MappingSaveService {
  static async saveMapping(
    name: string, 
    nodes: Node[], 
    edges: Edge[], 
    userId: string
  ): Promise<{ success: boolean; version?: string }> {
    console.log('🚨 SAVE SERVICE CALLED 🚨');
    console.log('Name:', name);
    console.log('User ID:', userId);
    console.log('Nodes count:', nodes.length);
    console.log('Edges count:', edges.length);
    
    if (!userId) {
      toast.error('Please log in to save mappings');
      return { success: false };
    }

    if (!name?.trim()) {
      toast.error('Mapping name is required');
      return { success: false };
    }

    try {
      // Get next version first
      const { supabase } = await import('../integrations/supabase/client');
      const { data: nextVersion, error: versionError } = await supabase
        .rpc('get_next_version', {
          p_user_id: userId,
          p_name: name.trim(),
          p_category: 'General'
        });

      if (versionError) {
        throw new Error(`Failed to get next version: ${versionError.message}`);
      }

      // Dynamic imports to avoid circular dependencies
      const [{ exportUIMappingConfiguration }, { exportExecutionMapping }] = await Promise.all([
        import('../Canvas/exporters/UIConfigExporter'),
        import('../Canvas/exporters/ExecutionConfigExporter')
      ]);
      
      const uiConfig = exportUIMappingConfiguration(nodes, edges, name.trim());
      const executionConfig = exportExecutionMapping(nodes, edges, name.trim());
      
      console.log('Generated configs:', { uiConfig, executionConfig });
      console.log('Using version:', nextVersion);
      
      // Convert executionConfig to match interface with correct version
      const formattedExecutionConfig = {
        name: name.trim(),
        version: nextVersion,
        category: 'General',
        mappings: executionConfig.mappings || [],
        arrays: executionConfig.arrays || [],
        metadata: executionConfig.metadata
      };
      
      // Save to database using MappingService with the version we got
      const savedMapping = await MappingService.saveMapping(
        name.trim(),
        nodes,
        edges,
        userId,
        'General', // default category
        undefined, // description
        undefined, // tags
        formattedExecutionConfig, // execution config
        nextVersion // pass the version we already retrieved
      );

      console.log('✅ Mapping saved successfully:', savedMapping);
      toast.success(`Mapping "${name}" saved as version ${savedMapping.version}`);
      
      return { 
        success: true, 
        version: savedMapping.version 
      };
    } catch (error) {
      console.error('❌ Failed to save mapping:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save mapping");
      return { success: false };
    }
  }
}