-- Create function to validate URLs (http/https only)
CREATE OR REPLACE FUNCTION public.is_valid_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN true;
  END IF;
  RETURN url ~ '^https?://';
END;
$$;

-- Add check constraints for URL validation on posts and profiles
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_image_url_valid;
ALTER TABLE public.posts ADD CONSTRAINT posts_image_url_valid 
  CHECK (public.is_valid_url(image_url));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_url_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_url_valid 
  CHECK (public.is_valid_url(avatar_url));