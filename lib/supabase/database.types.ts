export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      blocked_email_domains: {
        Row: {
          created_at: string | null;
          domain: string;
          id: number;
          is_active: boolean;
        };
        Insert: {
          created_at?: string | null;
          domain: string;
          id?: number;
          is_active?: boolean;
        };
        Update: {
          created_at?: string | null;
          domain?: string;
          id?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      blocked_fingerprints: {
        Row: {
          blocked_by: string | null;
          created_at: string | null;
          fingerprint: string;
          id: number;
          reason: string | null;
        };
        Insert: {
          blocked_by?: string | null;
          created_at?: string | null;
          fingerprint: string;
          id?: number;
          reason?: string | null;
        };
        Update: {
          blocked_by?: string | null;
          created_at?: string | null;
          fingerprint?: string;
          id?: number;
          reason?: string | null;
        };
        Relationships: [];
      };
      blocked_ips: {
        Row: {
          blocked_by: string | null;
          created_at: string | null;
          id: number;
          ip_address: string;
          reason: string | null;
        };
        Insert: {
          blocked_by?: string | null;
          created_at?: string | null;
          id?: number;
          ip_address: string;
          reason?: string | null;
        };
        Update: {
          blocked_by?: string | null;
          created_at?: string | null;
          id?: number;
          ip_address?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      blog_groups: {
        Row: {
          enabled: boolean | null;
          id: number;
          name: string | null;
          rank: number | null;
          user_id: string | null;
        };
        Insert: {
          enabled?: boolean | null;
          id?: number;
          name?: string | null;
          rank?: number | null;
          user_id?: string | null;
        };
        Update: {
          enabled?: boolean | null;
          id?: number;
          name?: string | null;
          rank?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blog_groups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      blogs: {
        Row: {
          click_counter: number | null;
          content: string;
          created_at: string;
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          image_url: string | null;
          meta_description: string | null;
          meta_title: string | null;
          rank: number | null;
          slug: string;
          title: string;
        };
        Insert: {
          click_counter?: number | null;
          content: string;
          created_at?: string;
          enabled?: boolean | null;
          group_id?: number | null;
          id?: number;
          image_url?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          rank?: number | null;
          slug: string;
          title: string;
        };
        Update: {
          click_counter?: number | null;
          content?: string;
          created_at?: string;
          enabled?: boolean | null;
          group_id?: number | null;
          id?: number;
          image_url?: string | null;
          meta_description?: string | null;
          meta_title?: string | null;
          rank?: number | null;
          slug?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blogs_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "blog_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      brands: {
        Row: {
          base_url: string;
          brand_name: string;
          created_at: string | null;
          domain: string;
          email_from: string;
          ga_tracking_id: string | null;
          id: string;
          is_active: boolean | null;
          logo_path: string;
          tagline: string | null;
          updated_at: string | null;
        };
        Insert: {
          base_url: string;
          brand_name: string;
          created_at?: string | null;
          domain: string;
          email_from: string;
          ga_tracking_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          logo_path: string;
          tagline?: string | null;
          updated_at?: string | null;
        };
        Update: {
          base_url?: string;
          brand_name?: string;
          created_at?: string | null;
          domain?: string;
          email_from?: string;
          ga_tracking_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          logo_path?: string;
          tagline?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      dentistries: {
        Row: {
          about_text: string | null;
          about_title: string | null;
          booking_link: string | null;
          booking_link_enabled: boolean | null;
          contact_email: string | null;
          dentistry_id: string;
          location_title: string | null;
          phone: string | null;
          user_id: string;
          website: string | null;
        };
        Insert: {
          about_text?: string | null;
          about_title?: string | null;
          booking_link?: string | null;
          booking_link_enabled?: boolean | null;
          contact_email?: string | null;
          dentistry_id?: string;
          location_title?: string | null;
          phone?: string | null;
          user_id: string;
          website?: string | null;
        };
        Update: {
          about_text?: string | null;
          about_title?: string | null;
          booking_link?: string | null;
          booking_link_enabled?: boolean | null;
          contact_email?: string | null;
          dentistry_id?: string;
          location_title?: string | null;
          phone?: string | null;
          user_id?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dentistries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dentistry_links: {
        Row: {
          dentistry_links_id: string;
          link_group_id: string;
          link_id: string;
        };
        Insert: {
          dentistry_links_id?: string;
          link_group_id: string;
          link_id: string;
        };
        Update: {
          dentistry_links_id?: string;
          link_group_id?: string;
          link_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dentistry_links_link_group_id_fkey";
            columns: ["link_group_id"];
            isOneToOne: false;
            referencedRelation: "link_groups";
            referencedColumns: ["link_group_id"];
          },
          {
            foreignKeyName: "dentistry_links_link_id_fkey";
            columns: ["link_id"];
            isOneToOne: true;
            referencedRelation: "links";
            referencedColumns: ["link_id"];
          },
        ];
      };
      dentistry_locations: {
        Row: {
          dentistry_id: string | null;
          dentistry_location_id: string;
          location_id: string | null;
        };
        Insert: {
          dentistry_id?: string | null;
          dentistry_location_id?: string;
          location_id?: string | null;
        };
        Update: {
          dentistry_id?: string | null;
          dentistry_location_id?: string;
          location_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dentistry_locations_dentistry_id_fkey";
            columns: ["dentistry_id"];
            isOneToOne: false;
            referencedRelation: "dentistries";
            referencedColumns: ["dentistry_id"];
          },
          {
            foreignKeyName: "dentistry_locations_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["location_id"];
          },
        ];
      };
      dentistry_treatments: {
        Row: {
          dentistry_id: string;
          dentistry_treatment_id: string;
          rank: number;
          treatment_id: string;
        };
        Insert: {
          dentistry_id: string;
          dentistry_treatment_id?: string;
          rank: number;
          treatment_id: string;
        };
        Update: {
          dentistry_id?: string;
          dentistry_treatment_id?: string;
          rank?: number;
          treatment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dentistry_treatments_dentistry_id_fkey";
            columns: ["dentistry_id"];
            isOneToOne: false;
            referencedRelation: "dentistries";
            referencedColumns: ["dentistry_id"];
          },
          {
            foreignKeyName: "dentistry_treatments_treatment_id_fkey";
            columns: ["treatment_id"];
            isOneToOne: true;
            referencedRelation: "treatments";
            referencedColumns: ["treatment_id"];
          },
        ];
      };
      external_review_pages: {
        Row: {
          id: number;
          link: string;
          user_id: string;
        };
        Insert: {
          id?: number;
          link: string;
          user_id: string;
        };
        Update: {
          id?: number;
          link?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "external_review_pages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      galleries: {
        Row: {
          after_image_label: string | null;
          after_image_url: string | null;
          before_image_label: string | null;
          before_image_url: string | null;
          created_at: string;
          enabled: boolean | null;
          id: number;
          rank: number | null;
          title: string | null;
          user_id: string;
        };
        Insert: {
          after_image_label?: string | null;
          after_image_url?: string | null;
          before_image_label?: string | null;
          before_image_url?: string | null;
          created_at?: string;
          enabled?: boolean | null;
          id?: number;
          rank?: number | null;
          title?: string | null;
          user_id: string;
        };
        Update: {
          after_image_label?: string | null;
          after_image_url?: string | null;
          before_image_label?: string | null;
          before_image_url?: string | null;
          created_at?: string;
          enabled?: boolean | null;
          id?: number;
          rank?: number | null;
          title?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "galleries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      general_galleries: {
        Row: {
          created_at: string;
          enabled: boolean | null;
          id: number;
          image_url: string | null;
          rank: number | null;
          title: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean | null;
          id?: number;
          image_url?: string | null;
          rank?: number | null;
          title?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          enabled?: boolean | null;
          id?: number;
          image_url?: string | null;
          rank?: number | null;
          title?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "general_galleries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          enabled: boolean | null;
          id: number;
          name: string | null;
          rank: number | null;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          enabled?: boolean | null;
          id?: number;
          name?: string | null;
          rank?: number | null;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          enabled?: boolean | null;
          id?: number;
          name?: string | null;
          rank?: number | null;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "groups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      link_groups: {
        Row: {
          dentistry_id: string;
          heading: string;
          link_group_id: string;
          rank: number;
        };
        Insert: {
          dentistry_id: string;
          heading: string;
          link_group_id?: string;
          rank: number;
        };
        Update: {
          dentistry_id?: string;
          heading?: string;
          link_group_id?: string;
          rank?: number;
        };
        Relationships: [
          {
            foreignKeyName: "link_groups_dentistry_id_fkey";
            columns: ["dentistry_id"];
            isOneToOne: false;
            referencedRelation: "dentistries";
            referencedColumns: ["dentistry_id"];
          },
        ];
      };
      links: {
        Row: {
          click_counter: number | null;
          is_active: boolean;
          link: string;
          link_id: string;
          rank: number;
          title: string;
        };
        Insert: {
          click_counter?: number | null;
          is_active?: boolean;
          link: string;
          link_id?: string;
          rank: number;
          title: string;
        };
        Update: {
          click_counter?: number | null;
          is_active?: boolean;
          link?: string;
          link_id?: string;
          rank?: number;
          title?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          area: string | null;
          business_name: string | null;
          city: string | null;
          country: string | null;
          full_address: string | null;
          latitude: number | null;
          location_id: string;
          longitude: number | null;
          updated_at: string;
        };
        Insert: {
          area?: string | null;
          business_name?: string | null;
          city?: string | null;
          country?: string | null;
          full_address?: string | null;
          latitude?: number | null;
          location_id?: string;
          longitude?: number | null;
          updated_at?: string;
        };
        Update: {
          area?: string | null;
          business_name?: string | null;
          city?: string | null;
          country?: string | null;
          full_address?: string | null;
          latitude?: number | null;
          location_id?: string;
          longitude?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      marketing_unsubscribes: {
        Row: {
          email: string;
          source: string | null;
          unsubscribed_at: string;
        };
        Insert: {
          email: string;
          source?: string | null;
          unsubscribed_at?: string;
        };
        Update: {
          email?: string;
          source?: string | null;
          unsubscribed_at?: string;
        };
        Relationships: [];
      };
      offer_codes: {
        Row: {
          id: number;
          offer_code: string | null;
          trial_duration: number | null;
          university: string | null;
        };
        Insert: {
          id?: number;
          offer_code?: string | null;
          trial_duration?: number | null;
          university?: string | null;
        };
        Update: {
          id?: number;
          offer_code?: string | null;
          trial_duration?: number | null;
          university?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          currency: string | null;
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          image_url: string | null;
          link: string | null;
          name: string | null;
          platform: string | null;
          price: number | null;
          rank: number | null;
          user_id: string | null;
        };
        Insert: {
          currency?: string | null;
          enabled?: boolean | null;
          group_id?: number | null;
          id?: number;
          image_url?: string | null;
          link?: string | null;
          name?: string | null;
          platform?: string | null;
          price?: number | null;
          rank?: number | null;
          user_id?: string | null;
        };
        Update: {
          currency?: string | null;
          enabled?: boolean | null;
          group_id?: number | null;
          id?: number;
          image_url?: string | null;
          link?: string | null;
          name?: string | null;
          platform?: string | null;
          price?: number | null;
          rank?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_audit_log: {
        Row: {
          actor_email: string | null;
          actor_id: string | null;
          actor_role: string | null;
          changed_keys: string[];
          created_at: string;
          id: number;
          ip_address: string | null;
          new_values: Json | null;
          old_values: Json | null;
          operation: string;
          record_id: string;
          subject_email: string | null;
          subject_username: string | null;
          table_name: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          actor_email?: string | null;
          actor_id?: string | null;
          actor_role?: string | null;
          changed_keys?: string[];
          created_at?: string;
          id?: number;
          ip_address?: string | null;
          new_values?: Json | null;
          old_values?: Json | null;
          operation: string;
          record_id: string;
          subject_email?: string | null;
          subject_username?: string | null;
          table_name: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          actor_email?: string | null;
          actor_id?: string | null;
          actor_role?: string | null;
          changed_keys?: string[];
          created_at?: string;
          id?: number;
          ip_address?: string | null;
          new_values?: Json | null;
          old_values?: Json | null;
          operation?: string;
          record_id?: string;
          subject_email?: string | null;
          subject_username?: string | null;
          table_name?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profile_report_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          next_state: Json | null;
          previous_state: Json | null;
          report_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          next_state?: Json | null;
          previous_state?: Json | null;
          report_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          next_state?: Json | null;
          previous_state?: Json | null;
          report_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_report_audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_report_audit_log_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "profile_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_report_notes: {
        Row: {
          author_id: string;
          created_at: string;
          id: string;
          note: string;
          report_id: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          id?: string;
          note: string;
          report_id: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          id?: string;
          note?: string;
          report_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_report_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_report_notes_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "profile_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_report_submission_limits: {
        Row: {
          source_hash: string;
          submission_count: number;
          updated_at: string;
          window_started_at: string;
        };
        Insert: {
          source_hash: string;
          submission_count: number;
          updated_at?: string;
          window_started_at: string;
        };
        Update: {
          source_hash?: string;
          submission_count?: number;
          updated_at?: string;
          window_started_at?: string;
        };
        Relationships: [];
      };
      profile_reports: {
        Row: {
          assigned_to: string | null;
          category: string;
          created_at: string;
          details: string | null;
          id: string;
          outcome: string | null;
          outcome_reason: string | null;
          priority: string;
          priority_rank: number | null;
          profile_id: string;
          profile_snapshot: Json;
          profile_username: string;
          public_url: string;
          reporter_email: string | null;
          reporter_email_expires_at: string | null;
          resolved_at: string | null;
          severity: string;
          sla_due_at: string;
          status: string;
          submission_fingerprint: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          assigned_to?: string | null;
          category: string;
          created_at?: string;
          details?: string | null;
          id?: string;
          outcome?: string | null;
          outcome_reason?: string | null;
          priority: string;
          priority_rank?: number | null;
          profile_id: string;
          profile_snapshot: Json;
          profile_username: string;
          public_url: string;
          reporter_email?: string | null;
          reporter_email_expires_at?: string | null;
          resolved_at?: string | null;
          severity: string;
          sla_due_at: string;
          status?: string;
          submission_fingerprint: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          assigned_to?: string | null;
          category?: string;
          created_at?: string;
          details?: string | null;
          id?: string;
          outcome?: string | null;
          outcome_reason?: string | null;
          priority?: string;
          priority_rank?: number | null;
          profile_id?: string;
          profile_snapshot?: Json;
          profile_username?: string;
          public_url?: string;
          reporter_email?: string | null;
          reporter_email_expires_at?: string | null;
          resolved_at?: string | null;
          severity?: string;
          sla_due_at?: string;
          status?: string;
          submission_fingerprint?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "profile_reports_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      public_profiles: {
        Row: {
          dentistry_id: string;
          first_name: string | null;
          gdc_no: string | null;
          isVerified: boolean | null;
          last_name: string | null;
          position: string | null;
          profile_id: string;
          qualification: string | null;
          registered_domain: string;
          subscription_status: string | null;
          title: string | null;
          updated_at: string;
          use_dental_brand: boolean | null;
          username: string;
          verified_domain: string | null;
        };
        Insert: {
          dentistry_id: string;
          first_name?: string | null;
          gdc_no?: string | null;
          isVerified?: boolean | null;
          last_name?: string | null;
          position?: string | null;
          profile_id: string;
          qualification?: string | null;
          registered_domain: string;
          subscription_status?: string | null;
          title?: string | null;
          updated_at?: string;
          use_dental_brand?: boolean | null;
          username: string;
          verified_domain?: string | null;
        };
        Update: {
          dentistry_id?: string;
          first_name?: string | null;
          gdc_no?: string | null;
          isVerified?: boolean | null;
          last_name?: string | null;
          position?: string | null;
          profile_id?: string;
          qualification?: string | null;
          registered_domain?: string;
          subscription_status?: string | null;
          title?: string | null;
          updated_at?: string;
          use_dental_brand?: boolean | null;
          username?: string;
          verified_domain?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "public_profiles_dentistry_id_fkey";
            columns: ["dentistry_id"];
            isOneToOne: true;
            referencedRelation: "dentistries";
            referencedColumns: ["dentistry_id"];
          },
          {
            foreignKeyName: "public_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_entitlement_accounts: {
        Row: {
          authoritative_end: string;
          created_at: string;
          lease_expires_at: string | null;
          lease_operation_key: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          authoritative_end: string;
          created_at?: string;
          lease_expires_at?: string | null;
          lease_operation_key?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          authoritative_end?: string;
          created_at?: string;
          lease_expires_at?: string | null;
          lease_operation_key?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_entitlement_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      referral_entitlement_operations: {
        Row: {
          additional_months: number;
          applied_at: string | null;
          attempt_count: number;
          created_at: string;
          is_trial: boolean;
          operation_key: string;
          status: string;
          target_end: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          additional_months: number;
          applied_at?: string | null;
          attempt_count?: number;
          created_at?: string;
          is_trial: boolean;
          operation_key: string;
          status?: string;
          target_end: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          additional_months?: number;
          applied_at?: string | null;
          attempt_count?: number;
          created_at?: string;
          is_trial?: boolean;
          operation_key?: string;
          status?: string;
          target_end?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_entitlement_operations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "referral_entitlement_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      registration_completion_steps: {
        Row: {
          attempt_count: number;
          completed_at: string | null;
          created_at: string;
          failure_code: string | null;
          provider_reference: string | null;
          started_at: string | null;
          status: string;
          step: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          failure_code?: string | null;
          provider_reference?: string | null;
          started_at?: string | null;
          status?: string;
          step: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          failure_code?: string | null;
          provider_reference?: string | null;
          started_at?: string | null;
          status?: string;
          step?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registration_completion_steps_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "registration_completions";
            referencedColumns: ["user_id"];
          },
        ];
      };
      registration_completions: {
        Row: {
          base_trial_months: number;
          completed_at: string | null;
          created_at: string;
          offer_code: string | null;
          referral_bonus_months: number;
          referrer_user_id: string | null;
          registered_domain: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          total_trial_months: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          base_trial_months: number;
          completed_at?: string | null;
          created_at?: string;
          offer_code?: string | null;
          referral_bonus_months: number;
          referrer_user_id?: string | null;
          registered_domain: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          total_trial_months?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          base_trial_months?: number;
          completed_at?: string | null;
          created_at?: string;
          offer_code?: string | null;
          referral_bonus_months?: number;
          referrer_user_id?: string | null;
          registered_domain?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          total_trial_months?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          content: string | null;
          created_at: string | null;
          enabled: boolean | null;
          id: number;
          image_url: string | null;
          platform: string | null;
          rank: number | null;
          reviewer_name: string | null;
          stars: number | null;
          user_id: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          enabled?: boolean | null;
          id?: number;
          image_url?: string | null;
          platform?: string | null;
          rank?: number | null;
          reviewer_name?: string | null;
          stars?: number | null;
          user_id?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          enabled?: boolean | null;
          id?: number;
          image_url?: string | null;
          platform?: string | null;
          rank?: number | null;
          reviewer_name?: string | null;
          stars?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      security_logs: {
        Row: {
          country: string | null;
          created_at: string | null;
          details: Json | null;
          email: string | null;
          event_type: string;
          fingerprint: string | null;
          first_name: string | null;
          id: number;
          ip_address: string | null;
          last_name: string | null;
          location: string | null;
          route: string | null;
          user_agent: string | null;
          username: string | null;
        };
        Insert: {
          country?: string | null;
          created_at?: string | null;
          details?: Json | null;
          email?: string | null;
          event_type: string;
          fingerprint?: string | null;
          first_name?: string | null;
          id?: number;
          ip_address?: string | null;
          last_name?: string | null;
          location?: string | null;
          route?: string | null;
          user_agent?: string | null;
          username?: string | null;
        };
        Update: {
          country?: string | null;
          created_at?: string | null;
          details?: Json | null;
          email?: string | null;
          event_type?: string;
          fingerprint?: string | null;
          first_name?: string | null;
          id?: number;
          ip_address?: string | null;
          last_name?: string | null;
          location?: string | null;
          route?: string | null;
          user_agent?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          id: number;
          key: string | null;
          value: string | null;
        };
        Insert: {
          id?: number;
          key?: string | null;
          value?: string | null;
        };
        Update: {
          id?: number;
          key?: string | null;
          value?: string | null;
        };
        Relationships: [];
      };
      socials: {
        Row: {
          dentistry_id: string;
          dentistry_socials_id: string;
          facebook_link: string | null;
          instagram_link: string | null;
          linkedin_link: string | null;
          other_link: string | null;
          tiktok_link: string | null;
          twitter_link: string | null;
        };
        Insert: {
          dentistry_id: string;
          dentistry_socials_id?: string;
          facebook_link?: string | null;
          instagram_link?: string | null;
          linkedin_link?: string | null;
          other_link?: string | null;
          tiktok_link?: string | null;
          twitter_link?: string | null;
        };
        Update: {
          dentistry_id?: string;
          dentistry_socials_id?: string;
          facebook_link?: string | null;
          instagram_link?: string | null;
          linkedin_link?: string | null;
          other_link?: string | null;
          tiktok_link?: string | null;
          twitter_link?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "socials_dentistry_id_fkey";
            columns: ["dentistry_id"];
            isOneToOne: true;
            referencedRelation: "dentistries";
            referencedColumns: ["dentistry_id"];
          },
        ];
      };
      treatments: {
        Row: {
          description: string | null;
          isService: boolean | null;
          title: string | null;
          treatment_id: string;
        };
        Insert: {
          description?: string | null;
          isService?: boolean | null;
          title?: string | null;
          treatment_id?: string;
        };
        Update: {
          description?: string | null;
          isService?: boolean | null;
          title?: string | null;
          treatment_id?: string;
        };
        Relationships: [];
      };
      user_device_fingerprints: {
        Row: {
          created_at: string | null;
          fingerprint: string;
          id: number;
          last_seen_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          fingerprint: string;
          id?: number;
          last_seen_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          fingerprint?: string;
          id?: number;
          last_seen_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_device_fingerprints_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_ips: {
        Row: {
          created_at: string | null;
          id: number;
          ip_address: string;
          last_seen_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          ip_address: string;
          last_seen_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          ip_address?: string;
          last_seen_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_ips_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle_enum"];
          birthday: string | null;
          blocked_at: string | null;
          blocked_by: string | null;
          blocked_reason: string | null;
          country: string | null;
          created_at: string;
          current_period_end: string | null;
          customer_id: string | null;
          domain: string | null;
          domain_verification_code: string | null;
          domain_verified: boolean | null;
          email: string;
          first_name: string | null;
          gdc_no: string | null;
          id: string;
          is_blocked: boolean;
          isVerified: boolean | null;
          last_name: string | null;
          middle_name: string | null;
          offer_code: string | null;
          plan_id: string | null;
          position: string | null;
          qualification: string | null;
          registered_domain: string;
          role: string | null;
          session_created_at: string | null;
          session_id: string | null;
          subscription_id: string | null;
          subscription_status: string | null;
          title: string | null;
          trial_end: string | null;
          use_dental_brand: boolean | null;
          username: string;
          veriff_session_url: string | null;
        };
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle_enum"];
          birthday?: string | null;
          blocked_at?: string | null;
          blocked_by?: string | null;
          blocked_reason?: string | null;
          country?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          customer_id?: string | null;
          domain?: string | null;
          domain_verification_code?: string | null;
          domain_verified?: boolean | null;
          email: string;
          first_name?: string | null;
          gdc_no?: string | null;
          id?: string;
          is_blocked?: boolean;
          isVerified?: boolean | null;
          last_name?: string | null;
          middle_name?: string | null;
          offer_code?: string | null;
          plan_id?: string | null;
          position?: string | null;
          qualification?: string | null;
          registered_domain?: string;
          role?: string | null;
          session_created_at?: string | null;
          session_id?: string | null;
          subscription_id?: string | null;
          subscription_status?: string | null;
          title?: string | null;
          trial_end?: string | null;
          use_dental_brand?: boolean | null;
          username: string;
          veriff_session_url?: string | null;
        };
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle_enum"];
          birthday?: string | null;
          blocked_at?: string | null;
          blocked_by?: string | null;
          blocked_reason?: string | null;
          country?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          customer_id?: string | null;
          domain?: string | null;
          domain_verification_code?: string | null;
          domain_verified?: boolean | null;
          email?: string;
          first_name?: string | null;
          gdc_no?: string | null;
          id?: string;
          is_blocked?: boolean;
          isVerified?: boolean | null;
          last_name?: string | null;
          middle_name?: string | null;
          offer_code?: string | null;
          plan_id?: string | null;
          position?: string | null;
          qualification?: string | null;
          registered_domain?: string;
          role?: string | null;
          session_created_at?: string | null;
          session_id?: string | null;
          subscription_id?: string | null;
          subscription_status?: string | null;
          title?: string | null;
          trial_end?: string | null;
          use_dental_brand?: boolean | null;
          username?: string;
          veriff_session_url?: string | null;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          link: string | null;
          rank: number | null;
          title: string | null;
        };
        Insert: {
          enabled?: boolean | null;
          group_id?: number | null;
          id?: number;
          link?: string | null;
          rank?: number | null;
          title?: string | null;
        };
        Update: {
          enabled?: boolean | null;
          group_id?: number | null;
          id?: number;
          link?: string | null;
          rank?: number | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "videos_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_profile_report_note: {
        Args: { p_actor_id: string; p_note: string; p_report_id: string };
        Returns: {
          author_id: string;
          created_at: string;
          id: string;
          note: string;
          report_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "profile_report_notes";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      apply_stripe_subscription_update: {
        Args: { p_input: Json };
        Returns: string;
      };
      begin_subscription_cancellation: {
        Args: { p_input: Json };
        Returns: Json;
      };
      claim_dashboard_media_cleanup: {
        Args: { p_bucket: string; p_user_id: string };
        Returns: {
          bucket: string;
          job_id: string;
          object_path: string;
        }[];
      };
      claim_profile_report_submission: {
        Args: {
          p_limit?: number;
          p_source_hash: string;
          p_window_seconds?: number;
        };
        Returns: boolean;
      };
      claim_referral_entitlement: {
        Args: {
          p_additional_months: number;
          p_is_trial: boolean;
          p_operation_key: string;
          p_provider_period_end: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      claim_registration_completion_step: {
        Args: { p_step: string; p_user_id: string };
        Returns: {
          attempt_count: number;
          completed_at: string | null;
          created_at: string;
          failure_code: string | null;
          provider_reference: string | null;
          started_at: string | null;
          status: string;
          step: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "registration_completion_steps";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_dashboard_media_cleanup: {
        Args: { p_job_ids: string[]; p_user_id: string };
        Returns: undefined;
      };
      create_dashboard_blog: {
        Args: {
          p_content: string;
          p_enabled: boolean;
          p_group_id: number;
          p_image_url: string;
          p_meta_description: string;
          p_meta_title: string;
          p_slug: string;
          p_title: string;
          p_user_id: string;
        };
        Returns: {
          click_counter: number | null;
          content: string;
          created_at: string;
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          image_url: string | null;
          meta_description: string | null;
          meta_title: string | null;
          rank: number | null;
          slug: string;
          title: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "blogs";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dashboard_blog_group: {
        Args: { p_name: string; p_user_id: string };
        Returns: {
          enabled: boolean | null;
          id: number;
          name: string | null;
          rank: number | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "blog_groups";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dashboard_gallery: {
        Args: {
          p_after_image_label: string;
          p_after_image_url: string;
          p_before_image_label: string;
          p_before_image_url: string;
          p_title: string;
          p_user_id: string;
        };
        Returns: {
          after_image_label: string | null;
          after_image_url: string | null;
          before_image_label: string | null;
          before_image_url: string | null;
          created_at: string;
          enabled: boolean | null;
          id: number;
          rank: number | null;
          title: string | null;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "galleries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dashboard_general_gallery: {
        Args: { p_image_url: string; p_title: string; p_user_id: string };
        Returns: {
          created_at: string;
          enabled: boolean | null;
          id: number;
          image_url: string | null;
          rank: number | null;
          title: string | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "general_galleries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dashboard_review: {
        Args: {
          p_content: string;
          p_created_at: string;
          p_image_url: string;
          p_platform: string;
          p_reviewer_name: string;
          p_stars: number;
          p_user_id: string;
        };
        Returns: {
          content: string | null;
          created_at: string | null;
          enabled: boolean | null;
          id: number;
          image_url: string | null;
          platform: string | null;
          rank: number | null;
          reviewer_name: string | null;
          stars: number | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "reviews";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dashboard_video: {
        Args: {
          p_enabled: boolean;
          p_group_id: number;
          p_title: string;
          p_url: string;
          p_user_id: string;
        };
        Returns: {
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          link: string | null;
          rank: number | null;
          title: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "videos";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dashboard_video_group: {
        Args: { p_name: string; p_user_id: string };
        Returns: {
          enabled: boolean | null;
          id: number;
          name: string | null;
          rank: number | null;
          type: string | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "groups";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dentistry_link: {
        Args: {
          p_dentistry_id: string;
          p_group_id: string;
          p_title: string;
          p_url: string;
        };
        Returns: {
          click_counter: number | null;
          is_active: boolean;
          link: string;
          link_id: string;
          rank: number;
          title: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "links";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dentistry_location: {
        Args: {
          p_area: string;
          p_business_name: string;
          p_city: string;
          p_country: string;
          p_dentistry_id: string;
          p_full_address: string;
          p_latitude: number;
          p_longitude: number;
        };
        Returns: {
          area: string | null;
          business_name: string | null;
          city: string | null;
          country: string | null;
          full_address: string | null;
          latitude: number | null;
          location_id: string;
          longitude: number | null;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "locations";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_dentistry_treatment: {
        Args: {
          p_dentistry_id: string;
          p_description: string;
          p_is_service: boolean;
          p_title: string;
        };
        Returns: {
          description: string | null;
          isService: boolean | null;
          title: string | null;
          treatment_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "treatments";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_individual_product: {
        Args: {
          p_currency: string;
          p_enabled: boolean;
          p_image_url: string;
          p_name: string;
          p_platform: string;
          p_price: number;
          p_url: string;
          p_user_id: string;
        };
        Returns: {
          currency: string | null;
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          image_url: string | null;
          link: string | null;
          name: string | null;
          platform: string | null;
          price: number | null;
          rank: number | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "products";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_link_group: {
        Args: { p_dentistry_id: string; p_heading: string };
        Returns: {
          dentistry_id: string;
          heading: string;
          link_group_id: string;
          rank: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "link_groups";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      delete_dashboard_blog: {
        Args: { p_blog_id: number; p_user_id: string };
        Returns: undefined;
      };
      delete_dashboard_blog_group: {
        Args: { p_group_id: number; p_user_id: string };
        Returns: undefined;
      };
      delete_dashboard_gallery: {
        Args: { p_id: number; p_user_id: string };
        Returns: {
          after_image_label: string | null;
          after_image_url: string | null;
          before_image_label: string | null;
          before_image_url: string | null;
          created_at: string;
          enabled: boolean | null;
          id: number;
          rank: number | null;
          title: string | null;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "galleries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      delete_dashboard_general_gallery: {
        Args: { p_id: number; p_user_id: string };
        Returns: {
          created_at: string;
          enabled: boolean | null;
          id: number;
          image_url: string | null;
          rank: number | null;
          title: string | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "general_galleries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      delete_dashboard_review: {
        Args: { p_id: number; p_user_id: string };
        Returns: {
          content: string | null;
          created_at: string | null;
          enabled: boolean | null;
          id: number;
          image_url: string | null;
          platform: string | null;
          rank: number | null;
          reviewer_name: string | null;
          stars: number | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "reviews";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      delete_dashboard_video: {
        Args: { p_user_id: string; p_video_id: number };
        Returns: undefined;
      };
      delete_dashboard_video_group: {
        Args: { p_group_id: number; p_user_id: string };
        Returns: undefined;
      };
      delete_dentistry_link: {
        Args: { p_dentistry_id: string; p_group_id: string; p_link_id: string };
        Returns: undefined;
      };
      delete_dentistry_location: {
        Args: { p_dentistry_id: string; p_location_id: string };
        Returns: undefined;
      };
      delete_dentistry_treatment: {
        Args: { p_dentistry_id: string; p_treatment_id: string };
        Returns: undefined;
      };
      delete_individual_product: {
        Args: { p_product_id: number; p_user_id: string };
        Returns: undefined;
      };
      delete_link_group: {
        Args: { p_dentistry_id: string; p_group_id: string };
        Returns: undefined;
      };
      enqueue_dashboard_media_cleanup: {
        Args: { p_bucket: string; p_object_path: string; p_user_id: string };
        Returns: undefined;
      };
      expire_profile_report_contacts: {
        Args: { p_now?: string };
        Returns: number;
      };
      finish_referral_entitlement: {
        Args: {
          p_operation_key: string;
          p_succeeded: boolean;
          p_user_id: string;
        };
        Returns: Json;
      };
      finish_registration_completion_step: {
        Args: {
          p_failure_code?: string;
          p_provider_reference?: string;
          p_status: string;
          p_step: string;
          p_user_id: string;
        };
        Returns: {
          attempt_count: number;
          completed_at: string | null;
          created_at: string;
          failure_code: string | null;
          provider_reference: string | null;
          started_at: string | null;
          status: string;
          step: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "registration_completion_steps";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      finish_subscription_cancellation: {
        Args: {
          p_outcome: string;
          p_subscription_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      fn_audit_write: {
        Args: {
          p_new: Json;
          p_old: Json;
          p_operation: string;
          p_record_id: string;
          p_table_name: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      get_subscription_authority_for_stripe_customer: {
        Args: { p_customer_id: string };
        Returns: Json;
      };
      get_subscription_authority_for_user: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      increment_click_counter: {
        Args: { id_column?: string; row_id: number; table_name: string };
        Returns: number;
      };
      initialize_registration_completion: {
        Args: {
          p_base_trial_months?: number;
          p_offer_code?: string;
          p_referral_bonus_months?: number;
          p_referrer_user_id?: string;
          p_registered_domain: string;
          p_user_id: string;
        };
        Returns: {
          base_trial_months: number;
          completed_at: string | null;
          created_at: string;
          offer_code: string | null;
          referral_bonus_months: number;
          referrer_user_id: string | null;
          registered_domain: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          total_trial_months: number | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "registration_completions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_dashboard_admin: { Args: never; Returns: boolean };
      mark_registration_completion_complete: {
        Args: { p_user_id: string };
        Returns: {
          base_trial_months: number;
          completed_at: string | null;
          created_at: string;
          offer_code: string | null;
          referral_bonus_months: number;
          referrer_user_id: string | null;
          registered_domain: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          total_trial_months: number | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "registration_completions";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      moderate_profile_report: {
        Args: {
          p_actor_id: string;
          p_assigned_to?: string;
          p_expected_version: number;
          p_outcome?: string;
          p_outcome_reason?: string;
          p_priority: string;
          p_report_id: string;
          p_status: string;
        };
        Returns: {
          assigned_to: string | null;
          category: string;
          created_at: string;
          details: string | null;
          id: string;
          outcome: string | null;
          outcome_reason: string | null;
          priority: string;
          priority_rank: number | null;
          profile_id: string;
          profile_snapshot: Json;
          profile_username: string;
          public_url: string;
          reporter_email: string | null;
          reporter_email_expires_at: string | null;
          resolved_at: string | null;
          severity: string;
          sla_due_at: string;
          status: string;
          submission_fingerprint: string;
          updated_at: string;
          version: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "profile_reports";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      process_stripe_customer_deletion: {
        Args: { p_customer_id: string };
        Returns: string;
      };
      process_stripe_subscription_deletion: {
        Args: { p_customer_id: string; p_subscription_id: string };
        Returns: string;
      };
      purge_profile_audit_log: {
        Args: { p_keep_days?: number };
        Returns: number;
      };
      reorder_dashboard_blog_groups: {
        Args: { p_group_ids: number[]; p_user_id: string };
        Returns: undefined;
      };
      reorder_dashboard_blogs: {
        Args: { p_blog_ids: number[]; p_group_id: number; p_user_id: string };
        Returns: undefined;
      };
      reorder_dashboard_galleries: {
        Args: { p_ids: number[]; p_user_id: string };
        Returns: undefined;
      };
      reorder_dashboard_general_galleries: {
        Args: { p_ids: number[]; p_user_id: string };
        Returns: undefined;
      };
      reorder_dashboard_reviews: {
        Args: { p_ids: number[]; p_user_id: string };
        Returns: undefined;
      };
      reorder_dashboard_video_groups: {
        Args: { p_group_ids: number[]; p_user_id: string };
        Returns: undefined;
      };
      reorder_dashboard_videos: {
        Args: { p_group_id: number; p_user_id: string; p_video_ids: number[] };
        Returns: undefined;
      };
      reorder_dentistry_links: {
        Args: {
          p_dentistry_id: string;
          p_group_id: string;
          p_link_ids: string[];
        };
        Returns: undefined;
      };
      reorder_dentistry_treatments: {
        Args: { p_dentistry_id: string; p_treatment_ids: string[] };
        Returns: undefined;
      };
      reorder_individual_products: {
        Args: { p_product_ids: number[]; p_user_id: string };
        Returns: undefined;
      };
      reorder_link_groups: {
        Args: { p_dentistry_id: string; p_group_ids: string[] };
        Returns: undefined;
      };
      save_dashboard_external_review_page: {
        Args: { p_link: string; p_user_id: string };
        Returns: {
          id: number;
          link: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "external_review_pages";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      save_dashboard_profile: {
        Args: {
          p_about_text: string;
          p_about_title: string;
          p_booking_enabled: boolean;
          p_booking_link: string;
          p_contact_email: string;
          p_dentistry_id: string;
          p_gdc_no: string;
          p_phone: string;
          p_position: string;
          p_qualification: string;
          p_title: string;
          p_user_id: string;
          p_website: string;
        };
        Returns: undefined;
      };
      save_dashboard_socials: {
        Args: {
          p_dentistry_id: string;
          p_facebook: string;
          p_instagram: string;
          p_linkedin: string;
          p_other: string;
          p_tiktok: string;
          p_twitter: string;
        };
        Returns: {
          dentistry_id: string;
          dentistry_socials_id: string;
          facebook_link: string | null;
          instagram_link: string | null;
          linkedin_link: string | null;
          other_link: string | null;
          tiktok_link: string | null;
          twitter_link: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "socials";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      save_dentistry_location_title: {
        Args: { p_dentistry_id: string; p_title: string };
        Returns: string;
      };
      submit_profile_report: {
        Args: {
          p_category: string;
          p_details: string;
          p_profile_id: string;
          p_public_url: string;
          p_reporter_email: string;
          p_submission_fingerprint: string;
        };
        Returns: {
          created: boolean;
          report_id: string;
        }[];
      };
      update_dashboard_blog: {
        Args: {
          p_blog_id: number;
          p_content: string;
          p_enabled: boolean;
          p_image_url: string;
          p_meta_description: string;
          p_meta_title: string;
          p_slug: string;
          p_title: string;
          p_user_id: string;
        };
        Returns: {
          click_counter: number | null;
          content: string;
          created_at: string;
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          image_url: string | null;
          meta_description: string | null;
          meta_title: string | null;
          rank: number | null;
          slug: string;
          title: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "blogs";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dashboard_blog_group: {
        Args: {
          p_enabled: boolean;
          p_group_id: number;
          p_name: string;
          p_user_id: string;
        };
        Returns: {
          enabled: boolean | null;
          id: number;
          name: string | null;
          rank: number | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "blog_groups";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dashboard_gallery: {
        Args: {
          p_after_image_label: string;
          p_after_image_url: string;
          p_before_image_label: string;
          p_before_image_url: string;
          p_enabled: boolean;
          p_id: number;
          p_title: string;
          p_user_id: string;
        };
        Returns: {
          after_image_label: string | null;
          after_image_url: string | null;
          before_image_label: string | null;
          before_image_url: string | null;
          created_at: string;
          enabled: boolean | null;
          id: number;
          rank: number | null;
          title: string | null;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "galleries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dashboard_general_gallery: {
        Args: {
          p_enabled: boolean;
          p_id: number;
          p_image_url: string;
          p_title: string;
          p_user_id: string;
        };
        Returns: {
          created_at: string;
          enabled: boolean | null;
          id: number;
          image_url: string | null;
          rank: number | null;
          title: string | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "general_galleries";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dashboard_review: {
        Args: {
          p_content: string;
          p_created_at: string;
          p_enabled: boolean;
          p_id: number;
          p_image_url: string;
          p_platform: string;
          p_reviewer_name: string;
          p_stars: number;
          p_user_id: string;
        };
        Returns: {
          content: string | null;
          created_at: string | null;
          enabled: boolean | null;
          id: number;
          image_url: string | null;
          platform: string | null;
          rank: number | null;
          reviewer_name: string | null;
          stars: number | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "reviews";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dashboard_video: {
        Args: {
          p_enabled: boolean;
          p_title: string;
          p_url: string;
          p_user_id: string;
          p_video_id: number;
        };
        Returns: {
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          link: string | null;
          rank: number | null;
          title: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "videos";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dashboard_video_group: {
        Args: {
          p_enabled: boolean;
          p_group_id: number;
          p_name: string;
          p_user_id: string;
        };
        Returns: {
          enabled: boolean | null;
          id: number;
          name: string | null;
          rank: number | null;
          type: string | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "groups";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dentistry_link: {
        Args: {
          p_dentistry_id: string;
          p_group_id: string;
          p_is_active: boolean;
          p_link_id: string;
          p_title: string;
          p_url: string;
        };
        Returns: {
          click_counter: number | null;
          is_active: boolean;
          link: string;
          link_id: string;
          rank: number;
          title: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "links";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dentistry_location: {
        Args: {
          p_area: string;
          p_business_name: string;
          p_city: string;
          p_country: string;
          p_dentistry_id: string;
          p_expected_updated_at: string;
          p_full_address: string;
          p_latitude: number;
          p_location_id: string;
          p_longitude: number;
        };
        Returns: {
          area: string | null;
          business_name: string | null;
          city: string | null;
          country: string | null;
          full_address: string | null;
          latitude: number | null;
          location_id: string;
          longitude: number | null;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "locations";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_dentistry_treatment: {
        Args: {
          p_dentistry_id: string;
          p_description: string;
          p_title: string;
          p_treatment_id: string;
        };
        Returns: {
          description: string | null;
          isService: boolean | null;
          title: string | null;
          treatment_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "treatments";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_individual_product: {
        Args: {
          p_currency: string;
          p_enabled: boolean;
          p_image_url: string;
          p_name: string;
          p_platform: string;
          p_price: number;
          p_product_id: number;
          p_url: string;
          p_user_id: string;
        };
        Returns: {
          currency: string | null;
          enabled: boolean | null;
          group_id: number | null;
          id: number;
          image_url: string | null;
          link: string | null;
          name: string | null;
          platform: string | null;
          price: number | null;
          rank: number | null;
          user_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "products";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      update_link_group: {
        Args: { p_dentistry_id: string; p_group_id: string; p_heading: string };
        Returns: {
          dentistry_id: string;
          heading: string;
          link_group_id: string;
          rank: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "link_groups";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      billing_cycle_enum: "monthly" | "annually";
      subscription_status: "FREE" | "PRO" | "PREMIUM PRO";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_cycle_enum: ["monthly", "annually"],
      subscription_status: ["FREE", "PRO", "PREMIUM PRO"],
    },
  },
} as const;
