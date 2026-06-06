-- Marketing email suppression list.
-- Keyed by email so it works for CSV-imported contacts that may not be
-- registered users. Once an email is here, marketing sends must skip it.
CREATE TABLE IF NOT EXISTS "public"."marketing_unsubscribes" (
    "email" character varying(255) NOT NULL,
    "unsubscribed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" character varying(50) DEFAULT 'link'::character varying,
    CONSTRAINT "marketing_unsubscribes_pkey" PRIMARY KEY ("email")
);

ALTER TABLE "public"."marketing_unsubscribes" OWNER TO "postgres";

-- RLS on, with no public policies: only the service role (used by the
-- unsubscribe endpoint and the campaign sender) can read/write this table.
ALTER TABLE "public"."marketing_unsubscribes" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."marketing_unsubscribes" TO "service_role";
