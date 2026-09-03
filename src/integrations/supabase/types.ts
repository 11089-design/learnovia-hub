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
      ai_session_summaries: {
        Row: {
          confused_topics: string[]
          created_at: string
          key_points: string[]
          session_id: string
          summary: string
        }
        Insert: {
          confused_topics?: string[]
          created_at?: string
          key_points?: string[]
          session_id: string
          summary: string
        }
        Update: {
          confused_topics?: string[]
          created_at?: string
          key_points?: string[]
          session_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_session_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          slug?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          category_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          member_count: number
          name: string
          slug: string
        }
        Insert: {
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          member_count?: number
          name: string
          slug: string
        }
        Update: {
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          member_count?: number
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      community_channels: {
        Row: {
          community_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["channel_kind"]
          name: string
          position: number
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["channel_kind"]
          name: string
          position?: number
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["channel_kind"]
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_channels_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          channel_id: string
          community_id: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          user_id: string
        }
        Insert: {
          channel_id: string
          community_id: string
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          user_id: string
        }
        Update: {
          channel_id?: string
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          body: string | null
          community_id: string
          created_at: string
          featured: boolean
          hashtags: string[]
          id: string
          title: string
          upvotes: number
          user_id: string
        }
        Insert: {
          body?: string | null
          community_id: string
          created_at?: string
          featured?: boolean
          hashtags?: string[]
          id?: string
          title: string
          upvotes?: number
          user_id: string
        }
        Update: {
          body?: string | null
          community_id?: string
          created_at?: string
          featured?: boolean
          hashtags?: string[]
          id?: string
          title?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_resources: {
        Row: {
          channel_id: string | null
          community_id: string
          created_at: string
          file_path: string | null
          file_url: string
          folder: string
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          uploaded_by: string
        }
        Insert: {
          channel_id?: string | null
          community_id: string
          created_at?: string
          file_path?: string | null
          file_url: string
          folder?: string
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          uploaded_by: string
        }
        Update: {
          channel_id?: string | null
          community_id?: string
          created_at?: string
          file_path?: string | null
          file_url?: string
          folder?: string
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_resources_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_resources_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      course_attendance: {
        Row: {
          course_day_id: string
          course_id: string
          created_at: string
          id: string
          marked_by: string | null
          note: string | null
          notified_at: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          course_day_id: string
          course_id: string
          created_at?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          notified_at?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          course_day_id?: string
          course_id?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          notified_at?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_attendance_course_day_id_fkey"
            columns: ["course_day_id"]
            isOneToOne: false
            referencedRelation: "course_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_days: {
        Row: {
          blueprint: string | null
          course_id: string
          created_at: string
          day_number: number
          duration_minutes: number
          id: string
          objectives: string[]
          session_id: string | null
          starts_at: string | null
          title: string
        }
        Insert: {
          blueprint?: string | null
          course_id: string
          created_at?: string
          day_number: number
          duration_minutes?: number
          id?: string
          objectives?: string[]
          session_id?: string | null
          starts_at?: string | null
          title: string
        }
        Update: {
          blueprint?: string | null
          course_id?: string
          created_at?: string
          day_number?: number
          duration_minutes?: number
          id?: string
          objectives?: string[]
          session_id?: string | null
          starts_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_days_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_days_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          absences: number
          course_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Insert: {
          absences?: number
          course_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Update: {
          absences?: number
          course_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          age_max: number | null
          age_min: number | null
          attendance_policy: string
          category_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          enrolled_count: number
          host_id: string
          id: string
          language: string
          level: string | null
          max_absences: number
          outcomes: string[]
          peer_led: boolean
          requirements: string[]
          seats: number
          slug: string
          starts_on: string | null
          status: Database["public"]["Enums"]["course_status"]
          tagline: string | null
          title: string
          track: Database["public"]["Enums"]["learn_track"]
          updated_at: string
          verification_id: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          attendance_policy?: string
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          enrolled_count?: number
          host_id: string
          id?: string
          language?: string
          level?: string | null
          max_absences?: number
          outcomes?: string[]
          peer_led?: boolean
          requirements?: string[]
          seats?: number
          slug: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          tagline?: string | null
          title: string
          track?: Database["public"]["Enums"]["learn_track"]
          updated_at?: string
          verification_id?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          attendance_policy?: string
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          enrolled_count?: number
          host_id?: string
          id?: string
          language?: string
          level?: string | null
          max_absences?: number
          outcomes?: string[]
          peer_led?: boolean
          requirements?: string[]
          seats?: number
          slug?: string
          starts_on?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          tagline?: string | null
          title?: string
          track?: Database["public"]["Enums"]["learn_track"]
          updated_at?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "tutor_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "direct_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_threads: {
        Row: {
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      hand_raises: {
        Row: {
          id: string
          raised_at: string
          resolved_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          raised_at?: string
          resolved_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          raised_at?: string
          resolved_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hand_raises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          target_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          target_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          target_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: string[]
          age: number | null
          avatar_url: string | null
          avg_rating: number
          bio: string | null
          can_charge: boolean
          created_at: string
          display_name: string | null
          free_sessions_taught: number
          full_name: string | null
          goals: string | null
          grade: string | null
          headline: string | null
          id: string
          interests: string[]
          kids_mode: boolean
          onboarded: boolean
          parent_consent: boolean
          role: Database["public"]["Enums"]["user_role"]
          university: string | null
          updated_at: string
        }
        Insert: {
          achievements?: string[]
          age?: number | null
          avatar_url?: string | null
          avg_rating?: number
          bio?: string | null
          can_charge?: boolean
          created_at?: string
          display_name?: string | null
          free_sessions_taught?: number
          full_name?: string | null
          goals?: string | null
          grade?: string | null
          headline?: string | null
          id: string
          interests?: string[]
          kids_mode?: boolean
          onboarded?: boolean
          parent_consent?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          university?: string | null
          updated_at?: string
        }
        Update: {
          achievements?: string[]
          age?: number | null
          avatar_url?: string | null
          avg_rating?: number
          bio?: string | null
          can_charge?: boolean
          created_at?: string
          display_name?: string | null
          free_sessions_taught?: number
          full_name?: string | null
          goals?: string | null
          grade?: string | null
          headline?: string | null
          id?: string
          interests?: string[]
          kids_mode?: boolean
          onboarded?: boolean
          parent_consent?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_kind?: string
        }
        Relationships: []
      }
      session_breakout_assignments: {
        Row: {
          breakout_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          breakout_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          breakout_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_breakout_assignments_breakout_id_fkey"
            columns: ["breakout_id"]
            isOneToOne: false
            referencedRelation: "session_breakouts"
            referencedColumns: ["id"]
          },
        ]
      }
      session_breakouts: {
        Row: {
          closed: boolean
          created_at: string
          id: string
          name: string
          session_id: string
        }
        Insert: {
          closed?: boolean
          created_at?: string
          id?: string
          name: string
          session_id: string
        }
        Update: {
          closed?: boolean
          created_at?: string
          id?: string
          name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_breakouts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          pinned: boolean
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          pinned?: boolean
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          pinned?: boolean
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "session_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes_private: {
        Row: {
          content: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_private_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes_shared: {
        Row: {
          content: string
          session_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          session_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          session_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_shared_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          anonymous_name: string | null
          attended_minutes: number
          id: string
          joined_at: string
          left_at: string | null
          muted: boolean
          removed: boolean
          role: Database["public"]["Enums"]["participant_role"]
          session_id: string
          user_id: string
        }
        Insert: {
          anonymous_name?: string | null
          attended_minutes?: number
          id?: string
          joined_at?: string
          left_at?: string | null
          muted?: boolean
          removed?: boolean
          role?: Database["public"]["Enums"]["participant_role"]
          session_id: string
          user_id: string
        }
        Update: {
          anonymous_name?: string | null
          attended_minutes?: number
          id?: string
          joined_at?: string
          left_at?: string | null
          muted?: boolean
          removed?: boolean
          role?: Database["public"]["Enums"]["participant_role"]
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "session_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      session_polls: {
        Row: {
          closed: boolean
          created_at: string
          created_by: string
          id: string
          options: Json
          question: string
          session_id: string
        }
        Insert: {
          closed?: boolean
          created_at?: string
          created_by: string
          id?: string
          options: Json
          question: string
          session_id: string
        }
        Update: {
          closed?: boolean
          created_at?: string
          created_by?: string
          id?: string
          options?: Json
          question?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          session_id: string
          student_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          session_id: string
          student_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reflections: {
        Row: {
          created_at: string
          id: string
          learned: string
          rating: number | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          learned: string
          rating?: number | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          learned?: string
          rating?: number | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_reflections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_resources: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          kind: string
          session_id: string
          title: string
          uploaded_by: string
          url: string | null
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          kind: string
          session_id: string
          title: string
          uploaded_by: string
          url?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: string
          session_id?: string
          title?: string
          uploaded_by?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_resources_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_transcripts: {
        Row: {
          at_seconds: number
          content: string
          created_at: string
          id: string
          session_id: string
          speaker_name: string
          user_id: string
        }
        Insert: {
          at_seconds?: number
          content: string
          created_at?: string
          id?: string
          session_id: string
          speaker_name?: string
          user_id: string
        }
        Update: {
          at_seconds?: number
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          speaker_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_waiting_room: {
        Row: {
          display_name: string
          id: string
          requested_at: string
          resolved_at: string | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          display_name: string
          id?: string
          requested_at?: string
          resolved_at?: string | null
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          display_name?: string
          id?: string
          requested_at?: string
          resolved_at?: string | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_waiting_room_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_whiteboards: {
        Row: {
          session_id: string
          snapshot: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          session_id: string
          snapshot?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          session_id?: string
          snapshot?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_whiteboards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          agenda: Json
          allow_anonymous: boolean
          category_id: string | null
          course_day_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          focus_mode: boolean
          format: Database["public"]["Enums"]["session_format"]
          id: string
          is_homework_help: boolean
          kind: Database["public"]["Enums"]["session_kind"]
          language: string
          level: string | null
          locked: boolean
          max_participants: number
          meeting_room_name: string
          outcomes: string[]
          peer_led: boolean
          price_cents: number
          spotlight_user_id: string | null
          started_at: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string
          track: Database["public"]["Enums"]["learn_track"]
          tutor_id: string
          updated_at: string
        }
        Insert: {
          agenda?: Json
          allow_anonymous?: boolean
          category_id?: string | null
          course_day_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          focus_mode?: boolean
          format?: Database["public"]["Enums"]["session_format"]
          id?: string
          is_homework_help?: boolean
          kind?: Database["public"]["Enums"]["session_kind"]
          language?: string
          level?: string | null
          locked?: boolean
          max_participants?: number
          meeting_room_name?: string
          outcomes?: string[]
          peer_led?: boolean
          price_cents?: number
          spotlight_user_id?: string | null
          started_at?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          track?: Database["public"]["Enums"]["learn_track"]
          tutor_id: string
          updated_at?: string
        }
        Update: {
          agenda?: Json
          allow_anonymous?: boolean
          category_id?: string | null
          course_day_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          focus_mode?: boolean
          format?: Database["public"]["Enums"]["session_format"]
          id?: string
          is_homework_help?: boolean
          kind?: Database["public"]["Enums"]["session_kind"]
          language?: string
          level?: string | null
          locked?: boolean
          max_participants?: number
          meeting_room_name?: string
          outcomes?: string[]
          peer_led?: boolean
          price_cents?: number
          spotlight_user_id?: string | null
          started_at?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          track?: Database["public"]["Enums"]["learn_track"]
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          current_streak: number
          last_active_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          plan: Json
          title: string
          updated_at: string
          user_id: string
          week_of: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan: Json
          title: string
          updated_at?: string
          user_id: string
          week_of?: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: Json
          title?: string
          updated_at?: string
          user_id?: string
          week_of?: string
        }
        Relationships: []
      }
      tutor_verifications: {
        Row: {
          ai_confidence: number
          ai_verdict: Json
          claimed_score: string | null
          created_at: string
          exam: string | null
          id: string
          kind: Database["public"]["Enums"]["verification_kind"]
          proof_path: string | null
          reviewer_note: string | null
          status: Database["public"]["Enums"]["verification_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number
          ai_verdict?: Json
          claimed_score?: string | null
          created_at?: string
          exam?: string | null
          id?: string
          kind: Database["public"]["Enums"]["verification_kind"]
          proof_path?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number
          ai_verdict?: Json
          claimed_score?: string | null
          created_at?: string
          exam?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["verification_kind"]
          proof_path?: string | null
          reviewer_note?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator" | "tutor" | "learner"
      attendance_status: "present" | "absent" | "excused" | "pending"
      category_kind: "academic" | "hobby" | "community"
      channel_kind: "text" | "voice" | "resources"
      community_role: "owner" | "mod" | "member"
      course_status: "draft" | "open" | "running" | "ended" | "cancelled"
      enrollment_status: "active" | "completed" | "withdrawn" | "removed"
      learn_track: "peer" | "training" | "workshop" | "kids"
      participant_role: "tutor" | "student"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      session_format: "one_on_one" | "group"
      session_kind: "free" | "paid"
      session_status: "scheduled" | "live" | "ended" | "cancelled"
      user_role: "learner" | "tutor"
      verification_kind: "exam_score" | "credential" | "peer_no_score"
      verification_status: "pending" | "approved" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "tutor", "learner"],
      attendance_status: ["present", "absent", "excused", "pending"],
      category_kind: ["academic", "hobby", "community"],
      channel_kind: ["text", "voice", "resources"],
      community_role: ["owner", "mod", "member"],
      course_status: ["draft", "open", "running", "ended", "cancelled"],
      enrollment_status: ["active", "completed", "withdrawn", "removed"],
      learn_track: ["peer", "training", "workshop", "kids"],
      participant_role: ["tutor", "student"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      session_format: ["one_on_one", "group"],
      session_kind: ["free", "paid"],
      session_status: ["scheduled", "live", "ended", "cancelled"],
      user_role: ["learner", "tutor"],
      verification_kind: ["exam_score", "credential", "peer_no_score"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
