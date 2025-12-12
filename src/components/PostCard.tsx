import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/hooks/usePosts';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
  showFullContent?: boolean;
}

export function PostCard({ post, onLike, onDelete, showFullContent = false }: PostCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === post.user_id;

  return (
    <article className="bg-card rounded-xl p-4 sm:p-6 shadow-soft hover:shadow-hover transition-all duration-300 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Link 
          to={`/profile/${post.user_id}`}
          className="flex items-center gap-3 group"
        >
          <Avatar className="h-10 w-10 ring-2 ring-background group-hover:ring-primary/20 transition-all">
            <AvatarImage src={post.profiles.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {post.profiles.display_name?.[0] || post.profiles.username[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
              {post.profiles.display_name || post.profiles.username}
            </p>
            <p className="text-sm text-muted-foreground">
              @{post.profiles.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </Link>

        {isOwner && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(post.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <Link to={`/post/${post.id}`} className="block mt-4">
        <p className={cn(
          "text-foreground leading-relaxed",
          !showFullContent && "line-clamp-4"
        )}>
          {post.content}
        </p>

        {post.image_url && (
          <div className="mt-4 rounded-lg overflow-hidden">
            <img
              src={post.image_url}
              alt="Post image"
              className="w-full h-auto max-h-96 object-cover"
              loading="lazy"
            />
          </div>
        )}
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
        <button
          onClick={() => onLike(post.id)}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-all",
            post.user_has_liked 
              ? "text-accent" 
              : "text-muted-foreground hover:text-accent"
          )}
          disabled={!user}
        >
          <Heart 
            className={cn(
              "h-5 w-5 transition-transform",
              post.user_has_liked && "fill-current animate-heart"
            )} 
          />
          <span>{post.likes_count}</span>
        </button>

        <Link
          to={`/post/${post.id}`}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{post.comments_count}</span>
        </Link>
      </div>
    </article>
  );
}
