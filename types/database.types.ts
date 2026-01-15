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
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          id: string
          deck_id: string
          image_url: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          deck_id: string
          image_url: string
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          deck_id?: string
          image_url?: string
          position?: number
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
