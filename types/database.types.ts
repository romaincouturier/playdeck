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
          host_id: string
          deck_id: string
          code: string
          status: string
          max_players: number
          current_turn_player_id: string | null
          current_turn_guest_id: string | null
          current_phase_id: string
          victory_conditions: Json
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          host_id: string
          deck_id: string
          code: string
          status?: string
          max_players?: number
          current_turn_player_id?: string | null
          current_turn_guest_id?: string | null
          current_phase_id?: string
          victory_conditions?: Json
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Update: {
          id?: string
          host_id?: string
          deck_id?: string
          code?: string
          status?: string
          max_players?: number
          current_turn_player_id?: string | null
          current_turn_guest_id?: string | null
          current_phase_id?: string
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
          location: string
          owner_user_id: string | null
          owner_guest_session_id: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          card_id: string
          location: string
          owner_user_id?: string | null
          owner_guest_session_id?: string | null
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          card_id?: string
          location?: string
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
          deck_id: string
          name: string
          type: string
          visibility: string
          max_cards: number | null
          min_cards: number | null
          can_view: string
          can_draw: string
          can_play_to: string
          is_ordered: boolean
          shuffle_on_init: boolean
          scope: string
          created_at: string
        }
        Insert: {
          id?: string
          deck_id: string
          name: string
          type: string
          visibility: string
          max_cards?: number | null
          min_cards?: number | null
          can_view?: string
          can_draw?: string
          can_play_to?: string
          is_ordered?: boolean
          shuffle_on_init?: boolean
          scope?: string
          created_at?: string
        }
        Update: {
          id?: string
          deck_id?: string
          name?: string
          type?: string
          visibility?: string
          max_cards?: number | null
          min_cards?: number | null
          can_view?: string
          can_draw?: string
          can_play_to?: string
          is_ordered?: boolean
          shuffle_on_init?: boolean
          scope?: string
          created_at?: string
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
