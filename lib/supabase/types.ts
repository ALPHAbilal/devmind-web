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
          child_mission_id: string | null
          created_at: string
          id: string
          note: string | null
          parent_mission_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          child_mission_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          parent_mission_id: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          child_mission_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          parent_mission_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_sessions_child_mission_id_fkey"
            columns: ["child_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_sessions_parent_mission_id_fkey"
            columns: ["parent_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_nodes: {
        Row: {
          created_at: string
          id: string
          meta: Json
          mission_id: string
          node_type: string
          ref_id: string | null
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          id?: string
          meta?: Json
          mission_id: string
          node_type: string
          ref_id?: string | null
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          id?: string
          meta?: Json
          mission_id?: string
          node_type?: string
          ref_id?: string | null
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "canvas_nodes_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_edges: {
        Row: {
          concept_id: string
          created_at: string
          needs_concept_id: string
          user_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          needs_concept_id: string
          user_id: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          needs_concept_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_edges_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concept_edges_needs_concept_id_fkey"
            columns: ["needs_concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      concept_progress: {
        Row: {
          concept_id: string
          id: string
          mastered_at: string
          mission_id: string | null
          user_id: string
        }
        Insert: {
          concept_id: string
          id?: string
          mastered_at?: string
          mission_id?: string | null
          user_id: string
        }
        Update: {
          concept_id?: string
          id?: string
          mastered_at?: string
          mission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concept_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          built_from: string | null
          concept_key: string
          created_at: string
          evidence: string | null
          id: string
          last_mission_id: string | null
          name: string
          review_due_at: string | null
          review_interval_days: number | null
          state: Database["public"]["Enums"]["concept_state"]
          technology: string
          updated_at: string
          user_id: string
          verified_by: Database["public"]["Enums"]["concept_verifier"] | null
        }
        Insert: {
          built_from?: string | null
          concept_key: string
          created_at?: string
          evidence?: string | null
          id?: string
          last_mission_id?: string | null
          name: string
          review_due_at?: string | null
          review_interval_days?: number | null
          state?: Database["public"]["Enums"]["concept_state"]
          technology: string
          updated_at?: string
          user_id: string
          verified_by?: Database["public"]["Enums"]["concept_verifier"] | null
        }
        Update: {
          built_from?: string | null
          concept_key?: string
          created_at?: string
          evidence?: string | null
          id?: string
          last_mission_id?: string | null
          name?: string
          review_due_at?: string | null
          review_interval_days?: number | null
          state?: Database["public"]["Enums"]["concept_state"]
          technology?: string
          updated_at?: string
          user_id?: string
          verified_by?: Database["public"]["Enums"]["concept_verifier"] | null
        }
        Relationships: [
          {
            foreignKeyName: "concepts_last_mission_id_fkey"
            columns: ["last_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
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
      learner_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          known_languages: string[]
          learning_style_notes: string | null
          missions_completed: number
          preferred_pace: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          known_languages?: string[]
          learning_style_notes?: string | null
          missions_completed?: number
          preferred_pace?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          known_languages?: string[]
          learning_style_notes?: string | null
          missions_completed?: number
          preferred_pace?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_sessions: {
        Row: {
          archive_key: string | null
          archived_at: string | null
          completed_at: string | null
          container_id: string | null
          id: string
          last_active_at: string
          memory_json: Json
          mission_id: string
          notebook_md: string
          paused_at: string | null
          sdk_session_id: string | null
          started_at: string
          state_json: Json
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archive_key?: string | null
          archived_at?: string | null
          completed_at?: string | null
          container_id?: string | null
          id?: string
          last_active_at?: string
          memory_json?: Json
          mission_id: string
          notebook_md?: string
          paused_at?: string | null
          sdk_session_id?: string | null
          started_at?: string
          state_json?: Json
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archive_key?: string | null
          archived_at?: string | null
          completed_at?: string | null
          container_id?: string | null
          id?: string
          last_active_at?: string
          memory_json?: Json
          mission_id?: string
          notebook_md?: string
          paused_at?: string | null
          sdk_session_id?: string | null
          started_at?: string
          state_json?: Json
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_sessions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: true
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_highlights: {
        Row: {
          cell_id: string
          child_mission_id: string | null
          created_at: string
          id: string
          parent_mission_id: string
          pick_order: number | null
          selected_text: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          cell_id: string
          child_mission_id?: string | null
          created_at?: string
          id?: string
          parent_mission_id: string
          pick_order?: number | null
          selected_text: string
          session_id?: string | null
          user_id?: string
        }
        Update: {
          cell_id?: string
          child_mission_id?: string | null
          created_at?: string
          id?: string
          parent_mission_id?: string
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
            referencedRelation: "notebook_cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_highlights_child_mission_id_fkey"
            columns: ["child_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_highlights_parent_mission_id_fkey"
            columns: ["parent_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
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
      missions: {
        Row: {
          completed_at: string | null
          concept_id: string | null
          created_at: string
          current_checkpoint_id: string | null
          goal: Database["public"]["Enums"]["mission_goal"]
          id: string
          level: Database["public"]["Enums"]["mission_level"]
          origin_thread_id: string | null
          parent_mission_id: string | null
          path_card: string
          spec_json: Json
          started_at: string | null
          status: Database["public"]["Enums"]["mission_status"]
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
          goal: Database["public"]["Enums"]["mission_goal"]
          id?: string
          level: Database["public"]["Enums"]["mission_level"]
          origin_thread_id?: string | null
          parent_mission_id?: string | null
          path_card: string
          spec_json: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
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
          goal?: Database["public"]["Enums"]["mission_goal"]
          id?: string
          level?: Database["public"]["Enums"]["mission_level"]
          origin_thread_id?: string | null
          parent_mission_id?: string | null
          path_card?: string
          spec_json?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
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
            foreignKeyName: "missions_origin_thread_id_fkey"
            columns: ["origin_thread_id"]
            isOneToOne: false
            referencedRelation: "question_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_parent_mission_id_fkey"
            columns: ["parent_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_cells: {
        Row: {
          attached_file: string | null
          attached_to: string | null
          content: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["cell_kind"]
          language: string | null
          mission_id: string
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
          mission_id: string
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
          mission_id?: string
          ord?: number
          source?: Database["public"]["Enums"]["cell_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_cells_attached_to_fkey"
            columns: ["attached_to"]
            isOneToOne: false
            referencedRelation: "notebook_cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_cells_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      puzzles: {
        Row: {
          anchor: Json
          fix_attempts: Json
          framing_text: string | null
          generalization_passed: boolean
          generalization_unlocked: boolean
          id: string
          log_md: string
          micro_challenge_id: string
          mission_id: string
          opened_at: string
          probe_code: string | null
          probe_result: Json | null
          resolved_at: string | null
          solution_revealed: boolean
          status: Database["public"]["Enums"]["puzzle_status"]
          step: Database["public"]["Enums"]["puzzle_step"]
          updated_at: string
          user_hypothesis: string | null
          user_id: string
        }
        Insert: {
          anchor: Json
          fix_attempts?: Json
          framing_text?: string | null
          generalization_passed?: boolean
          generalization_unlocked?: boolean
          id?: string
          log_md?: string
          micro_challenge_id: string
          mission_id: string
          opened_at?: string
          probe_code?: string | null
          probe_result?: Json | null
          resolved_at?: string | null
          solution_revealed?: boolean
          status?: Database["public"]["Enums"]["puzzle_status"]
          step?: Database["public"]["Enums"]["puzzle_step"]
          updated_at?: string
          user_hypothesis?: string | null
          user_id: string
        }
        Update: {
          anchor?: Json
          fix_attempts?: Json
          framing_text?: string | null
          generalization_passed?: boolean
          generalization_unlocked?: boolean
          id?: string
          log_md?: string
          micro_challenge_id?: string
          mission_id?: string
          opened_at?: string
          probe_code?: string | null
          probe_result?: Json | null
          resolved_at?: string | null
          solution_revealed?: boolean
          status?: Database["public"]["Enums"]["puzzle_status"]
          step?: Database["public"]["Enums"]["puzzle_step"]
          updated_at?: string
          user_hypothesis?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzles_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_threads: {
        Row: {
          asked_at: string
          code: Json | null
          files: Json
          id: string
          question_text: string
          status: Database["public"]["Enums"]["qthread_status"]
          summary: string | null
          tag: string | null
          target_mission_id: string | null
          technology: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asked_at?: string
          code?: Json | null
          files?: Json
          id?: string
          question_text: string
          status?: Database["public"]["Enums"]["qthread_status"]
          summary?: string | null
          tag?: string | null
          target_mission_id?: string | null
          technology?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asked_at?: string
          code?: Json | null
          files?: Json
          id?: string
          question_text?: string
          status?: Database["public"]["Enums"]["qthread_status"]
          summary?: string | null
          tag?: string | null
          target_mission_id?: string | null
          technology?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_threads_target_mission_id_fkey"
            columns: ["target_mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_threads_technology_fkey"
            columns: ["technology"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["key"]
          },
        ]
      }
      tech_sections: {
        Row: {
          icon: string | null
          id: string
          name: string
          ord: number
        }
        Insert: {
          icon?: string | null
          id: string
          name: string
          ord?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          ord?: number
        }
        Relationships: []
      }
      technologies: {
        Row: {
          key: string
          label: string
          mn: string | null
          ord: number
          section_id: string
        }
        Insert: {
          key: string
          label: string
          mn?: string | null
          ord?: number
          section_id: string
        }
        Update: {
          key?: string
          label?: string
          mn?: string | null
          ord?: number
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technologies_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "tech_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_concepts: {
        Row: {
          concept_id: string
          ord: number
          thread_id: string
        }
        Insert: {
          concept_id: string
          ord?: number
          thread_id: string
        }
        Update: {
          concept_id?: string
          ord?: number
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_concepts_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_concepts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "question_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          mission_id: string
          ord: number
          role: Database["public"]["Enums"]["message_role"]
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mission_id: string
          ord: number
          role: Database["public"]["Enums"]["message_role"]
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mission_id?: string
          ord?: number
          role?: Database["public"]["Enums"]["message_role"]
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
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
          mission_id: string
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
          mission_id: string
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
          mission_id?: string
          status?: Database["public"]["Enums"]["thread_status"]
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
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
      cell_kind: "markdown" | "code" | "output" | "section" | "divider"
      cell_source: "agent" | "learner" | "backend"
      concept_state: "gap" | "learning" | "known"
      concept_verifier: "you" | "agent"
      message_role: "user" | "assistant"
      mission_goal: "build" | "understand" | "interview" | "work"
      mission_level: "beginner" | "intermediate" | "advanced"
      mission_status:
        | "draft"
        | "in_progress"
        | "completed"
        | "abandoned"
        | "generating"
        | "failed"
      puzzle_status: "active" | "completed" | "abandoned"
      puzzle_step: "framing" | "hypothesis" | "try_it" | "fix" | "generalize"
      qthread_status:
        | "mapping"
        | "awaiting_prereqs"
        | "ready"
        | "built"
        | "archived"
      session_status: "active" | "paused" | "completed"
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
      cell_kind: ["markdown", "code", "output", "section", "divider"],
      cell_source: ["agent", "learner", "backend"],
      concept_state: ["gap", "learning", "known"],
      concept_verifier: ["you", "agent"],
      message_role: ["user", "assistant"],
      mission_goal: ["build", "understand", "interview", "work"],
      mission_level: ["beginner", "intermediate", "advanced"],
      mission_status: [
        "draft",
        "in_progress",
        "completed",
        "abandoned",
        "generating",
        "failed",
      ],
      puzzle_status: ["active", "completed", "abandoned"],
      puzzle_step: ["framing", "hypothesis", "try_it", "fix", "generalize"],
      qthread_status: [
        "mapping",
        "awaiting_prereqs",
        "ready",
        "built",
        "archived",
      ],
      session_status: ["active", "paused", "completed"],
      thread_status: ["open", "closed"],
    },
  },
} as const
