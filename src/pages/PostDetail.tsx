import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { PostCard } from '@/components/PostCard';
import { CommentSection } from '@/components/CommentSection';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import type { Post } from '@/hooks/usePosts';

export function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      setLoading(true);

      const { data: postData, error } = await supabase
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
        .eq('id', id)
        .single();

      if (error || !postData) {
        if (import.meta.env.DEV) {
          console.error('Error fetching post:', error);
        }
        setLoading(false);
        return;
      }

      // Get likes and comments counts
      const [likesResult, commentsResult, userLikeResult] = await Promise.all([
        supabase
          .from('likes')
          .select('id', { count: 'exact' })
          .eq('post_id', id),
        supabase
          .from('comments')
          .select('id', { count: 'exact' })
          .eq('post_id', id),
        user
          ? supabase
              .from('likes')
              .select('id')
              .eq('post_id', id)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ]);

      setPost({
        id: postData.id,
        user_id: postData.user_id,
        content: postData.content,
        image_url: postData.image_url,
        created_at: postData.created_at,
        profiles: postData.profiles as Post['profiles'],
        likes_count: likesResult.count || 0,
        comments_count: commentsResult.count || 0,
        user_has_liked: (userLikeResult.data?.length || 0) > 0,
      });

      setLoading(false);
    };

    fetchPost();
  }, [id, user]);

  const handleLike = async (postId: string) => {
    if (!user || !post) return;

    // Optimistic update
    setPost(prev => prev ? {
      ...prev,
      user_has_liked: !prev.user_has_liked,
      likes_count: prev.user_has_liked ? prev.likes_count - 1 : prev.likes_count + 1,
    } : null);

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
        navigate('/');
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : post ? (
          <div className="space-y-6">
            <PostCard
              post={post}
              onLike={handleLike}
              onDelete={handleDelete}
              showFullContent
            />

            <div className="bg-card rounded-xl p-4 sm:p-6 shadow-soft">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                Comments
              </h2>
              <CommentSection postId={post.id} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl shadow-soft">
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">
              Post not found
            </h2>
            <p className="text-muted-foreground mb-4">
              This post may have been deleted
            </p>
            <Link to="/">
              <Button variant="default">
                Go Home
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
