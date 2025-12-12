import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

export function usePosts(mode: 'global' | 'following' = 'global') {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    
    let query = supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        image_url,
        created_at,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (mode === 'following' && user) {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      const followingIds = followingData?.map(f => f.following_id) || [];
      
      if (followingIds.length > 0) {
        query = query.in('user_id', followingIds);
      } else {
        setPosts([]);
        setLoading(false);
        return;
      }
    }

    const { data: postsData, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      setLoading(false);
      return;
    }

    // Get likes and comments counts
    const postIds = postsData?.map(p => p.id) || [];
    
    const [likesResult, commentsResult, userLikesResult] = await Promise.all([
      supabase
        .from('likes')
        .select('post_id')
        .in('post_id', postIds),
      supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds),
      user
        ? supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds)
        : Promise.resolve({ data: [] }),
    ]);

    const likesCount = new Map<string, number>();
    const commentsCount = new Map<string, number>();
    const userLikedPosts = new Set(userLikesResult.data?.map(l => l.post_id) || []);

    likesResult.data?.forEach(like => {
      likesCount.set(like.post_id, (likesCount.get(like.post_id) || 0) + 1);
    });

    commentsResult.data?.forEach(comment => {
      commentsCount.set(comment.post_id, (commentsCount.get(comment.post_id) || 0) + 1);
    });

    const enrichedPosts: Post[] = (postsData || []).map(post => ({
      id: post.id,
      user_id: post.user_id,
      content: post.content,
      image_url: post.image_url,
      created_at: post.created_at,
      profiles: post.profiles as Post['profiles'],
      likes_count: likesCount.get(post.id) || 0,
      comments_count: commentsCount.get(post.id) || 0,
      user_has_liked: userLikedPosts.has(post.id),
    }));

    setPosts(enrichedPosts);
    setLoading(false);
  }, [mode, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => {
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  const createPost = async (content: string, imageUrl?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content,
        image_url: imageUrl || null,
      });

    if (!error) {
      fetchPosts();
    }

    return { error };
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }

    return { error };
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          user_has_liked: !p.user_has_liked,
          likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1,
        };
      }
      return p;
    }));

    if (post.user_has_liked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: user.id });
    }
  };

  return { posts, loading, createPost, deletePost, toggleLike, refetch: fetchPosts };
}
