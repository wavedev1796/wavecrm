"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import type { Feedback } from "./actions";

const ShowFeedback = createContext<(feedback: Feedback) => void>(() => {});

/** Un único aviso para toda la página de usuarios. Sus textos salen de las acciones, nunca de la URL. */
export function UsersFeedbackProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [feedback, setFeedback] = useState<(Feedback & { id: number }) | null>(null);
  // `id` nuevo en cada aviso: el Alert se vuelve a montar y se anuncia aunque el texto se repita.
  const show = useCallback((next: Feedback) => setFeedback({ ...next, id: Date.now() }), []);

  return (
    <ShowFeedback.Provider value={show}>
      {feedback && (
        <Alert key={feedback.id} tone={feedback.tone}>
          {feedback.message}
        </Alert>
      )}
      {children}
    </ShowFeedback.Provider>
  );
}

export const useShowFeedback = () => useContext(ShowFeedback);
