import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Send,
  User
} from 'lucide-react';

// Utility function for proxying image URLs
const getProxiedImageUrl = (originalUrl) => {
  if (!originalUrl) return '';
  const encodedUrl = encodeURIComponent(originalUrl);
  return `/api/proxy/image?url=${encodedUrl}`;
};

// Currency configuration
const CURRENCY_CONFIG = {
  Bitcoin: {
    name: "Bitcoin",
    symbol: "BTC",
    logo: "https://cdn.coinranking.com/bOabBYkcX/bitcoin_btc.svg",
    color: "bg-orange-500"
  },
  XRP: {
    name: "XRP",
    symbol: "XRP",
    logo: "https://cryptologos.cc/logos/xrp-xrp-logo.svg",
    color: "bg-blue-500"
  },
  Dogecoin: {
    name: "Dogecoin",
    symbol: "DOGE",
    logo: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg",
    color: "bg-yellow-500"
  }
};

// Media Content Component
const MediaContent = ({ post, isDark }) => {
  if (!post) return null;

  const renderImage = (imageVersion) => {
    if (!imageVersion?.url) return null;
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    if (imageError) return null;

    return (
      <div className="relative">
        {isLoading && (
          <div className={`absolute inset-0 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse`} />
        )}
        <img
          src={getProxiedImageUrl(imageVersion.url)}
          alt={post.accessibility_caption || "Post media"}
          className={`w-full rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={{
            aspectRatio: `${imageVersion.width}/${imageVersion.height}`
          }}
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

  const renderVideo = (videoVersion) => {
    if (!videoVersion?.url) return null;
    return (
      <video
        controls
        className="w-full rounded-lg"
        poster={post.image_versions?.[0]?.url ? getProxiedImageUrl(post.image_versions[0].url) : undefined}
      >
        <source src={getProxiedImageUrl(videoVersion.url)} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  };

  const renderCarousel = (carouselMedia) => {
    if (!carouselMedia?.length) return null;
    return (
      <div className="space-y-2">
        {carouselMedia.map((media, index) => (
          <div key={index}>
            {media.media_type === 2 && media.video_versions?.[0] && 
              renderVideo(media.video_versions[0])}
            {media.media_type === 1 && media.image_versions2?.candidates?.[0] && 
              renderImage(media.image_versions2.candidates[0])}
          </div>
        ))}
      </div>
    );
  };

  if (post.carousel_media?.length > 0) {
    return renderCarousel(post.carousel_media);
  } else if (post.media_type === 2 && post.video_versions?.[0]) {
    return renderVideo(post.video_versions[0]);
  } else if (post.image_versions?.[0]) {
    return renderImage(post.image_versions[0]);
  }

  return null;
};

// Profile Image Component
const ProfileImage = ({ user, isDark }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  if (!user.profile_pic_url || imageError) {
    return (
      <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center`}>
        <User className={`w-6 h-6 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
      </div>
    );
  }

  const proxiedImageUrl = getProxiedImageUrl(user.profile_pic_url);

  return (
    <div className="relative w-10 h-10">
      {isLoading && (
        <div className={`absolute inset-0 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} rounded-full animate-pulse`} />
      )}
      <img
        src={proxiedImageUrl}
        alt={user.username}
        className={`w-10 h-10 rounded-full hover:opacity-90 transition-opacity object-cover ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${isDark ? 'border-gray-800' : 'border-white'} border-2`}
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

// Text Rendering Component
const RenderText = ({ text, isDark }) => {
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
          className={`${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline break-all`}
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
          className={`${isDark ? 'text-blue-400' : 'text-blue-500'} hover:underline`}
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
          className={`${isDark ? 'text-blue-400' : 'text-blue-500'} hover:underline`}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Format time ago function
const formatTimeAgo = (timestamp) => {
  const timeAgo = formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: false });
  return timeAgo
    .replace('about ', '')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' days', 'd')
    .replace(' day', 'd')
    .replace(' months', 'mo')
    .replace(' month', 'mo')
    .replace(' years', 'y')
    .replace(' year', 'y');
};

// Get currency info function
const getCurrencyInfo = (postText) => {
  if (!postText) return null;
  const currencies = Object.keys(CURRENCY_CONFIG);
  const foundCurrency = currencies.find(currency =>
    postText.toLowerCase().includes(currency.toLowerCase())
  );
  return foundCurrency ? CURRENCY_CONFIG[foundCurrency] : null;
};

// Main ThreadPost Component
const ThreadPost = ({ post, isDark = false }) => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(post.has_liked || false);
  const [isReposted, setIsReposted] = useState(post.text_post_app_info?.is_reposted_by_viewer || false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);
  const [localRepostCount, setLocalRepostCount] = useState(
    post.text_post_app_info?.repost_count || 0
  );

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLocalLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleRepost = () => {
    setIsReposted(!isReposted);
    setLocalRepostCount(prev => isReposted ? prev - 1 : prev + 1);
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
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          setIsAlertOpen(true);
        }
      }
    } else {
      setIsAlertOpen(true);
    }
  };

  if (!post || !post.user) {
    return null;
  }

  const currencyInfo = getCurrencyInfo(post.content);

  return (
    <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-grow">
          <div className="flex-shrink-0">
            <ProfileImage user={post.user} isDark={isDark} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center space-x-1">
                  <span className={`font-semibold text-[15px] truncate ${
                    isDark ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    {post.user.username}
                  </span>
                  {post.user.is_verified && (
                    <span className="inline-block">
                      <svg viewBox="0 0 24 24" fill="#60A5FA" className="w-4 h-4 inline-block">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    </span>
                  )}
                  <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>·</span>
                  <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>
                    {formatTimeAgo(post.taken_at)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-auto">
                {currencyInfo && (
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
                      isDark ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <img src={currencyInfo.logo} alt={currencyInfo.name} className="w-5 h-5" />
                      <span className={`text-sm font-medium ${
                        isDark ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        {currencyInfo.name}
                      </span>
                    </div>
                  </div>
                )}
                <img 
                  src="https://seeklogo.com/images/T/threads-logo-E9BA734BF6-seeklogo.com.png" 
                  alt="Threads" 
                  className={`w-6 h-6 ${isDark ? 'filter invert' : ''}`}
                />
              </div>
            </div>

            <div className={`mt-1 text-[15px] leading-normal ${
              isDark ? 'text-gray-300' : 'text-gray-900'
            }`}>
              <RenderText text={post.content} isDark={isDark} />
            </div>

            {(post.image_versions?.length > 0 || 
              post.video_versions?.length > 0 || 
              post.carousel_media?.length > 0
            ) && (
              <div className={`mt-3 rounded-xl overflow-hidden ${
                isDark ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
                <MediaContent post={post} isDark={isDark} />
              </div>
            )}

            <div className="flex items-center space-x-4 mt-3">
              <button 
                onClick={handleLike}
                className={`p-2 -ml-2 rounded-full transition-colors group ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}
              >
                <Heart 
                  className={`w-[22px] h-[22px] ${
                    isLiked 
                      ? 'fill-red-500 text-red-500' 
                      : `${isDark ? 'text-gray-300' : 'text-gray-900'} group-hover:text-red-500`
                  }`}
                  strokeWidth={2}
                />
              </button>

              <button className={`p-2 rounded-full transition-colors group ${
                isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
              }`}>
                <MessageCircle 
                  className={`w-[22px] h-[22px] ${
                    isDark ? 'text-gray-300' : 'text-gray-900'
                  } group-hover:text-blue-500`}
                  strokeWidth={2}
                />
              </button>

              <button 
                onClick={handleRepost}
                className={`p-2 rounded-full transition-colors group ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}
              >
                <Repeat2 
                  className={`w-[22px] h-[22px] ${
                    isReposted 
                      ? 'text-green-500' 
                      : `${isDark ? 'text-gray-300' : 'text-gray-900'} group-hover:text-green-500`
                  }`}
                  strokeWidth={2}
                />
              </button>

              <button 
                onClick={handleShare}
                className={`p-2 rounded-full transition-colors group ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}
              >
                <Send 
                  className={`w-[22px] h-[22px] ${
                    isDark ? 'text-gray-300' : 'text-gray-900'
                  } group-hover:text-blue-500`}
                  strokeWidth={2}
                />
              </button>
            </div>

            {(localLikeCount > 0 || post.text_post_app_info?.direct_reply_count > 0 || localRepostCount > 0) && (
              <div className={`flex items-center space-x-4 mt-2 text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {localLikeCount > 0 && (
                  <span>{localLikeCount.toLocaleString()} likes</span>
                )}
                {post.text_post_app_info?.direct_reply_count > 0 && (
                  <span>
                    {post.text_post_app_info.direct_reply_count.toLocaleString()} replies
                  </span>
                )}
                {localRepostCount > 0 && (
                  <span>{localRepostCount.toLocaleString()} reposts</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      {isAlertOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl max-w-md w-full p-6 shadow-xl ${
            isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <h2 className="text-xl font-semibold mb-4">Share Post</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                value={window.location.href}
                readOnly
                className={`w-full px-4 py-3 border rounded-xl ${
                  isDark 
                    ? 'bg-gray-700 text-white border-gray-600' 
                    : 'bg-gray-50 text-gray-900 border-gray-300'
                }`}
                onClick={e => e.target.select()}
              />
              <button 
                onClick={() => setIsAlertOpen(false)}
                className={`w-full py-3 rounded-xl font-medium transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-black hover:bg-gray-900 text-white'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreadPost;