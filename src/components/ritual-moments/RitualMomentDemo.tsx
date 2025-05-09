import React, { useState } from "react";
import { RitualMoment } from "./RitualMoment";
import type { RitualType } from "./RitualMoment";

/**
 * Ritual Moment Demo Component
 * 
 * Demonstrates the ritual moment component with various configurations.
 */
export function RitualMomentDemo() {
  const [ritualType, setRitualType] = useState<RitualType>("daily");
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [showRitual, setShowRitual] = useState<boolean>(true);
  
  // Example ritual steps for each type
  const ritualSteps = {
    daily: [
      {
        id: "daily-gratitude",
        title: "Daily Gratitude",
        description: "What are three things you're grateful for today?",
        inputPlaceholder: "I'm grateful for...",
        inputRequired: true,
      },
      {
        id: "daily-intention",
        title: "Set Your Intention",
        description: "What is one thing you want to focus on today?",
        inputPlaceholder: "Today, I will focus on...",
        inputRequired: true,
      },
      {
        id: "daily-reflection",
        title: "Evening Reflection",
        description: "How did your day go? What did you learn?",
        inputPlaceholder: "Today I learned...",
        inputRequired: false,
      },
    ],
    weekly: [
      {
        id: "weekly-wins",
        title: "Celebrate Wins",
        description: "What were your biggest accomplishments this week?",
        inputPlaceholder: "This week I accomplished...",
        inputRequired: true,
      },
      {
        id: "weekly-challenges",
        title: "Acknowledge Challenges",
        description: "What challenges did you face and how did you handle them?",
        inputPlaceholder: "I faced these challenges...",
        inputRequired: true,
      },
      {
        id: "weekly-planning",
        title: "Plan Next Week",
        description: "What are your top priorities for next week?",
        inputPlaceholder: "Next week I will focus on...",
        inputRequired: true,
      },
    ],
    milestone: [
      {
        id: "milestone-achievement",
        title: "Celebrate Achievement",
        description: "What milestone have you reached? How does it feel?",
        inputPlaceholder: "I've achieved...",
        inputRequired: true,
      },
      {
        id: "milestone-journey",
        title: "Reflect on the Journey",
        description: "What was the most important lesson you learned along the way?",
        inputPlaceholder: "The most important lesson was...",
        inputRequired: true,
      },
      {
        id: "milestone-gratitude",
        title: "Express Gratitude",
        description: "Who helped you reach this milestone? How did they support you?",
        inputPlaceholder: "I'm grateful to...",
        inputRequired: true,
      },
      {
        id: "milestone-next",
        title: "Look Forward",
        description: "What's your next goal or milestone?",
        inputPlaceholder: "My next goal is...",
        inputRequired: true,
      },
    ],
    anniversary: [
      {
        id: "anniversary-memories",
        title: "Cherished Memories",
        description: "What are your favorite memories from this past year?",
        inputPlaceholder: "My favorite memories are...",
        inputRequired: true,
      },
      {
        id: "anniversary-growth",
        title: "Personal Growth",
        description: "How have you grown or changed over the past year?",
        inputPlaceholder: "I've grown by...",
        inputRequired: true,
      },
      {
        id: "anniversary-looking-forward",
        title: "Looking Forward",
        description: "What are you most excited about for the coming year?",
        inputPlaceholder: "I'm excited about...",
        inputRequired: true,
      },
    ],
  };
  
  // Get ritual title based on type
  const getRitualTitle = () => {
    switch (ritualType) {
      case "daily":
        return "Daily Check-In";
      case "weekly":
        return "Weekly Review";
      case "milestone":
        return "Milestone Celebration";
      case "anniversary":
        return "Annual Reflection";
      default:
        return "Ritual Moment";
    }
  };
  
  // Get ritual subtitle based on type
  const getRitualSubtitle = () => {
    switch (ritualType) {
      case "daily":
        return "Take a moment to reflect on your day";
      case "weekly":
        return "Review your week and plan for the next";
      case "milestone":
        return "Celebrate your achievement and look forward";
      case "anniversary":
        return "Reflect on your journey over the past year";
      default:
        return "";
    }
  };
  
  // Handle ritual completion
  const handleComplete = (responses: Record<string, string>) => {
    setResponses(responses);
    setIsCompleted(true);
    setShowRitual(false);
  };
  
  // Handle ritual cancellation
  const handleCancel = () => {
    setShowRitual(false);
  };
  
  // Reset demo
  const resetDemo = () => {
    setIsCompleted(false);
    setShowRitual(true);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ritual Moments Demo</h1>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center">
            <span className="mr-2">Ritual Type:</span>
            <select
              value={ritualType}
              onChange={(e) => setRitualType(e.target.value as RitualType)}
              className="p-2 border rounded"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="milestone">Milestone</option>
              <option value="anniversary">Anniversary</option>
            </select>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={() => setHighContrast(!highContrast)}
              className="mr-2"
            />
            High Contrast Mode
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={() => setReducedMotion(!reducedMotion)}
              className="mr-2"
            />
            Reduced Motion
          </label>
        </div>
        
        {!showRitual && (
          <button
            onClick={resetDemo}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Start New Ritual
          </button>
        )}
      </div>
      
      {showRitual && (
        <div className="h-[600px] w-full">
          <RitualMoment
            type={ritualType}
            title={getRitualTitle()}
            subtitle={getRitualSubtitle()}
            steps={ritualSteps[ritualType]}
            onComplete={handleComplete}
            onCancel={handleCancel}
            highContrast={highContrast}
            reducedMotion={reducedMotion}
          />
        </div>
      )}
      
      {isCompleted && !showRitual && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Ritual Responses:</h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
            {Object.entries(responses).map(([id, response]) => {
              // Find the step that matches this ID
              const step = ritualSteps[ritualType].find(s => s.id === id);
              return step ? (
                <div key={id} className="mb-4">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">{step.description}</p>
                  <div className="p-3 bg-white dark:bg-gray-700 rounded">
                    {response || <em className="text-gray-400">No response provided</em>}
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">About Ritual Moments</h2>
        <p className="mb-2">
          Ritual Moments create focused, immersive environments for meaningful interactions
          like reflection, goal-setting, and milestone celebrations. They help users:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Build consistent reflection habits through daily and weekly rituals</li>
          <li>Celebrate achievements and milestones in a meaningful way</li>
          <li>Create a sense of continuity and narrative in their personal journey</li>
          <li>Enhance emotional connection with the agent through shared experiences</li>
          <li>Develop self-awareness through guided reflection</li>
        </ul>
        <p>
          Each ritual type has a unique visual theme, animation style, and question set
          designed to evoke the appropriate emotional response for the context.
        </p>
      </div>
    </div>
  );
}
