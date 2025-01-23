'use client';
import { useState, useEffect } from 'react';
import ThreadPost from '@/components/ThreadPost';

export default function ThreadsFeed() {
  const [postsData, setPostsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/threads');
        const data = await response.json();
        console.log('API Response:', data);

        if (data.success) {
          setPostsData(data.data);
        } else {
          setError(data.error || 'No data available');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (!postsData || !Array.isArray(postsData)) {
    return <div className="text-gray-500 text-center p-4">No posts available</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Threads Crypto Posts</h1>
      <div className="space-y-8">
        {postsData.map((currencyData, index) => (
          <div key={index} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <span>{currencyData.currency}</span>
              <span className="ml-2 text-gray-600">${currencyData.symbol}</span>
              <span className="ml-2 text-sm text-gray-500">
                ({currencyData.total_posts} posts)
              </span>
            </h2>
            <div className="space-y-4">
              {Array.isArray(currencyData.posts) && currencyData.posts.map((post) => (
                <ThreadPost key={post.id} post={post} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}