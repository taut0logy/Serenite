export const metadata = {
  title: 'Mental Health Assistant',
  description: 'Chat with an AI mental health assistant',
};

export default function MentalHealthAssistantLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 