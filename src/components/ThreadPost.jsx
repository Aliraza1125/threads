import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Share2, BookmarkPlus, Flag, MessageSquare, Heart, User } from 'lucide-react';

// Utility function to get proxied image URL
const getProxiedImageUrl = (originalUrl) => {
  if (!originalUrl) return '';
  const encodedUrl = encodeURIComponent(originalUrl);
  return `/api/proxy/image?url=${encodedUrl}`;
};

const ProfileImage = ({ user }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  if (!user.profile_pic_url || imageError) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
        <User className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  const proxiedImageUrl = getProxiedImageUrl(user.profile_pic_url);

  return (
    <div className="relative w-10 h-10">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse" />
      )}
      <img
        src={proxiedImageUrl}
        alt={user.username}
        className={`w-10 h-10 rounded-full hover:opacity-90 transition-opacity object-cover ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
        loading="lazy"
      />
    </div>
  );
};

// Render text with link handling
const RenderText = ({ text }) => {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  const hashtagRegex = /#[\w]+/g;
  const mentionRegex = /@[\w.]+/g;

  let parts = text.split(/(\s+|(?=https?:\/\/)|(?=[#@]))/);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    if (part.match(hashtagRegex)) {
      return (
        <a
          key={index}
          href={`/hashtag/${part.slice(1)}`}
          className="text-blue-500 hover:underline"
        >
          {part}
        </a>
      );
    }
    if (part.match(mentionRegex)) {
      const username = part.slice(1);
      return (
        <a
          key={index}
          href={`/profile/${username}`}
          className="text-blue-500 hover:underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const ThreadPost = ({ post }) => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLocalLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.user?.username || 'Unknown User'}`,
          text: post.content || '',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
        setIsAlertOpen(true);
      }
    } else {
      setIsAlertOpen(true);
    }
  };

  if (!post || !post.user) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <a href={`/profile/${post.user.username}`} className="flex-shrink-0">
          <ProfileImage user={post.user} />
        </a>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <a href={`/profile/${post.user.username}`} className="hover:underline">
              <span className="font-medium truncate">
                {post.user.username}
              </span>
            </a>
            {post.user.is_verified && (
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
            <span className="text-gray-500">·</span>
            <time className="text-gray-500 hover:underline" title={new Date(post.taken_at * 1000).toLocaleString()}>
              {formatDistanceToNow(new Date(post.taken_at * 1000))} ago
            </time>
          </div>
          <div className="mt-2">
            <p className="text-gray-900 whitespace-pre-wrap break-words">
              <RenderText text={post.content} />
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-gray-500 border-t pt-3">
        <button 
          className={`flex items-center space-x-2 transition-colors ${
            isLiked ? 'text-red-500' : 'hover:text-red-500'
          }`}
          onClick={handleLike}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} />
          <span>{localLikeCount}</span>
        </button>

        {post.has_replies && (
          <button 
            className="flex items-center space-x-2 hover:text-blue-500 transition-colors"
            aria-label="Reply"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}

        <button 
          className={`flex items-center space-x-2 transition-colors ${
            isBookmarked ? 'text-yellow-500' : 'hover:text-yellow-500'
          }`}
          onClick={handleBookmark}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <BookmarkPlus className="w-5 h-5" />
        </button>

        <button 
          className="flex items-center space-x-2 hover:text-blue-500 transition-colors"
          onClick={handleShare}
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>

        <button 
          className="flex items-center space-x-2 hover:text-red-500 transition-colors"
          aria-label="Report"
        >
          <Flag className="w-5 h-5" />
        </button>
      </div>

      {isAlertOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Share Post</h2>
            <p className="text-gray-600 mb-2">Copy this link to share the post:</p>
            <input 
              type="text" 
              value={window.location.href}
              readOnly
              className="w-full p-2 border rounded bg-gray-50 mb-2"
              onClick={e => e.target.select()}
            />
            <button 
              onClick={() => setIsAlertOpen(false)}
              className="mt-4 w-full bg-gray-900 text-white rounded-md py-2 hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreadPost;