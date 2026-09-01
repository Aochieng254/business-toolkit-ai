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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          page_context: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_context?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_context?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_preferences: {
        Row: {
          auto_save_conversions: boolean
          created_at: string
          creativity: number
          language: string
          ocr_language: string
          preferred_model: string
          response_length: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_save_conversions?: boolean
          created_at?: string
          creativity?: number
          language?: string
          ocr_language?: string
          preferred_model?: string
          response_length?: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_save_conversions?: boolean
          created_at?: string
          creativity?: number
          language?: string
          ocr_language?: string
          preferred_model?: string
          response_length?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          action: string
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          model: string | null
          status: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          provider: string
          resource_id: string | null
          user_id: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          payload?: Json
          provider?: string
          resource_id?: string | null
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          provider?: string
          resource_id?: string | null
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          default_currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          tax_number: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      conversion_jobs: {
        Row: {
          counted_against_quota: boolean
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          ocr_language: string | null
          options: Json
          output_file_id: string | null
          output_name: string | null
          output_size_bytes: number | null
          page_count: number | null
          progress: number
          source_name: string
          source_size_bytes: number
          stage: string | null
          started_at: string
          status: Database["public"]["Enums"]["job_status"]
          tool: string
          updated_at: string
          user_id: string
        }
        Insert: {
          counted_against_quota?: boolean
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          ocr_language?: string | null
          options?: Json
          output_file_id?: string | null
          output_name?: string | null
          output_size_bytes?: number | null
          page_count?: number | null
          progress?: number
          source_name: string
          source_size_bytes?: number
          stage?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["job_status"]
          tool: string
          updated_at?: string
          user_id: string
        }
        Update: {
          counted_against_quota?: boolean
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          ocr_language?: string | null
          options?: Json
          output_file_id?: string | null
          output_name?: string | null
          output_size_bytes?: number | null
          page_count?: number | null
          progress?: number
          source_name?: string
          source_size_bytes?: number
          stage?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["job_status"]
          tool?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_jobs_output_file_id_fkey"
            columns: ["output_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          file_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_activity: {
        Row: {
          action: string
          created_at: string
          file_id: string | null
          folder_id: string | null
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_activity_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_activity_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tags: {
        Row: {
          created_at: string
          file_id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_tags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string
          file_id: string
          id: string
          note: string | null
          size_bytes: number
          storage_path: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          note?: string | null
          size_bytes?: number
          storage_path: string
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          note?: string | null
          size_bytes?: number
          storage_path?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          extension: string | null
          folder_id: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          is_trashed: boolean
          metadata: Json
          mime_type: string | null
          name: string
          size_bytes: number
          source_id: string | null
          source_module: string | null
          storage_path: string
          trashed_at: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          extension?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_trashed?: boolean
          metadata?: Json
          mime_type?: string | null
          name: string
          size_bytes?: number
          source_id?: string | null
          source_module?: string | null
          storage_path: string
          trashed_at?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          extension?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_trashed?: boolean
          metadata?: Json
          mime_type?: string | null
          name?: string
          size_bytes?: number
          source_id?: string | null
          source_module?: string | null
          storage_path?: string
          trashed_at?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_trashed: boolean
          name: string
          parent_id: string | null
          trashed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_trashed?: boolean
          name: string
          parent_id?: string | null
          trashed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_trashed?: boolean
          name?: string
          parent_id?: string | null
          trashed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_is_percent: boolean
          discount_value: number
          id: string
          invoice_id: string
          line_total: number
          position: number
          quantity: number
          unit_price: number
          user_id: string
          vat_percent: number
        }
        Insert: {
          created_at?: string
          description?: string
          discount_is_percent?: boolean
          discount_value?: number
          id?: string
          invoice_id: string
          line_total?: number
          position?: number
          quantity?: number
          unit_price?: number
          user_id: string
          vat_percent?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_is_percent?: boolean
          discount_value?: number
          id?: string
          invoice_id?: string
          line_total?: number
          position?: number
          quantity?: number
          unit_price?: number
          user_id?: string
          vat_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          discount_total: number
          due_date: string | null
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          source_quotation_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          terms: string | null
          updated_at: string
          user_id: string
          vat_total: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          due_date?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          source_quotation_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          terms?: string | null
          updated_at?: string
          user_id: string
          vat_total?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          due_date?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          source_quotation_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          terms?: string | null
          updated_at?: string
          user_id?: string
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_quotation_id_fkey"
            columns: ["source_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          discount_is_percent: boolean
          discount_value: number
          id: string
          line_total: number
          position: number
          quantity: number
          quotation_id: string
          unit_price: number
          user_id: string
          vat_percent: number
        }
        Insert: {
          created_at?: string
          description?: string
          discount_is_percent?: boolean
          discount_value?: number
          id?: string
          line_total?: number
          position?: number
          quantity?: number
          quotation_id: string
          unit_price?: number
          user_id: string
          vat_percent?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_is_percent?: boolean
          discount_value?: number
          id?: string
          line_total?: number
          position?: number
          quantity?: number
          quotation_id?: string
          unit_price?: number
          user_id?: string
          vat_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          company_id: string | null
          converted_invoice_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          quotation_date: string
          quotation_number: string
          reference_number: string | null
          sales_rep: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number
          terms: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
          vat_total: number
        }
        Insert: {
          company_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string | null
          quotation_date?: string
          quotation_number: string
          reference_number?: string | null
          sales_rep?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          terms?: string | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
          vat_total?: number
        }
        Update: {
          company_id?: string | null
          converted_invoice_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string | null
          quotation_date?: string
          quotation_number?: string
          reference_number?: string | null
          sales_rep?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          terms?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_invoice_fk"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_items: {
        Row: {
          created_at: string
          description: string
          discount_is_percent: boolean
          discount_value: number
          id: string
          line_total: number
          position: number
          quantity: number
          receipt_id: string
          unit_price: number
          updated_at: string
          user_id: string
          vat_percent: number
        }
        Insert: {
          created_at?: string
          description?: string
          discount_is_percent?: boolean
          discount_value?: number
          id?: string
          line_total?: number
          position?: number
          quantity?: number
          receipt_id: string
          unit_price?: number
          updated_at?: string
          user_id: string
          vat_percent?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_is_percent?: boolean
          discount_value?: number
          id?: string
          line_total?: number
          position?: number
          quantity?: number
          receipt_id?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
          vat_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount_received: number
          company_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string | null
          receipt_date: string
          receipt_number: string
          source_invoice_id: string | null
          status: Database["public"]["Enums"]["receipt_status"]
          subtotal: number
          terms: string | null
          updated_at: string
          user_id: string
          vat_total: number
        }
        Insert: {
          amount_received?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          receipt_date?: string
          receipt_number: string
          source_invoice_id?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          subtotal?: number
          terms?: string | null
          updated_at?: string
          user_id: string
          vat_total?: number
        }
        Update: {
          amount_received?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          receipt_date?: string
          receipt_number?: string
          source_invoice_id?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          subtotal?: number
          terms?: string | null
          updated_at?: string
          user_id?: string
          vat_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_source_invoice_id_fkey"
            columns: ["source_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      recents: {
        Row: {
          file_id: string
          id: string
          opened_at: string
          user_id: string
        }
        Insert: {
          file_id: string
          id?: string
          opened_at?: string
          user_id: string
        }
        Update: {
          file_id?: string
          id?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_files: {
        Row: {
          allow_download: boolean
          created_at: string
          expires_at: string | null
          file_id: string
          id: string
          password_hash: string | null
          revoked_at: string | null
          token: string
          user_id: string
          view_count: number
        }
        Insert: {
          allow_download?: boolean
          created_at?: string
          expires_at?: string | null
          file_id: string
          id?: string
          password_hash?: string | null
          revoked_at?: string | null
          token: string
          user_id: string
          view_count?: number
        }
        Update: {
          allow_download?: boolean
          created_at?: string
          expires_at?: string | null
          file_id?: string
          id?: string
          password_hash?: string | null
          revoked_at?: string | null
          token?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          paypal_payer_email: string | null
          paypal_subscription_id: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          price_usd: number
          status: Database["public"]["Enums"]["sub_status"]
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          paypal_payer_email?: string | null
          paypal_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          price_usd?: number
          status?: Database["public"]["Enums"]["sub_status"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          paypal_payer_email?: string | null
          paypal_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          price_usd?: number
          status?: Database["public"]["Enums"]["sub_status"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      ai_daily_count: { Args: { _user_id: string }; Returns: number }
      conversions_today: { Args: { _user_id: string }; Returns: number }
      get_shared_file: {
        Args: { _token: string }
        Returns: {
          allow_download: boolean
          expires_at: string
          file_id: string
          has_password: boolean
          mime_type: string
          name: string
          size_bytes: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pro: { Args: { _user_id: string }; Returns: boolean }
      next_invoice_number: { Args: { _user_id: string }; Returns: string }
      next_quotation_number: { Args: { _user_id: string }; Returns: string }
      next_receipt_number: { Args: { _user_id: string }; Returns: string }
      storage_usage: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      job_status: "queued" | "running" | "done" | "error" | "cancelled"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "card"
        | "mpesa"
        | "cheque"
        | "paypal"
        | "stripe"
        | "other"
      plan_tier: "free" | "pro"
      quotation_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      receipt_status: "draft" | "issued" | "void"
      sub_status:
        | "none"
        | "trialing"
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
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
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      job_status: ["queued", "running", "done", "error", "cancelled"],
      payment_method: [
        "cash",
        "bank_transfer",
        "card",
        "mpesa",
        "cheque",
        "paypal",
        "stripe",
        "other",
      ],
      plan_tier: ["free", "pro"],
      quotation_status: ["draft", "sent", "accepted", "rejected", "expired"],
      receipt_status: ["draft", "issued", "void"],
      sub_status: [
        "none",
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
