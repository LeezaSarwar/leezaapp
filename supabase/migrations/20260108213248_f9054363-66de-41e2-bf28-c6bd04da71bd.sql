-- Drop and recreate handle_new_user function with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
  v_display_name text;
  v_avatar_url text;
BEGIN
  -- Extract and validate username (max 20 chars, alphanumeric and underscores only)
  v_username := COALESCE(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8));
  IF length(v_username) > 20 THEN
    v_username := substr(v_username, 1, 20);
  END IF;
  -- Remove any characters that aren't alphanumeric or underscore
  v_username := regexp_replace(v_username, '[^a-zA-Z0-9_]', '', 'g');
  IF v_username = '' THEN
    v_username := 'user_' || substr(new.id::text, 1, 8);
  END IF;

  -- Extract and validate display_name (max 50 chars)
  v_display_name := COALESCE(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username', 'New User');
  IF length(v_display_name) > 50 THEN
    v_display_name := substr(v_display_name, 1, 50);
  END IF;

  -- Extract and validate avatar_url (must be http/https, max 500 chars)
  v_avatar_url := new.raw_user_meta_data ->> 'avatar_url';
  IF v_avatar_url IS NOT NULL THEN
    IF length(v_avatar_url) > 500 THEN
      v_avatar_url := NULL;
    ELSIF NOT (v_avatar_url ~ '^https?://') THEN
      v_avatar_url := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    new.id,
    v_username,
    v_display_name,
    v_avatar_url
  );
  RETURN new;
END;
$function$;