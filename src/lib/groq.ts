export interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function callGroqAPI(
  messages: GroqMessage[],
  apiKey: string,
  model: string = 'llama-3.3-70b-versatile'
): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generateQuiz(
  documentContent: string,
  apiKey: string,
  numQuestions: number = 5
): Promise<string> {
  const messages: GroqMessage[] = [
    {
      role: 'system',
      content: 'You are an expert quiz generator. Generate multiple-choice quiz questions based on the provided document.',
    },
    {
      role: 'user',
      content: `Generate ${numQuestions} multiple-choice quiz questions from this document:\n\n${documentContent}\n\nFormat each question as:\nQ: [Question]\nA) [Option 1]\nB) [Option 2]\nC) [Option 3]\nD) [Option 4]\nCorrect: [A/B/C/D]`,
    },
  ];

  return callGroqAPI(messages, apiKey);
}

export async function generateSummary(
  documentContent: string,
  apiKey: string
): Promise<string> {
  const messages: GroqMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at summarizing documents. Provide clear, concise summaries.',
    },
    {
      role: 'user',
      content: `Summarize this document in 3-5 sentences:\n\n${documentContent}`,
    },
  ];

  return callGroqAPI(messages, apiKey);
}
