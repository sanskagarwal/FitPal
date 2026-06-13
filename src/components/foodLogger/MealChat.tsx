import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Send, X, Camera } from 'lucide-react';
import { MealEntry, MealChatResult } from '../../types';
import { Spinner } from '../Spinner';
import { ChatMessage } from './foodLoggerUtils';
import { MealProposal } from './MealProposal';

interface MealChatProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (value: string) => void;
  chatLoading: boolean;
  chatPreparing: boolean;
  proposedMeal: MealChatResult | null;
  pendingImage: string | null;
  imageLoading: boolean;
  todayMeals: MealEntry[];
  onSend: () => void;
  onAttachImage: (file: File) => void;
  onClearImage: () => void;
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
  chatPreparing,
  proposedMeal,
  pendingImage,
  imageLoading,
  todayMeals,
  onSend,
  onAttachImage,
  onClearImage,
  onConfirm,
  onDiscard,
  onReset,
  onUpdateProposedFoodCalories,
}: MealChatProps) => {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoFocusInput =
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

  // Auto-scroll the chat to the latest message.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatLoading, chatPreparing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAttachImage(file);
    // Reset so picking the same file again still fires onChange.
    e.target.value = '';
  };

  const canSend = (!!chatInput.trim() || !!pendingImage) && !chatLoading && !imageLoading;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-lg font-semibold">Quick Log with AI</h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Describe your meal in plain language - e.g.{' '}
        <span className="italic">"2 rotis and a katori of dal for lunch at 1pm"</span>, or snap a
        photo of your plate. You can also edit or remove today's meals, like{' '}
        <span className="italic">"add a glass of milk to breakfast"</span> or{' '}
        <span className="italic">"delete my lunch"</span>.
      </p>

      {chatMessages.length > 0 && (
        <div ref={chatScrollRef} className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
          {chatMessages.map((msg, i) =>
            // Skip the empty assistant placeholder shown before the first
            // streamed token (the "Thinking..." indicator covers that gap).
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
                      ? 'bg-primary-700 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Attached meal photo"
                      className="mb-1.5 max-h-40 w-auto rounded-lg object-cover"
                    />
                  )}
                  {msg.content}
                </div>
              </motion.div>
            )
          )}
          {chatLoading && chatMessages[chatMessages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300 px-3 py-2 rounded-2xl rounded-bl-sm text-sm flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                Thinking...
              </div>
            </div>
          )}
          {chatPreparing && !proposedMeal && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300 px-3 py-2 rounded-2xl rounded-bl-sm text-sm flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                Preparing your meal...
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

      {/* Staged photo preview (before sending) */}
      {(pendingImage || imageLoading) && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2">
          {imageLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Spinner className="w-4 h-4" />
              Processing photo...
            </div>
          ) : (
            <>
              <img
                src={pendingImage as string}
                alt="Photo to send"
                className="h-14 w-14 rounded-md object-cover"
              />
              <span className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                Photo ready - add a note or just send.
              </span>
              <button
                onClick={onClearImage}
                disabled={chatLoading}
                className="inline-flex items-center justify-center min-h-11 min-w-11 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                aria-label="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={chatLoading || imageLoading}
          className="btn-secondary flex items-center justify-center px-3"
          title="Add a photo"
          aria-label="Add a photo"
        >
          <Camera className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canSend && onSend()}
          placeholder={pendingImage ? 'Add a note (optional)' : 'What did you eat?'}
          className="input-field flex-1"
          disabled={chatLoading}
          autoFocus={autoFocusInput}
        />
        <button onClick={onSend} disabled={!canSend} className="btn-primary flex items-center gap-1">
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
