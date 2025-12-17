-- Create brands table for domain-specific configurations
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  brand_name TEXT NOT NULL,
  logo_path TEXT NOT NULL,
  email_from TEXT NOT NULL,
  base_url TEXT NOT NULL,
  tagline TEXT,
  ga_tracking_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brands_domain ON public.brands(domain);
CREATE INDEX IF NOT EXISTS idx_brands_active ON public.brands(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Brands are viewable by everyone"
  ON public.brands
  FOR SELECT
  USING (true);

-- Authenticated users can manage brands
CREATE POLICY "Authenticated users can manage brands"
  ON public.brands
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Insert fallback brand
INSERT INTO public.brands (domain, brand_name, logo_path, email_from, base_url, tagline, is_active)
VALUES (
  'biocloud',
  'Biocloud',
  '/logo.svg',
  'Biocloud',
  'https://biocloud.com',
  'Your professional identity, simplified.',
  true
)
ON CONFLICT (domain) DO NOTHING;

-- Insert all current domains
INSERT INTO public.brands (domain, brand_name, logo_path, email_from, base_url, tagline, ga_tracking_id, is_active)
VALUES
  (
    'coach.bio',
    'Coach.bio',
    '/logos/coachbio.svg',
    'Coach.bio',
    'https://coach.bio',
    'Your coaching identity, simplified.',
    NULL,
    true
  ),
  (
    'dental.bio',
    'Dental.bio',
    '/logos/dentalbio.svg',
    'Dental.bio',
    'https://dental.bio',
    'Your dental identity, simplified.',
    'G-987STTWJ02',
    true
  ),
  (
    'doctors.bio',
    'Doctors.bio',
    '/logos/doctorsbio.svg',
    'Doctors.bio',
    'https://doctors.bio',
    'Your medical identity, simplified.',
    NULL,
    true
  ),
  (
    'injector.bio',
    'Injector.bio',
    '/logos/injectorbio.svg',
    'Injector.bio',
    'https://injector.bio',
    'Your aesthetic identity, simplified.',
    NULL,
    true
  ),
  (
    'pharmacists.bio',
    'Pharmacists.bio',
    '/logos/pharmacistsbio.svg',
    'Pharmacists.bio',
    'https://pharmacists.bio',
    'Your pharmacy identity, simplified.',
    NULL,
    true
  ),
  (
    'podcasts.bio',
    'Podcasts.bio',
    '/logos/podcastsbio.svg',
    'Podcasts.bio',
    'https://podcasts.bio',
    'Your podcast identity, simplified.',
    NULL,
    true
  ),
  (
    'specialist.bio',
    'Specialist.bio',
    '/logos/specialistbio.svg',
    'Specialist.bio',
    'https://specialist.bio',
    'Your specialist identity, simplified.',
    NULL,
    true
  ),
  (
    'therapists.bio',
    'Therapists.bio',
    '/logos/therapistsbio.svg',
    'Therapists.bio',
    'https://therapists.bio',
    'Your therapy identity, simplified.',
    NULL,
    true
  )
ON CONFLICT (domain) DO NOTHING;

-- updated_at helper function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
