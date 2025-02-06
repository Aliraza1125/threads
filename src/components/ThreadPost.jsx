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

const getProxiedUrl = (originalUrl, isVideo = false) => {
  if (!originalUrl) return '';
  const encodedUrl = encodeURIComponent(originalUrl);
  return isVideo 
    ? `/api/proxy/video?url=${encodedUrl}`
    : `/api/proxy/image?url=${encodedUrl}`;
};

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
const VideoPlayer = ({ videoUrl, posterUrl, isDark }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('waiting', () => setIsLoading(true));
    videoElement.addEventListener('playing', () => setIsLoading(false));

    return () => {
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('waiting', () => setIsLoading(true));
      videoElement.removeEventListener('playing', () => setIsLoading(false));
    };
  }, []);

  const togglePlay = async () => {
    if (!videoRef.current) return;

    try {
      if (isPlaying) {
        await videoRef.current.pause();
        setIsPlaying(false);
      } else {
        setShowThumbnail(false);
        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play state:', error);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleProgressClick = (e) => {
    if (!videoRef.current) return;
    
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const percentage = x / bounds.width;
    const newTime = percentage * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden"
    >
      {showThumbnail && posterUrl && (
        <div className="absolute inset-0 z-20">
          <img 
            src={getProxiedUrl(posterUrl)} 
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="p-4 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
            >
              <Play size={32} />
            </button>
          </div>
        </div>
      )}

      {isLoading && !showThumbnail && (
        <div className="absolute inset-0 z-10 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full"
        playsInline
        muted={isMuted}
        poster={posterUrl ? getProxiedUrl(posterUrl) : undefined}
        preload="metadata"
      >
        <source src={getProxiedUrl(videoUrl, true)} type="video/mp4" />
      </video>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
        <div 
          className="w-full h-1 bg-gray-600 rounded cursor-pointer mb-2"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-white rounded"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <button
              onClick={toggleMute}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-gray-300 transition-colors"
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5m-7 11h4m-4 0v4m0 0l5-5m5 5v-4m0 4h-4m0 0l5-5" />
              </svg>
            )}
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
                  src="data:image/png;base64,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"
                  alt="Threads" 
                  className={`w-5 h-5 ${isDark ? 'filter invert' : ''}`}
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