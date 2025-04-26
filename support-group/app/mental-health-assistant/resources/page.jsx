'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function MentalHealthResources() {
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/resources');
        
        if (!response.ok) {
          throw new Error('Failed to fetch resources');
        }
        
        const data = await response.json();
        setResources(data);
      } catch (err) {
        console.error('Error fetching resources:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resources...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <h2 className="text-red-800 text-xl font-medium mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <p className="mt-4 text-gray-700">Please try again later or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto pt-8 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            href="/mental-health-assistant" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Assistant
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Mental Health Resources</h1>
        
        {resources && (
          <div className="space-y-10">
            {/* Crisis Resources */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Crisis Resources</h2>
              <div className="bg-red-50 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-red-100 bg-red-100">
                  <h3 className="text-lg font-medium text-red-800">If you're in crisis, please reach out</h3>
                </div>
                <ul className="divide-y divide-red-100">
                  {resources.crisis_resources.map((resource, index) => (
                    <li key={index} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{resource.name}</h4>
                          <p className="text-gray-600">{resource.description}</p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            {resource.contact}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Organizations */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Mental Health Organizations</h2>
              <div className="bg-white rounded-lg shadow">
                <ul className="divide-y divide-gray-200">
                  {resources.organizations.map((org, index) => (
                    <li key={index} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{org.name}</h4>
                          <p className="text-gray-600">{org.description}</p>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          <a 
                            href={org.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Visit Website
                          </a>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Self-care Resources */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Self-Care Tips</h2>
              <div className="bg-green-50 rounded-lg shadow p-6">
                <ul className="space-y-3 list-disc pl-5">
                  <li className="text-gray-700">Practice deep breathing and meditation</li>
                  <li className="text-gray-700">Maintain a regular sleep schedule</li>
                  <li className="text-gray-700">Stay physically active with regular exercise</li>
                  <li className="text-gray-700">Eat a balanced diet and stay hydrated</li>
                  <li className="text-gray-700">Connect with supportive friends and family</li>
                  <li className="text-gray-700">Engage in activities that bring you joy and relaxation</li>
                  <li className="text-gray-700">Set boundaries and practice saying no when needed</li>
                  <li className="text-gray-700">Take breaks from news and social media</li>
                  <li className="text-gray-700">Seek professional help when needed</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 