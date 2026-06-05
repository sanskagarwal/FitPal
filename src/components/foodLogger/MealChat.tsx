import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Send, X } from 'lucide-react';
import { MealEntry, MealChatResult } from '../../types';
import { Spinner } from '../Spinner';
import { ChatMessage } from './foodLoggerUtils';
import { MealProposal } from './MealProposal';

interface MealChatProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  chatLoading: boolean;
  proposedMeal: MealChatResult | null;
  todayMeals: MealEntry[];
  onSend: () => void;
  onConfirm: () => void;
  onDiscard: () => void;
  onReset: () => void;
  onUpdateProposedFoodCalories: (index: number, calories: number) => void;
}

export const MealChat = ({
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  proposedMeal,
  todayMeals,
  onSend,
  onConfirm,
  onDiscard,
  onReset,
  onUpdateProposedFoodCalories,
}: MealChatProps) => {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the chat to the latest message.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatLoading]);

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold">Quick Log with AI</h2>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Describe your meal in plain language — e.g.{' '}
        <span className="italic">"2 rotis and a katori of dal for lunch at 1pm"</span>. You can also
        edit or remove today's meals, like{' '}
        <span className="italic">"add a glass of milk to breakfast"</span> or{' '}
        <span className="italic">"delete my lunch"</span>.
      </p>

      {chatMessages.length > 0 && (
        <div ref={chatScrollRef} className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
          {chatMessages.map((msg, i) =>
            // Skip the empty assistant placeholder shown before the first
            // streamed token (the "Thinking…" indicator covers that gap).
            msg.role === 'assistant' && msg.content === '' ? null : (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            )
          )}
          {chatLoading && chatMessages[chatMessages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-2xl rounded-bl-sm text-sm flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                Thinking…
              </div>
            </div>
          )}
        </div>
      )}

      {/* Proposed action preview */}
      <AnimatePresence>
        {proposedMeal && (proposedMeal.foods.length > 0 || proposedMeal.action === 'delete') && (
          <MealProposal
            proposedMeal={proposedMeal}
            todayMeals={todayMeals}
            chatLoading={chatLoading}
            onUpdateProposedFoodCalories={onUpdateProposedFoodCalories}
            onConfirm={onConfirm}
            onDiscard={onDiscard}
          />
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSend()}
          placeholder="What did you eat?"
          className="input-field flex-1"
          disabled={chatLoading}
          autoFocus
        />
        <button onClick={onSend} disabled={chatLoading || !chatInput.trim()} className="btn-primary flex items-center gap-1">
          <Send className="w-4 h-4" />
          Send
        </button>
        {chatMessages.length > 0 && (
          <button onClick={onReset} disabled={chatLoading} className="btn-secondary" title="Start over">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
