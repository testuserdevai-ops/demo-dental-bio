-- Atomic increment function for click counters to prevent race conditions
CREATE OR REPLACE FUNCTION public.increment_click_counter(
  table_name text,
  row_id bigint,
  id_column text DEFAULT 'id'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  -- Only allow specific tables
  IF table_name NOT IN ('blogs', 'links') THEN
    RAISE EXCEPTION 'Invalid table name: %', table_name;
  END IF;

  IF table_name = 'blogs' THEN
    UPDATE public.blogs
    SET click_counter = COALESCE(click_counter, 0) + 1
    WHERE id = row_id
    RETURNING click_counter INTO new_count;
  ELSIF table_name = 'links' THEN
    UPDATE public.links
    SET click_counter = COALESCE(click_counter, 0) + 1
    WHERE link_id = row_id
    RETURNING click_counter INTO new_count;
  END IF;

  RETURN new_count;
END;
$$;
