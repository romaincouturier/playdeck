export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      decks: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          game_mode: string
          min_players: number
          max_players: number
          settings: Json
          turn_structure: Json
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          game_mode?: string
          min_players?: number
          max_players?: number
          settings?: Json
          turn_structure?: Json
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          game_mode?: string
          min_players?: number
          max_players?: number
          settings?: Json
          turn_structure?: Json
        }
        Relationships: []
      }
      cards: {
        Row: {
          id: string
          deck_id: string
          image_url: string
          position: number
          type_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          deck_id: string
          image_url: string
          position: number
          type_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          deck_id?: string
          image_url?: string
          position?: number
          type_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          id: string
          game_master_id: string | null
          deck_id: string | null
          code: string
          status: string
          max_players: number
          current_round: number
          game_mode: string
          victory_conditions: Json
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          game_master_id?: string | null
          deck_id?: string | null
          code: string
          status?: string
          max_players?: number
          current_round?: number
          game_mode?: string
          victory_conditions?: Json
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Update: {
          id?: string
          game_master_id?: string | null
          deck_id?: string | null
          code?: string
          status?: string
          max_players?: number
          current_round?: number
          game_mode?: string
          victory_conditions?: Json
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Relationships: []
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          user_id: string | null
          player_order: number
          is_host: boolean
          role: string
          score: number
          joined_at: string
          guest_name: string | null
          guest_session_id: string | null
          has_left: boolean
        }
        Insert: {
          id?: string
          game_id: string
          user_id?: string | null
          player_order: number
          is_host?: boolean
          role?: string
          score?: number
          joined_at?: string
          guest_name?: string | null
          guest_session_id?: string | null
          has_left?: boolean
        }
        Update: {
          id?: string
          game_id?: string
          user_id?: string | null
          player_order?: number
          is_host?: boolean
          role?: string
          score?: number
          joined_at?: string
          guest_name?: string | null
          guest_session_id?: string | null
          has_left?: boolean
        }
        Relationships: []
      }
      game_cards: {
        Row: {
          id: string
          game_id: string
          card_id: string
          zone_id: string | null
          owner_user_id: string | null
          owner_guest_session_id: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          card_id: string
          zone_id?: string | null
          owner_user_id?: string | null
          owner_guest_session_id?: string | null
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          card_id?: string
          zone_id?: string | null
          owner_user_id?: string | null
          owner_guest_session_id?: string | null
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      card_types: {
        Row: {
          id: string
          deck_id: string
          name: string
          properties: Json
          created_at: string
        }
        Insert: {
          id?: string
          deck_id: string
          name: string
          properties?: Json
          created_at?: string
        }
        Update: {
          id?: string
          deck_id?: string
          name?: string
          properties?: Json
          created_at?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          id: string
          game_id: string
          name: string
          type: string
          visibility: string
          default_face: string
          is_ordered: boolean
          max_capacity: number | null
          owner_player_id: string | null
          is_enabled: boolean
          position_x: number | null
          position_y: number | null
          width: number | null
          height: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id: string
          name: string
          type: string
          visibility?: string
          default_face?: string
          is_ordered?: boolean
          max_capacity?: number | null
          owner_player_id?: string | null
          is_enabled?: boolean
          position_x?: number | null
          position_y?: number | null
          width?: number | null
          height?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          name?: string
          type?: string
          visibility?: string
          default_face?: string
          is_ordered?: boolean
          max_capacity?: number | null
          owner_player_id?: string | null
          is_enabled?: boolean
          position_x?: number | null
          position_y?: number | null
          width?: number | null
          height?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_rules: {
        Row: {
          id: string
          deck_id: string
          name: string
          mechanic_type: string
          trigger_event: string
          trigger_condition: string | null
          action_type: string
          action_parameters: Json
          created_at: string
        }
        Insert: {
          id?: string
          deck_id: string
          name: string
          mechanic_type: string
          trigger_event: string
          trigger_condition?: string | null
          action_type: string
          action_parameters?: Json
          created_at?: string
        }
        Update: {
          id?: string
          deck_id?: string
          name?: string
          mechanic_type?: string
          trigger_event?: string
          trigger_condition?: string | null
          action_type?: string
          action_parameters?: Json
          created_at?: string
        }
        Relationships: []
      }
      game_master: {
        Row: {
          game_id: string
          user_id: string
          is_playing: boolean
          omniscient_mode: boolean
          can_undo: boolean
          created_at: string
        }
        Insert: {
          game_id: string
          user_id: string
          is_playing?: boolean
          omniscient_mode?: boolean
          can_undo?: boolean
          created_at?: string
        }
        Update: {
          game_id?: string
          user_id?: string
          is_playing?: boolean
          omniscient_mode?: boolean
          can_undo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      turn_state: {
        Row: {
          game_id: string
          current_player_id: string | null
          turn_order: string[]
          direction: string
          turn_number: number
          timer_seconds: number | null
          timer_started_at: string | null
          is_paused: boolean
          updated_at: string
        }
        Insert: {
          game_id: string
          current_player_id?: string | null
          turn_order?: string[]
          direction?: string
          turn_number?: number
          timer_seconds?: number | null
          timer_started_at?: string | null
          is_paused?: boolean
          updated_at?: string
        }
        Update: {
          game_id?: string
          current_player_id?: string | null
          turn_order?: string[]
          direction?: string
          turn_number?: number
          timer_seconds?: number | null
          timer_started_at?: string | null
          is_paused?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_game_code: {
        Args: Record<string, never>
        Returns: string
      }
      distribute_cards: {
        Args: {
          p_game_id: string
          p_cards_per_player?: number
        }
        Returns: void
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
