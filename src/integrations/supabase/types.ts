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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_chat_presence: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          last_seen_at: string
          viewing_user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          last_seen_at?: string
          viewing_user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          viewing_user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_customer_names: {
        Row: {
          assigned_at: string
          id: string
          indian_name_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          indian_name_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          indian_name_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_customer_names_indian_name_id_fkey"
            columns: ["indian_name_id"]
            isOneToOne: false
            referencedRelation: "indian_names"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          sender_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          sender_role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          sender_role?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      chat_reassignment_logs: {
        Row: {
          chat_session_id: string
          created_at: string
          id: string
          metadata: Json | null
          new_agent_id: string | null
          previous_agent_id: string | null
          trigger_reason: string
          user_id: string
        }
        Insert: {
          chat_session_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_agent_id?: string | null
          previous_agent_id?: string | null
          trigger_reason: string
          user_id: string
        }
        Update: {
          chat_session_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_agent_id?: string | null
          previous_agent_id?: string | null
          trigger_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reassignment_logs_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          assigned_agent_id: string | null
          close_reason: string | null
          created_at: string
          grace_period_expires_at: string | null
          id: string
          last_user_activity_at: string | null
          previous_agent_id: string | null
          reassignment_count: number
          status: Database["public"]["Enums"]["chat_session_status"]
          updated_at: string
          user_id: string
          user_left_at: string | null
          user_messages_cleared_at: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          close_reason?: string | null
          created_at?: string
          grace_period_expires_at?: string | null
          id?: string
          last_user_activity_at?: string | null
          previous_agent_id?: string | null
          reassignment_count?: number
          status?: Database["public"]["Enums"]["chat_session_status"]
          updated_at?: string
          user_id: string
          user_left_at?: string | null
          user_messages_cleared_at?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          close_reason?: string | null
          created_at?: string
          grace_period_expires_at?: string | null
          id?: string
          last_user_activity_at?: string | null
          previous_agent_id?: string | null
          reassignment_count?: number
          status?: Database["public"]["Enums"]["chat_session_status"]
          updated_at?: string
          user_id?: string
          user_left_at?: string | null
          user_messages_cleared_at?: string | null
        }
        Relationships: []
      }
      crypto_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency_symbol: string
          id: string
          order_id: string | null
          payment_proof_url: string | null
          payment_purpose: string | null
          status: string
          transaction_hash: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
          wallet_address: string
          wallet_name: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency_symbol?: string
          id?: string
          order_id?: string | null
          payment_proof_url?: string | null
          payment_purpose?: string | null
          status?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
          wallet_address: string
          wallet_name: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency_symbol?: string
          id?: string
          order_id?: string | null
          payment_proof_url?: string | null
          payment_purpose?: string | null
          status?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
          wallet_address?: string
          wallet_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_payment_methods: {
        Row: {
          config: Json | null
          created_at: string
          custom_message: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_enabled: boolean
          method_type: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          custom_message?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_enabled?: boolean
          method_type?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          custom_message?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_enabled?: boolean
          method_type?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_message_targets: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_message_targets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "dashboard_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_messages: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_enabled: boolean
          message: string
          message_type: string
          priority: number
          show_to_admins: boolean
          show_to_users: boolean
          starts_at: string | null
          target_roles: string[] | null
          target_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_enabled?: boolean
          message: string
          message_type?: string
          priority?: number
          show_to_admins?: boolean
          show_to_users?: boolean
          starts_at?: string | null
          target_roles?: string[] | null
          target_type?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_enabled?: boolean
          message?: string
          message_type?: string
          priority?: number
          show_to_admins?: boolean
          show_to_users?: boolean
          starts_at?: string | null
          target_roles?: string[] | null
          target_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_mfa_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          max_attempts: number
          user_id: string
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_used?: boolean
          max_attempts?: number
          user_id: string
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          max_attempts?: number
          user_id?: string
        }
        Relationships: []
      }
      force_logout_events: {
        Row: {
          created_at: string
          id: string
          reason: string
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      indian_names: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      ip_logs: {
        Row: {
          action_type: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          ip_address: string
          region: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address: string
          region?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          aadhaar_back_url: string
          aadhaar_front_url: string
          aadhaar_number: string
          bank_statement_url: string | null
          created_at: string
          date_of_birth: string
          face_image_url: string | null
          first_name: string
          id: string
          last_name: string
          mobile_number: string | null
          pan_document_url: string
          pan_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhaar_back_url: string
          aadhaar_front_url: string
          aadhaar_number: string
          bank_statement_url?: string | null
          created_at?: string
          date_of_birth: string
          face_image_url?: string | null
          first_name: string
          id?: string
          last_name: string
          mobile_number?: string | null
          pan_document_url: string
          pan_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhaar_back_url?: string
          aadhaar_front_url?: string
          aadhaar_number?: string
          bank_statement_url?: string | null
          created_at?: string
          date_of_birth?: string
          face_image_url?: string | null
          first_name?: string
          id?: string
          last_name?: string
          mobile_number?: string | null
          pan_document_url?: string
          pan_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          was_successful: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          was_successful?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          was_successful?: boolean
        }
        Relationships: []
      }
      order_chat_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          message_id: string | null
          metadata: Json | null
          order_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          order_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_chat_audit_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "order_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_chat_audit_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_chat_messages: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          order_id: string
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          order_id: string
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          order_id?: string
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_chat_quick_replies: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_customer_names: {
        Row: {
          assigned_at: string
          id: string
          indian_name_id: string
          order_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          indian_name_id: string
          order_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          indian_name_id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_customer_names_indian_name_id_fkey"
            columns: ["indian_name_id"]
            isOneToOne: false
            referencedRelation: "indian_names"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_customer_names_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_type: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          order_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_type?: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          order_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_type?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          base_price: number
          completed_at: string | null
          created_at: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          dropshipper_user_id: string
          id: string
          order_number: string
          paid_at: string | null
          payment_link: string | null
          payment_link_clicked_at: string | null
          payment_link_updated_at: string | null
          payment_link_updated_by: string | null
          payment_proof_url: string | null
          payment_type: string
          postpaid_paid_at: string | null
          quantity: number
          selling_price: number
          status: Database["public"]["Enums"]["order_status"]
          storefront_product_id: string
          updated_at: string
        }
        Insert: {
          base_price: number
          completed_at?: string | null
          created_at?: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          dropshipper_user_id: string
          id?: string
          order_number: string
          paid_at?: string | null
          payment_link?: string | null
          payment_link_clicked_at?: string | null
          payment_link_updated_at?: string | null
          payment_link_updated_by?: string | null
          payment_proof_url?: string | null
          payment_type?: string
          postpaid_paid_at?: string | null
          quantity?: number
          selling_price: number
          status?: Database["public"]["Enums"]["order_status"]
          storefront_product_id: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          completed_at?: string | null
          created_at?: string
          customer_address?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          dropshipper_user_id?: string
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_link?: string | null
          payment_link_clicked_at?: string | null
          payment_link_updated_at?: string | null
          payment_link_updated_by?: string | null
          payment_proof_url?: string | null
          payment_type?: string
          postpaid_paid_at?: string | null
          quantity?: number
          selling_price?: number
          status?: Database["public"]["Enums"]["order_status"]
          storefront_product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_storefront_product_id_fkey"
            columns: ["storefront_product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          is_verified: boolean
          mobile_number: string
          otp_code: string
          purpose: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          is_verified?: boolean
          mobile_number: string
          otp_code: string
          purpose?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_verified?: boolean
          mobile_number?: string
          otp_code?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          payout_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          payout_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_status_history_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      popup_acknowledgments: {
        Row: {
          acknowledged_at: string
          id: string
          message_id: string
          message_version: number
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          message_id: string
          message_version: number
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          message_id?: string
          message_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popup_acknowledgments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "popup_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_message_targets: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popup_message_targets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "popup_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_messages: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_enabled: boolean
          message: string
          message_type: string
          priority: number
          re_ack_period_days: number | null
          re_acknowledgment_mode: string
          starts_at: string | null
          target_roles: string[] | null
          target_type: string
          title: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_enabled?: boolean
          message: string
          message_type?: string
          priority?: number
          re_ack_period_days?: number | null
          re_acknowledgment_mode?: string
          starts_at?: string | null
          target_roles?: string[] | null
          target_type?: string
          title?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_enabled?: boolean
          message?: string
          message_type?: string
          priority?: number
          re_ack_period_days?: number | null
          re_acknowledgment_mode?: string
          starts_at?: string | null
          target_roles?: string[] | null
          target_type?: string
          title?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      postpaid_transactions: {
        Row: {
          admin_id: string | null
          admin_reason: string | null
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_reason?: string | null
          amount: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_reason?: string | null
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postpaid_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          media_type: string
          product_id: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          media_type?: string
          product_id: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          media_type?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          review_text: string | null
          storefront_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          review_text?: string | null
          storefront_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          review_text?: string | null
          storefront_product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_storefront_product_id_fkey"
            columns: ["storefront_product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sku: string
          stock: number
          updated_at: string
        }
        Insert: {
          base_price: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sku: string
          stock?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sku?: string
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allow_payout_with_dues: boolean
          commission_override: number | null
          created_at: string
          email: string
          email_2fa_enabled: boolean | null
          id: string
          is_active: boolean
          last_ip_address: string | null
          last_login_at: string | null
          name: string
          postpaid_credit_limit: number
          postpaid_due_cycle: number | null
          postpaid_enabled: boolean
          postpaid_used: number
          profile_image_url: string | null
          saved_payment_details: Json | null
          storefront_banner: string | null
          storefront_name: string | null
          storefront_slug: string | null
          updated_at: string
          user_id: string
          user_level: Database["public"]["Enums"]["user_level"]
          user_status: Database["public"]["Enums"]["user_status"]
          wallet_balance: number
        }
        Insert: {
          allow_payout_with_dues?: boolean
          commission_override?: number | null
          created_at?: string
          email: string
          email_2fa_enabled?: boolean | null
          id?: string
          is_active?: boolean
          last_ip_address?: string | null
          last_login_at?: string | null
          name: string
          postpaid_credit_limit?: number
          postpaid_due_cycle?: number | null
          postpaid_enabled?: boolean
          postpaid_used?: number
          profile_image_url?: string | null
          saved_payment_details?: Json | null
          storefront_banner?: string | null
          storefront_name?: string | null
          storefront_slug?: string | null
          updated_at?: string
          user_id: string
          user_level?: Database["public"]["Enums"]["user_level"]
          user_status?: Database["public"]["Enums"]["user_status"]
          wallet_balance?: number
        }
        Update: {
          allow_payout_with_dues?: boolean
          commission_override?: number | null
          created_at?: string
          email?: string
          email_2fa_enabled?: boolean | null
          id?: string
          is_active?: boolean
          last_ip_address?: string | null
          last_login_at?: string | null
          name?: string
          postpaid_credit_limit?: number
          postpaid_due_cycle?: number | null
          postpaid_enabled?: boolean
          postpaid_used?: number
          profile_image_url?: string | null
          saved_payment_details?: Json | null
          storefront_banner?: string | null
          storefront_name?: string | null
          storefront_slug?: string | null
          updated_at?: string
          user_id?: string
          user_level?: Database["public"]["Enums"]["user_level"]
          user_status?: Database["public"]["Enums"]["user_status"]
          wallet_balance?: number
        }
        Relationships: []
      }
      proof_of_work: {
        Row: {
          admin_remark: string | null
          created_at: string
          id: string
          link_url: string
          notes: string | null
          product_link: string | null
          proof_images: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          work_title: string
        }
        Insert: {
          admin_remark?: string | null
          created_at?: string
          id?: string
          link_url: string
          notes?: string | null
          product_link?: string | null
          proof_images?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          work_title: string
        }
        Update: {
          admin_remark?: string | null
          created_at?: string
          id?: string
          link_url?: string
          notes?: string | null
          product_link?: string | null
          proof_images?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          work_title?: string
        }
        Relationships: []
      }
      storefront_products: {
        Row: {
          created_at: string
          custom_description: string | null
          id: string
          is_active: boolean
          product_id: string
          selling_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_description?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          selling_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_description?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          selling_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      support_agent_presence: {
        Row: {
          active_chat_count: number
          created_at: string
          id: string
          is_online: boolean
          last_seen_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_chat_count?: number
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_chat_count?: number
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      top_dropshippers: {
        Row: {
          badge_title: string | null
          created_at: string
          display_name: string
          earnings_amount: number | null
          id: string
          is_active: boolean | null
          orders_count: number | null
          rank_position: number
          updated_at: string
          updated_by_admin_id: string | null
          user_id: string | null
        }
        Insert: {
          badge_title?: string | null
          created_at?: string
          display_name: string
          earnings_amount?: number | null
          id?: string
          is_active?: boolean | null
          orders_count?: number | null
          rank_position: number
          updated_at?: string
          updated_by_admin_id?: string | null
          user_id?: string | null
        }
        Update: {
          badge_title?: string | null
          created_at?: string
          display_name?: string
          earnings_amount?: number | null
          id?: string
          is_active?: boolean | null
          orders_count?: number | null
          rank_position?: number
          updated_at?: string
          updated_by_admin_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "top_dropshippers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_name: string | null
          device_token: string
          expires_at: string
          id: string
          ip_address: string | null
          last_used_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          device_token: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_used_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          device_token?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_used_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rank_reference: {
        Row: {
          admin_defined_position: number | null
          created_at: string
          id: string
          updated_at: string
          updated_by_admin_id: string | null
          user_id: string
        }
        Insert: {
          admin_defined_position?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          updated_by_admin_id?: string | null
          user_id: string
        }
        Update: {
          admin_defined_position?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          updated_by_admin_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rank_reference_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      video_tutorial_completions: {
        Row: {
          created_at: string
          id: string
          tutorial_id: string
          user_id: string
          watched_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          tutorial_id: string
          user_id: string
          watched_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          tutorial_id?: string
          user_id?: string
          watched_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_type_categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      work_types: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      top_dropshippers_public: {
        Row: {
          badge_title: string | null
          created_at: string | null
          display_name: string | null
          earnings_amount: number | null
          id: string | null
          is_active: boolean | null
          orders_count: number | null
          rank_position: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          badge_title?: string | null
          created_at?: string | null
          display_name?: string | null
          earnings_amount?: never
          id?: string | null
          is_active?: boolean | null
          orders_count?: number | null
          rank_position?: number | null
          updated_at?: string | null
          user_id?: never
        }
        Update: {
          badge_title?: string | null
          created_at?: string | null
          display_name?: string | null
          earnings_amount?: never
          id?: string | null
          is_active?: boolean | null
          orders_count?: number | null
          rank_position?: number | null
          updated_at?: string | null
          user_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      can_request_payout: { Args: { _user_id: string }; Returns: boolean }
      check_login_rate_limit: {
        Args: { _email: string; _ip_address?: string }
        Returns: Json
      }
      cleanup_expired_mfa_data: { Args: never; Returns: undefined }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      create_audit_log:
        | {
            Args: {
              _action_type: string
              _admin_id: string
              _entity_id: string
              _entity_type: string
              _metadata?: Json
              _new_value?: Json
              _old_value?: Json
              _reason?: string
              _user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              _action_type: string
              _admin_id: string
              _entity_id: string
              _entity_type: string
              _metadata?: Json
              _new_value?: Json
              _old_value?: Json
              _reason?: string
              _user_id: string
            }
            Returns: string
          }
      get_assigned_agent_info: {
        Args: { p_user_id: string }
        Returns: {
          agent_name: string
          is_online: boolean
        }[]
      }
      get_assigned_agent_name: { Args: { p_user_id: string }; Returns: string }
      get_available_agent: {
        Args: {
          _exclude_agent_id?: string
          _strategy?: Database["public"]["Enums"]["chat_assignment_strategy"]
        }
        Returns: string
      }
      get_dropshipper_orders_masked: {
        Args: never
        Returns: {
          base_price: number
          completed_at: string
          created_at: string
          customer_address_masked: string
          customer_email_masked: string
          customer_name_masked: string
          customer_phone_masked: string
          dropshipper_user_id: string
          id: string
          order_number: string
          paid_at: string
          payment_link: string
          payment_link_clicked_at: string
          payment_type: string
          postpaid_paid_at: string
          quantity: number
          selling_price: number
          status: Database["public"]["Enums"]["order_status"]
          storefront_product_id: string
          updated_at: string
        }[]
      }
      get_kyc_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["kyc_status"]
      }
      get_postpaid_available_credit: {
        Args: { _user_id: string }
        Returns: number
      }
      get_public_order_status: {
        Args: { p_order_number: string }
        Returns: {
          created_at: string
          order_number: string
          product_name: string
          status: string
          updated_at: string
        }[]
      }
      get_public_order_status_history: {
        Args: { p_order_number: string }
        Returns: {
          created_at: string
          new_status: string
        }[]
      }
      get_public_storefront_profile: {
        Args: { _slug: string }
        Returns: {
          display_name: string
          storefront_banner: string
          storefront_name: string
          storefront_slug: string
          user_id: string
        }[]
      }
      get_user_commission_rate: { Args: { _user_id: string }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_kyc_approved: { Args: { _user_id: string }; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
      log_ip_action: {
        Args: {
          _action_type: string
          _city?: string
          _country?: string
          _ip_address: string
          _region?: string
          _user_id: string
        }
        Returns: string
      }
      process_postpaid_payment: {
        Args: { _amount: number; _order_id: string; _user_id: string }
        Returns: Json
      }
      record_login_attempt: {
        Args: {
          _email: string
          _ip_address?: string
          _was_successful?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      chat_assignment_strategy:
        | "least_active"
        | "round_robin"
        | "priority_based"
      chat_session_status:
        | "active"
        | "user_left"
        | "waiting_for_support"
        | "closed"
      kyc_status: "not_submitted" | "submitted" | "approved" | "rejected"
      order_status:
        | "pending_payment"
        | "paid_by_user"
        | "processing"
        | "completed"
        | "cancelled"
        | "postpaid_pending"
      user_level: "bronze" | "silver" | "gold"
      user_status: "pending" | "approved" | "disabled"
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
      app_role: ["admin", "user"],
      chat_assignment_strategy: [
        "least_active",
        "round_robin",
        "priority_based",
      ],
      chat_session_status: [
        "active",
        "user_left",
        "waiting_for_support",
        "closed",
      ],
      kyc_status: ["not_submitted", "submitted", "approved", "rejected"],
      order_status: [
        "pending_payment",
        "paid_by_user",
        "processing",
        "completed",
        "cancelled",
        "postpaid_pending",
      ],
      user_level: ["bronze", "silver", "gold"],
      user_status: ["pending", "approved", "disabled"],
    },
  },
} as const
