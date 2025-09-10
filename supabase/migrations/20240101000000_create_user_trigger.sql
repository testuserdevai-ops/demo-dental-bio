-- Function to handle user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user data into public.users table
  INSERT INTO public.users (
    id,
    username,
    email,
    first_name,
    last_name,
    title,
    birthday,
    offer_code,
    country,
    position,
    subscription_status,
    trial_end,
    inviteUserName,
    location,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'title',
    (NEW.raw_user_meta_data->>'birthday')::date,
    NEW.raw_user_meta_data->>'offer_code',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'position',
    COALESCE(NEW.raw_user_meta_data->>'subscription_status', 'PRO'),
    (NEW.raw_user_meta_data->>'trial_end')::timestamp with time zone,
    NEW.raw_user_meta_data->>'inviteUserName',
    NEW.raw_user_meta_data->>'location',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated; 