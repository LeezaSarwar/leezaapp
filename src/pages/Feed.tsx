import React from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { PostCard } from '@/components/PostCard';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface FeedProps {
  mode: 'global' | 'following';
}

export function Feed({ mode }: FeedProps) {
  const { posts, loading, toggleLike, deletePost } = usePosts(mode);
  const { user } = useAuth();

  const handleDelete = async (postId: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      const { error } = await deletePost(postId);
      if (error) {
        toast.error('Failed to delete post');
      } else {
        toast.success('Post deleted');
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {mode === 'global' ? 'Explore' : 'Home'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === 'global' 
              ? 'Discover what people are sharing' 
              : 'Posts from people you follow'}
          </p>
        </div>

        {/* Feed Tabs for logged in users */}
        {user && (
          <div className="flex gap-2 mb-6 p-1 bg-secondary rounded-lg">
            <Link to="/" className="flex-1">
              <Button 
                variant={mode === 'global' ? 'default' : 'ghost'} 
                className="w-full"
              >
                Explore
              </Button>
            </Link>
            <Link to="/home" className="flex-1">
              <Button 
                variant={mode === 'following' ? 'default' : 'ghost'} 
                className="w-full"
              >
                Following
              </Button>
            </Link>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl shadow-soft">
            {mode === 'following' ? (
              <>
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                  No posts yet
                </h2>
                <p className="text-muted-foreground mb-4">
                  Follow some people to see their posts here
                </p>
                <Link to="/">
                  <Button variant="default">
                    Explore Posts
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                  No posts yet
                </h2>
                <p className="text-muted-foreground mb-4">
                  Be the first to share something!
                </p>
                {user ? (
                  <Link to="/create">
                    <Button variant="default">
                      Create Post
                    </Button>
                  </Link>
                ) : (
                  <Link to="/signup">
                    <Button variant="default">
                      Join Social Spark
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={toggleLike}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
