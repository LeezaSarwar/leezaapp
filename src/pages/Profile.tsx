import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { PostCard } from '@/components/PostCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import type { Post } from '@/hooks/usePosts';

export function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile, loading, toggleFollow } = useProfile(id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (!id) return;

    const fetchPosts = async () => {
      setPostsLoading(true);

      const { data: postsData, error } = await supabase
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
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching posts:', error);
        }
        setPostsLoading(false);
        return;
      }

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
      setPostsLoading(false);
    };

    fetchPosts();
  }, [id, user]);

  const handleLike = async (postId: string) => {
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

  const handleDelete = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        toast.error('Failed to delete post');
      } else {
        toast.success('Post deleted');
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    }
  };

  const handleFollow = async () => {
    await toggleFollow();
    toast.success(profile?.is_following ? 'Unfollowed' : 'Followed');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12 bg-card rounded-xl shadow-soft">
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            User not found
          </h2>
          <p className="text-muted-foreground mb-4">
            This user doesn't exist
          </p>
          <Link to="/">
            <Button variant="default">
              Go Home
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="bg-card rounded-xl p-6 shadow-soft mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-background">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {profile.display_name?.[0] || profile.username[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {profile.display_name || profile.username}
                  </h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>

                {isOwnProfile ? (
                  <Link to="/edit-profile">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                ) : user && (
                  <Button 
                    variant={profile.is_following ? 'outline' : 'default'}
                    size="sm"
                    onClick={handleFollow}
                  >
                    {profile.is_following ? 'Unfollow' : 'Follow'}
                  </Button>
                )}
              </div>

              {profile.bio && (
                <p className="text-foreground mt-3">{profile.bio}</p>
              )}

              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4">
                <div>
                  <span className="font-semibold text-foreground">{profile.following_count}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">{profile.followers_count}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Posts ({profile.posts_count})
        </h2>

        {postsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl shadow-soft">
            <p className="text-muted-foreground">
              {isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}
            </p>
            {isOwnProfile && (
              <Link to="/create" className="mt-4 inline-block">
                <Button variant="default">
                  Create your first post
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onDelete={isOwnProfile ? handleDelete : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
