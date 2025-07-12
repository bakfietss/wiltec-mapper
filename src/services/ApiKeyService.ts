import { supabase } from "@/integrations/supabase/client";

export interface ApiKey {
  id: string;
  key: string;
  user_id: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  revoked: boolean;
  description?: string;
  status: string;
}

export class ApiKeyService {
  static async createApiKey(
    userId: string, 
    description?: string, 
    expiresAt?: string
  ): Promise<ApiKey> {
    if (!userId) {
      throw new Error('User authentication is required to create API keys');
    }

    // Generate a secure API key
    const apiKey = this.generateApiKey();

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        key: apiKey,
        description,
        expires_at: expiresAt,
        status: 'active',
        revoked: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return data;
  }

  static async createApiKeyWithValue(
    userId: string, 
    apiKey: string,
    description?: string, 
    expiresAt?: string
  ): Promise<ApiKey> {
    if (!userId) {
      throw new Error('User authentication is required to create API keys');
    }

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        key: apiKey,
        description,
        expires_at: expiresAt,
        status: 'active',
        revoked: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return data;
  }

  static async getApiKeys(userId: string): Promise<ApiKey[]> {
    if (!userId) {
      throw new Error('User authentication is required to fetch API keys');
    }

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch API keys: ${error.message}`);
    }

    return data || [];
  }

  static async revokeApiKey(keyId: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to revoke API keys');
    }

    const { error } = await supabase
      .from('api_keys')
      .update({ 
        revoked: true, 
        status: 'revoked' 
      })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }
  }

  static async deleteApiKey(keyId: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User authentication is required to delete API keys');
    }

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }

  static async updateApiKey(
    keyId: string, 
    userId: string, 
    description?: string
  ): Promise<ApiKey> {
    if (!userId) {
      throw new Error('User authentication is required to update API keys');
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update({ description })
      .eq('id', keyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    return data;
  }

  static async updateApiKeyWithValue(
    keyId: string, 
    userId: string, 
    apiKey: string,
    description?: string
  ): Promise<ApiKey> {
    if (!userId) {
      throw new Error('User authentication is required to update API keys');
    }

    const { data, error } = await supabase
      .from('api_keys')
      .update({ 
        key: apiKey,
        description 
      })
      .eq('id', keyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    return data;
  }

  static generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'mk_'; // prefix for mapping key
    for (let i = 0; i < 40; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static maskApiKey(key: string): string {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  }

  static isExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  static async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    userId?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key', apiKey)
        .eq('status', 'active')
        .eq('revoked', false)
        .single();

      if (error) {
        return { valid: false, error: 'API key not found' };
      }

      // Check if expired
      if (this.isExpired(data.expires_at)) {
        return { valid: false, error: 'API key expired' };
      }

      // Update last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      return { 
        valid: true, 
        userId: data.user_id 
      };
    } catch (error) {
      return { valid: false, error: 'Validation failed' };
    }
  }
}