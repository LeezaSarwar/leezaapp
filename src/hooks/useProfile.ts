import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
}

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching profile:', error);
      }
      setLoading(false);
      return;
    }

    // Get counts
    const [followersResult, followingResult, postsResult, isFollowingResult] = await Promise.all([
      supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId),
      supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId),
      supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      user && user.id !== userId
        ? supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
        : Promise.resolve({ data: [] }),
    ]);

    setProfile({
      ...profileData,
      followers_count: followersResult.count || 0,
      following_count: followingResult.count || 0,
      posts_count: postsResult.count || 0,
      is_following: (isFollowingResult.data?.length || 0) > 0,
    });

    setLoading(false);
  }, [userId, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (data: {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);

    if (!error) {
      fetchProfile();
    }

    return { error };
  };

  const toggleFollow = async () => {
    if (!user || !userId || user.id === userId) return;

    const wasFollowing = profile?.is_following;

    // Optimistic update
    setProfile(prev => prev ? {
      ...prev,
      is_following: !prev.is_following,
      followers_count: prev.is_following ? prev.followers_count - 1 : prev.followers_count + 1,
    } : null);

    if (wasFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });
    }
  };

  return { profile, loading, updateProfile, toggleFollow, refetch: fetchProfile };
}
