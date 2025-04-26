'use client';

import React from 'react';
import { UserIcon } from '@heroicons/react/24/solid';

// Custom component to render different message types
export default function ChatMessage({ message }) {
  // Determine the style based on the message role
  const messageStyle = 
    message.role === 'user' 
      ? 'bg-blue-50 border-blue-200' 
      : message.role === 'system'
        ? 'bg-gray-100 border-gray-300 text-gray-700'
        : 'bg-white border-gray-200';

  // Alignment based on role
  const alignment = message.role === 'user' ? 'justify-end' : 'justify-start';

  // Custom avatar/icon based on role
  const Avatar = () => {
    if (message.role === 'user') {
      return (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
          <UserIcon className="h-5 w-5 text-white" />
        </div>
      );
    } else if (message.role === 'assistant') {
      return (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-600 flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="h-5 w-5 text-white"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" 
            />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="h-5 w-5 text-white"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" 
            />
          </svg>
        </div>
      );
    }
  };

  return (
    <div className={`flex ${alignment}`}>
      <div className={`flex max-w-3xl ${message.role !== 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`${message.role !== 'user' ? 'mr-2' : 'ml-2'} mt-1`}>
          <Avatar />
        </div>
        
        <div 
          className={`py-3 px-4 rounded-lg border ${messageStyle} ${
            message.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'
          }`}
        >
          <div className="whitespace-pre-wrap">
            {/* Render markdown content if needed using a markdown library */}
            {message.content}
          </div>
        </div>
      </div>
    </div>
  );
} 