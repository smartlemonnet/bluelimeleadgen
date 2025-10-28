export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          organization: string | null
          phone: string | null
          search_id: string
          social_links: Json | null
          website: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          organization?: string | null
          phone?: string | null
          search_id: string
          social_links?: Json | null
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          organization?: string | null
          phone?: string | null
          search_id?: string
          social_links?: Json | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      query_templates: {
        Row: {
          created_at: string
          default_pages: number
          description: string | null
          id: string
          name: string
          query_pattern: string
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          default_pages?: number
          description?: string | null
          id?: string
          name: string
          query_pattern: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          default_pages?: number
          description?: string | null
          id?: string
          name?: string
          query_pattern?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      search_batches: {
        Row: {
          completed_at: string | null
          completed_jobs: number
          created_at: string
          delay_seconds: number
          description: string | null
          failed_jobs: number
          id: string
          name: string
          started_at: string | null
          status: string
          total_jobs: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_jobs?: number
          created_at?: string
          delay_seconds?: number
          description?: string | null
          failed_jobs?: number
          id?: string
          name: string
          started_at?: string | null
          status?: string
          total_jobs?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_jobs?: number
          created_at?: string
          delay_seconds?: number
          description?: string | null
          failed_jobs?: number
          id?: string
          name?: string
          started_at?: string | null
          status?: string
          total_jobs?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_jobs: {
        Row: {
          batch_id: string
          created_at: string
          error_message: string | null
          executed_at: string | null
          id: string
          location: string | null
          pages: number
          query: string
          result_count: number | null
          search_id: string | null
          status: string
          target_names: string[] | null
          user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          location?: string | null
          pages?: number
          query: string
          result_count?: number | null
          search_id?: string | null
          status?: string
          target_names?: string[] | null
          user_id: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          location?: string | null
          pages?: number
          query?: string
          result_count?: number | null
          search_id?: string | null
          status?: string
          target_names?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_jobs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "search_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_jobs_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          created_at: string
          id: string
          location: string | null
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_lists: {
        Row: {
          created_at: string
          deliverable_count: number
          id: string
          name: string
          processed_emails: number
          risky_count: number
          status: string
          total_emails: number
          undeliverable_count: number
          unknown_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deliverable_count?: number
          id?: string
          name: string
          processed_emails?: number
          risky_count?: number
          status?: string
          total_emails?: number
          undeliverable_count?: number
          unknown_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deliverable_count?: number
          id?: string
          name?: string
          processed_emails?: number
          risky_count?: number
          status?: string
          total_emails?: number
          undeliverable_count?: number
          unknown_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_queue: {
        Row: {
          created_at: string
          email: string
          error_message: string | null
          id: string
          processed_at: string | null
          status: string
          validation_list_id: string
        }
        Insert: {
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          validation_list_id: string
        }
        Update: {
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          validation_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_queue_validation_list_id_fkey"
            columns: ["validation_list_id"]
            isOneToOne: false
            referencedRelation: "validation_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_results: {
        Row: {
          catch_all: boolean | null
          created_at: string
          deliverable: boolean | null
          disposable: boolean | null
          domain_valid: boolean | null
          email: string
          format_valid: boolean | null
          free_email: boolean | null
          full_response: Json | null
          id: string
          reason: string | null
          result: string | null
          smtp_valid: boolean | null
          validation_list_id: string
        }
        Insert: {
          catch_all?: boolean | null
          created_at?: string
          deliverable?: boolean | null
          disposable?: boolean | null
          domain_valid?: boolean | null
          email: string
          format_valid?: boolean | null
          free_email?: boolean | null
          full_response?: Json | null
          id?: string
          reason?: string | null
          result?: string | null
          smtp_valid?: boolean | null
          validation_list_id: string
        }
        Update: {
          catch_all?: boolean | null
          created_at?: string
          deliverable?: boolean | null
          disposable?: boolean | null
          domain_valid?: boolean | null
          email?: string
          format_valid?: boolean | null
          free_email?: boolean | null
          full_response?: Json | null
          id?: string
          reason?: string | null
          result?: string | null
          smtp_valid?: boolean | null
          validation_list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_results_validation_list_id_fkey"
            columns: ["validation_list_id"]
            isOneToOne: false
            referencedRelation: "validation_lists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_validation_counter: {
        Args: { counter_name: string; list_id: string }
        Returns: undefined
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
