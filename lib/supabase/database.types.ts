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
          link_group_id: string | null;
          link_id: string | null;
        };
        Insert: {
          dentistry_links_id?: string;
          link_group_id?: string | null;
          link_id?: string | null;
        };
        Update: {
          dentistry_links_id?: string;
          link_group_id?: string | null;
          link_id?: string | null;
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
            isOneToOne: false;
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
          dentistry_id: string | null;
          dentistry_treatment_id: string;
          rank: number | null;
          treatment_id: string | null;
        };
        Insert: {
          dentistry_id?: string | null;
          dentistry_treatment_id?: string;
          rank?: number | null;
          treatment_id?: string | null;
        };
        Update: {
          dentistry_id?: string | null;
          dentistry_treatment_id?: string;
          rank?: number | null;
          treatment_id?: string | null;
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
            isOneToOne: false;
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
            isOneToOne: false;
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
          dentistry_id: string | null;
          heading: string | null;
          link_group_id: string;
          rank: number | null;
        };
        Insert: {
          dentistry_id?: string | null;
          heading?: string | null;
          link_group_id?: string;
          rank?: number | null;
        };
        Update: {
          dentistry_id?: string | null;
          heading?: string | null;
          link_group_id?: string;
          rank?: number | null;
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
          is_active: boolean | null;
          link: string | null;
          link_id: string;
          rank: number | null;
          title: string | null;
        };
        Insert: {
          click_counter?: number | null;
          is_active?: boolean | null;
          link?: string | null;
          link_id?: string;
          rank?: number | null;
          title?: string | null;
        };
        Update: {
          click_counter?: number | null;
          is_active?: boolean | null;
          link?: string | null;
          link_id?: string;
          rank?: number | null;
          title?: string | null;
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
          other_link: string | null;
          tiktok_link: string | null;
          twitter_link: string | null;
        };
        Insert: {
          dentistry_id: string;
          dentistry_socials_id?: string;
          facebook_link?: string | null;
          instagram_link?: string | null;
          other_link?: string | null;
          tiktok_link?: string | null;
          twitter_link?: string | null;
        };
        Update: {
          dentistry_id?: string;
          dentistry_socials_id?: string;
          facebook_link?: string | null;
          instagram_link?: string | null;
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
      apply_stripe_subscription_update: {
        Args: { p_input: Json };
        Returns: string;
      };
      begin_subscription_cancellation: {
        Args: { p_input: Json };
        Returns: Json;
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
