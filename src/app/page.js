'use client'
import { useState, useEffect } from 'react';
import ThreadPost from '@/components/ThreadPost';
import { Moon, Sun } from 'lucide-react';

const ThreadsFeed = () => {
  const [postsData, setPostsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {xc
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/threads');
        const data = await response.json();

        if (data.success && data.data?.results) {
          setPostsData(data.data.results);
        } else {
          setError('No data available');
        }
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const processThreadItems = (searchResults) => {
    if (!searchResults?.data?.searchResults?.edges) return [];

    return searchResults.data.searchResults.edges
      .map(edge => {
        const threadItems = edge.node?.thread?.thread_items;
        if (!threadItems?.length) return null;

        return threadItems.map(item => {
          const post = item.post;
          if (!post) return null;

          return {
            id: post.pk,
            user: {
              id: post.user?.pk,
              username: post.user?.username,
              is_verified: post.user?.is_verified,
              profile_pic_url: post.user?.profile_pic_url
            },
            content: post.caption?.text,
            taken_at: post.taken_at,
            like_count: post.like_count,
            has_liked: post.has_liked,
            has_replies: item.should_show_replies_cta,
            media_type: post.media_type,
            image_versions: post.image_versions2?.candidates,
            video_versions: post.video_versions,
            carousel_media: post.carousel_media,
            accessibility_caption: post.accessibility_caption
          };
        }).filter(Boolean);
      })
      .filter(Boolean)
      .flat();
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-500'}`} />
      </div>
    );
  }

  if (error) {
    return <div className={`text-red-500 text-center p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>{error}</div>;
  }

  if (!postsData || !Array.isArray(postsData)) {
    return <div className={`text-gray-500 text-center p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>No posts available</div>;
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Threads Crypto Posts
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${
                isDark
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } transition-colors duration-200`}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="space-y-8">
            {postsData.map((currencyData) => {
              const namePosts = processThreadItems(currencyData.nameResults);
              const symbolPosts = processThreadItems(currencyData.symbolResults);
              const allPosts = [...namePosts, ...symbolPosts];
              const uniquePosts = Array.from(
                new Map(allPosts.map(post => [post.id, post])).values()
              );

              return (
                <div key={currencyData.currency} className="space-y-6">
                  <h2 className={`text-xl font-semibold flex items-center ${
                    isDark ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    <span>{currencyData.currency}</span>
                    <span className={`ml-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      ${currencyData.symbol}
                    </span>
                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      ({uniquePosts.length} posts)
                    </span>
                  </h2>
                  <div className={`space-y-4 rounded-t-3xl ${
                    isDark ? 'bg-gray-800 shadow-dark' : 'bg-white shadow-lg'
                  }`}>
                    {uniquePosts.map((post) => (
                      <ThreadPost 
                        key={post.id} 
                        post={post}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ThreadsFeed;