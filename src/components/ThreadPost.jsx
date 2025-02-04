'use client'
import { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { formatDistanceToNow } from 'date-fns';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Send,
  User,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';

// Utility function for proxying URLs
const getProxiedUrl = (originalUrl, isVideo = false) => {
  if (!originalUrl) return '';
  const encodedUrl = encodeURIComponent(originalUrl);
  return isVideo 
    ? `/api/proxy/video?url=${encodedUrl}`
    : `/api/proxy/image?url=${encodedUrl}`;
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

// Video Player Component
const VideoPlayer = ({ videoUrl, posterUrl, isDark }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);
  
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
  });

  const setRefs = (element) => {
    videoRef.current = element;
    inViewRef(element);
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (inView && isPlaying && !showThumbnail) {
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('Autoplay prevented:', error);
          setIsPlaying(false);
        });
      }
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }
  }, [inView, isPlaying, showThumbnail]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const getProxiedUrl = (originalUrl, isVideo = false) => {
    if (!originalUrl) return '';
    const encodedUrl = encodeURIComponent(originalUrl);
    return isVideo 
      ? `/api/proxy/video?url=${encodedUrl}`
      : `/api/proxy/image?url=${encodedUrl}`;
  };

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {showThumbnail && posterUrl && (
        <div className="absolute inset-0">
          <img 
            src={getProxiedUrl(posterUrl)} 
            alt="Video thumbnail"
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <button
              onClick={() => {
                setShowThumbnail(false);
                togglePlay();
              }}
              className="p-4 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
            >
              <Play size={32} />
            </button>
          </div>
        </div>
      )}
      
      <video
        ref={setRefs}
        className="w-full rounded-lg"
        playsInline
        loop
        muted={isMuted}
        poster={posterUrl ? getProxiedUrl(posterUrl) : undefined}
        preload="metadata"
      >
        <source src={getProxiedUrl(videoUrl, true)} type="video/mp4" />
        Your browser does not support video playback.
      </video>

      <div className={`absolute inset-0 flex items-center justify-center ${showControls ? 'bg-black bg-opacity-20' : ''} rounded-lg transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100`}>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={togglePlay}
            className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          
          <button
            onClick={toggleMute}
            className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};
// Image Component
const ImageComponent = ({ imageVersion, alt, isDark }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!imageVersion?.url || imageError) return null;

  return (
    <div className="relative w-full">
      {isLoading && (
        <div className={`absolute inset-0 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} animate-pulse rounded-lg`} />
      )}
      <img
        src={getProxiedUrl(imageVersion.url)}
        alt={alt || "Post media"}
        className={`w-full h-full object-cover rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
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

// Media Content Component
const MediaContent = ({ post, isDark }) => {
  if (!post) return null;
console.log("post",post)
  const renderCarouselGrid = (carouselMedia) => {
    if (!carouselMedia?.length) return null;

    const gridLayouts = {
      1: "grid-cols-1",
      2: "grid-cols-2 gap-1",
      3: "grid-cols-2 gap-1",
      4: "grid-cols-2 gap-1",
      default: "grid-cols-2 gap-1"
    };

    const getGridLayout = (count) => gridLayouts[count] || gridLayouts.default;

    return (
      <div className={`grid ${getGridLayout(carouselMedia.length)} rounded-lg overflow-hidden`}>
        {carouselMedia.map((media, index) => {
          if (carouselMedia.length === 3 && index === 0) {
            return (
              <div key={index} className="col-span-2">
                {renderMediaItem(media, index)}
              </div>
            );
          }

          if (carouselMedia.length >= 4 && index >= 4) {
            return null;
          }

          return (
            <div 
              key={index} 
              className={`relative ${index === 3 && carouselMedia.length > 4 ? 'overlay-container' : ''}`}
            >
              {renderMediaItem(media, index)}
              {index === 3 && carouselMedia.length > 4 && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <span className="text-white text-xl font-bold">+{carouselMedia.length - 4}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMediaItem = (media, index) => {
    if (media.media_type === 2 && media.video_versions?.[0]) {
      return (
        <VideoPlayer
          videoUrl={media.video_versions[0].url}
          posterUrl={media.image_versions2?.candidates?.[0]?.url}
          isDark={isDark}
        />
      );
    }
    
    if (media.media_type === 1 && media.image_versions2?.candidates?.[0]) {
      return (
        <ImageComponent
          imageVersion={media.image_versions2.candidates[0]}
          alt={`Media ${index + 1}`}
          isDark={isDark}
        />
      );
    }

    return null;
  };

  if (post.media_type === 2 && post.video_versions?.[0]) {
    return (
      <VideoPlayer
        videoUrl={post.video_versions[0].url}
        posterUrl={post.image_versions?.[0]?.url}
        isDark={isDark}
      />
    );
  }

  if (post.media_type === 1 && post.image_versions?.[0]) {
    return (
      <ImageComponent
        imageVersion={post.image_versions[0]}
        alt={post.accessibility_caption}
        isDark={isDark}
      />
    );
  }

  if (post.carousel_media?.length > 0) {
    return renderCarouselGrid(post.carousel_media);
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

  return (
    <div className="relative w-10 h-10">
      {isLoading && (
        <div className={`absolute inset-0 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} rounded-full animate-pulse`} />
      )}
      <img
        src={getProxiedUrl(user.profile_pic_url)}
        alt={user.username}
        className={`w-10 h-10 shadow-md border rounded-full hover:opacity-90 transition-opacity object-cover ${
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
                  src="/threads-logo.png"
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