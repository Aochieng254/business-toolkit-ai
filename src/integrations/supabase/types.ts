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
          created_at: string
          creativity: number
          language: string
          preferred_model: string
          response_length: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creativity?: number
          language?: string
          preferred_model?: string
          response_length?: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creativity?: number
          language?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_invoice_number: { Args: { _user_id: string }; Returns: string }
      next_quotation_number: { Args: { _user_id: string }; Returns: string }
      next_receipt_number: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "card"
        | "mpesa"
        | "cheque"
        | "paypal"
        | "stripe"
        | "other"
      quotation_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      receipt_status: "draft" | "issued" | "void"
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
      quotation_status: ["draft", "sent", "accepted", "rejected", "expired"],
      receipt_status: ["draft", "issued", "void"],
    },
  },
} as const
