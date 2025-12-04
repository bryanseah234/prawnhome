import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HackerNewsStory } from '../../types';

export const MarqueeBar: React.FC = () => {
  const [stories, setStories] = useState<HackerNewsStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const topIdsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const topIds = await topIdsRes.json();
        
        // Take top 30
        const topIdsSlice = topIds.slice(0, 30);
        
        const storyPromises = topIdsSlice.map((id: number) => 
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(res => res.json())
        );
        
        const fetchedStories = await Promise.all(storyPromises);
        setStories(fetchedStories);
      } catch (error) {
        console.error("Failed to fetch HN stories", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, []);

  if (loading) return <div className="h-12 bg-black w-full" />;

  return (
    <div className="w-full bg-black border-y-2 border-black py-3 overflow-hidden flex relative z-20">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-10" />
      
      <motion.div 
        className="flex whitespace-nowrap"
        animate={{ x: [0, -4000] }}
        transition={{ 
          repeat: Infinity, 
          ease: "linear", 
          duration: 120, // Slower for more content
        }}
        whileHover={{ animationPlayState: 'paused' }}
      >
        {/* Duplicate list 3 times for seamless loop */}
        {[...stories, ...stories, ...stories].map((story, i) => (
          <a 
            key={`${story.id}-${i}`}
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mx-8 text-prawn font-bold hover:underline hover:text-white transition-colors"
          >
            <span className="text-white mr-2">★</span>
            {story.title}
          </a>
        ))}
      </motion.div>
    </div>
  );
};