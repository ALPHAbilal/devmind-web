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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_sessions: {
        Row: {
          attachments: Json
          concept_id: string | null
          created_at: string
          id: string
          purpose: string
          spec: Json | null
          status: string
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          concept_id?: string | null
          created_at?: string
          id?: string
          purpose: string
          spec?: Json | null
          status?: string
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          concept_id?: string | null
          created_at?: string
          id?: string
          purpose?: string
          spec?: Json | null
          status?: string
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_session_turns: {
        Row: {
          created_at: string
          full_text: string
          id: string
          role: string
          seq: number
          session_id: string
          summary_line: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_text: string
          id?: string
          role: string
          seq: number
          session_id: string
          summary_line: string
          user_id?: string
        }
        Update: {
          created_at?: string
          full_text?: string
          id?: string
          role?: string
          seq?: number
          session_id?: string
          summary_line?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_session_turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "branch_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_sessions: {
        Row: {
          child_notebook_id: string | null
          created_at: string
          first_quote: string | null
          id: string
          note: string | null
          parent_notebook_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          child_notebook_id?: string | null
          created_at?: string
          first_quote?: string | null
          id?: string
          note?: string | null
          parent_notebook_id: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          child_notebook_id?: string | null
          created_at?: string
          first_quote?: string | null
          id?: string
          note?: string | null
          parent_notebook_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_sessions_child_notebook_id_fkey"
            columns: ["child_notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_sessions_parent_notebook_id_fkey"
            columns: ["parent_notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      cells: {
        Row: {
          attached_file: string | null
          attached_to: string | null
          content: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["cell_kind"]
          language: string | null
          meta: Json | null
          notebook_id: string
          ord: number
          source: Database["public"]["Enums"]["cell_source"]
          updated_at: string
        }
        Insert: {
          attached_file?: string | null
          attached_to?: string | null
          content: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["cell_kind"]
          language?: string | null
          meta?: Json | null
          notebook_id: string
          ord: number
          source: Database["public"]["Enums"]["cell_source"]
          updated_at?: string
        }
        Update: {
          attached_file?: string | null
          attached_to?: string | null
          content?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["cell_kind"]
          language?: string | null
          meta?: Json | null
          notebook_id?: string
          ord?: number
          source?: Database["public"]["Enums"]["cell_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_cells_attached_to_fkey"
            columns: ["attached_to"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_cells_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          created_at: string
          generation: Database["public"]["Enums"]["concept_generation"]
          generation_progress: Json | null
          id: string
          name: string
          notebook_id: string | null
          review_due_at: string | null
          review_focus: string | null
          review_notebook_id: string | null
          spec: Json | null
          review_interval_days: number | null
          state: Database["public"]["Enums"]["concept_status"]
          technology: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generation?: Database["public"]["Enums"]["concept_generation"]
          generation_progress?: Json | null
          id?: string
          name: string
          notebook_id?: string | null
          review_due_at?: string | null
          review_focus?: string | null
          review_notebook_id?: string | null
          spec?: Json | null
          review_interval_days?: number | null
          state?: Database["public"]["Enums"]["concept_status"]
          technology: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generation?: Database["public"]["Enums"]["concept_generation"]
          generation_progress?: Json | null
          id?: string
          name?: string
          notebook_id?: string | null
          review_due_at?: string | null
          review_focus?: string | null
          review_notebook_id?: string | null
          spec?: Json | null
          review_interval_days?: number | null
          state?: Database["public"]["Enums"]["concept_status"]
          technology?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_last_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_technology_fkey"
            columns: ["technology"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["key"]
          },
        ]
      }
      highlights: {
        Row: {
          cell_id: string
          child_notebook_id: string | null
          created_at: string
          id: string
          parent_notebook_id: string
          pick_order: number | null
          selected_text: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          cell_id: string
          child_notebook_id?: string | null
          created_at?: string
          id?: string
          parent_notebook_id: string
          pick_order?: number | null
          selected_text: string
          session_id?: string | null
          user_id?: string
        }
        Update: {
          cell_id?: string
          child_notebook_id?: string | null
          created_at?: string
          id?: string
          parent_notebook_id?: string
          pick_order?: number | null
          selected_text?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_highlights_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_highlights_child_notebook_id_fkey"
            columns: ["child_notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_highlights_parent_notebook_id_fkey"
            columns: ["parent_notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_highlights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "branch_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          known_languages: string[]
          learning_style_notes: string | null
          notebooks_completed: number
          preferred_pace: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          known_languages?: string[]
          learning_style_notes?: string | null
          notebooks_completed?: number
          preferred_pace?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          known_languages?: string[]
          learning_style_notes?: string | null
          notebooks_completed?: number
          preferred_pace?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notebooks: {
        Row: {
          completed_at: string | null
          concept_id: string | null
          created_at: string
          current_checkpoint_id: string | null
          goal: Database["public"]["Enums"]["notebook_goal"]
          id: string
          kind: Database["public"]["Enums"]["notebook_kind"]
          level: Database["public"]["Enums"]["notebook_level"]
          parent_notebook_id: string | null
          path_card: string
          spec_json: Json
          started_at: string | null
          status: Database["public"]["Enums"]["notebook_status"]
          technology: string
          time_budget_minutes: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          concept_id?: string | null
          created_at?: string
          current_checkpoint_id?: string | null
          goal: Database["public"]["Enums"]["notebook_goal"]
          id?: string
          kind?: Database["public"]["Enums"]["notebook_kind"]
          level: Database["public"]["Enums"]["notebook_level"]
          parent_notebook_id?: string | null
          path_card: string
          spec_json: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["notebook_status"]
          technology: string
          time_budget_minutes: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          concept_id?: string | null
          created_at?: string
          current_checkpoint_id?: string | null
          goal?: Database["public"]["Enums"]["notebook_goal"]
          id?: string
          kind?: Database["public"]["Enums"]["notebook_kind"]
          level?: Database["public"]["Enums"]["notebook_level"]
          parent_notebook_id?: string | null
          path_card?: string
          spec_json?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["notebook_status"]
          technology?: string
          time_budget_minutes?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_parent_notebook_id_fkey"
            columns: ["parent_notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      technologies: {
        Row: {
          key: string
          label: string
          mn: string | null
          ord: number
        }
        Insert: {
          key: string
          label: string
          mn?: string | null
          ord?: number
        }
        Update: {
          key?: string
          label?: string
          mn?: string | null
          ord?: number
        }
        Relationships: []
      }
      thread_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          notebook_id: string
          ord: number
          role: Database["public"]["Enums"]["message_role"]
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          notebook_id: string
          ord: number
          role: Database["public"]["Enums"]["message_role"]
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          notebook_id?: string
          ord?: number
          role?: Database["public"]["Enums"]["message_role"]
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          anchor: Json
          created_at: string
          file_path: string | null
          id: string
          notebook_id: string
          status: Database["public"]["Enums"]["thread_status"]
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor: Json
          created_at?: string
          file_path?: string | null
          id?: string
          notebook_id: string
          status?: Database["public"]["Enums"]["thread_status"]
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor?: Json
          created_at?: string
          file_path?: string | null
          id?: string
          notebook_id?: string
          status?: Database["public"]["Enums"]["thread_status"]
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cell_kind:
        | "markdown"
        | "code"
        | "output"
        | "section"
        | "divider"
        | "challenge"
        | "interactive"
        | "diagram"
      cell_source: "agent" | "learner" | "backend"
      concept_generation: "none" | "specing" | "ready" | "generating" | "failed"
      concept_status: "queued" | "learning" | "completed" | "review"
      notebook_kind: "lesson" | "review"
      message_role: "user" | "assistant"
      notebook_goal: "build" | "understand" | "interview" | "work"
      notebook_level: "beginner" | "intermediate" | "advanced"
      notebook_status:
        | "draft"
        | "in_progress"
        | "completed"
        | "abandoned"
        | "generating"
        | "failed"
      thread_status: "open" | "closed"
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
    Enums: {
      cell_kind: [
        "markdown",
        "code",
        "output",
        "section",
        "divider",
        "challenge",
        "interactive",
        "diagram",
      ],
      cell_source: ["agent", "learner", "backend"],
      concept_generation: ["none", "specing", "ready", "generating", "failed"],
      concept_status: ["queued", "learning", "completed", "review"],
      notebook_kind: ["lesson", "review"],
      message_role: ["user", "assistant"],
      notebook_goal: ["build", "understand", "interview", "work"],
      notebook_level: ["beginner", "intermediate", "advanced"],
      notebook_status: [
        "draft",
        "in_progress",
        "completed",
        "abandoned",
        "generating",
        "failed",
      ],
      thread_status: ["open", "closed"],
    },
  },
} as const
