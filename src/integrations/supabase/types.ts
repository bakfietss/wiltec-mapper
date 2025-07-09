export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          key: string
          last_used_at: string | null
          revoked: boolean | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          key: string
          last_used_at?: string | null
          revoked?: boolean | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          key?: string
          last_used_at?: string | null
          revoked?: boolean | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mapping_logs: {
        Row: {
          category: string | null
          end_time: string | null
          id: string
          input_payload: Json | null
          mapping_id: string | null
          output_payload: Json | null
          record_count: number | null
          run_at: string | null
          status: string | null
          transform_type: string | null
          version: string | null
        }
        Insert: {
          category?: string | null
          end_time?: string | null
          id?: string
          input_payload?: Json | null
          mapping_id?: string | null
          output_payload?: Json | null
          record_count?: number | null
          run_at?: string | null
          status?: string | null
          transform_type?: string | null
          version?: string | null
        }
        Update: {
          category?: string | null
          end_time?: string | null
          id?: string
          input_payload?: Json | null
          mapping_id?: string | null
          output_payload?: Json | null
          record_count?: number | null
          run_at?: string | null
          status?: string | null
          transform_type?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mapping_logs_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      mappings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          execution_config: Json | null
          id: string
          is_active: boolean | null
          mapping_group_id: string
          name: string
          tags: string[] | null
          transform_type: string | null
          ui_config: Json | null
          updated_at: string | null
          user_id: string | null
          version: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          execution_config?: Json | null
          id?: string
          is_active?: boolean | null
          mapping_group_id?: string
          name: string
          tags?: string[] | null
          transform_type?: string | null
          ui_config?: Json | null
          updated_at?: string | null
          user_id?: string | null
          version: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          execution_config?: Json | null
          id?: string
          is_active?: boolean | null
          mapping_group_id?: string
          name?: string
          tags?: string[] | null
          transform_type?: string | null
          ui_config?: Json | null
          updated_at?: string | null
          user_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_mappings_transform_type"
            columns: ["transform_type"]
            isOneToOne: false
            referencedRelation: "transform_types"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "mappings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transform_types: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          input_format: string
          is_active: boolean
          name: string
          output_format: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          input_format: string
          is_active?: boolean
          name: string
          output_format: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          input_format?: string
          is_active?: boolean
          name?: string
          output_format?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_mapping: {
        Args:
          | { p_user_email: string; p_name: string }
          | { p_user_id: string; p_name: string }
          | { p_user_id: string; p_name: string; p_category?: string }
        Returns: {
          category: string | null
          created_at: string | null
          description: string | null
          execution_config: Json | null
          id: string
          is_active: boolean | null
          mapping_group_id: string
          name: string
          tags: string[] | null
          transform_type: string | null
          ui_config: Json | null
          updated_at: string | null
          user_id: string | null
          version: string
        }
      }
      get_next_version: {
        Args:
          | { p_user_email: string; p_name: string }
          | { p_user_id: string; p_name: string }
          | { p_user_id: string; p_name: string; p_category?: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
