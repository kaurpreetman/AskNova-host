import { Server } from 'socket.io';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSystemPrompt, CONTINUE_PROMPT } from '../utils/prompt.js';
import { displayDatasetOptions } from '../utils/kaggle.js';
import History from '../models/History.js';
import mongoose from 'mongoose';

class GeminiSocketHandler {
  constructor(server) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.initializeSocketEvents();
  }

  async isMLPrompt(p) {
    const checkPrompt = `
You are an AI assistant. Check if this prompt is about ML/DL model creation or related tasks. Reply with "yes" or "no".

Prompt: """${p}"""
`;
    const result = await this.model.generateContent(checkPrompt);
    const txt = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
    return txt === 'yes';
  }


  async formatDBConversationHistory(messages) {
    if (!messages || messages.length === 0) return '';
    
    return messages.map(msg => 
        `${msg.role}: ${msg.content}${
            msg.trainingData ? `\n\nTraining Data Used: ${msg.trainingData}` : ''
        }`
    ).join('\n\n---\n\n');
  }

  async initializeSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      socket.on('generate-response', async (data) => {
  try {
    const { userPrompt, trainingData, userId, sessionId } = data;

    if (!userPrompt || !userId) {
      socket.emit('error', {
        message: 'Please provide prompt and user ID.',
        type: 'missing-prompt',
      });
      return;
    }
     //  Prompt relevance
    const ok = await this.isMLPrompt(userPrompt);
          if (!ok) {
            const warning = `<code>// ⚠️ This prompt doesn’t seem related to ML model generation. Try something like "build a CNN classifier for images".</code>`;
            return socket.emit('generate-response-result', {
              sessionId: sessionId || Date.now().toString(),
              response: warning,
              datasets: [],
              isComplete: true
            });
          }



    // Get or create user history
    let history = await History.findOne({ author: userId });
    if (!history) {
      history = new History({ author: userId, sessions: [] });
    }

    // Get or create session
    let session = history.sessions.find(s => s.sessionId === sessionId);
    if (!session) {
      session = {
        sessionId: sessionId || Date.now().toString(),
        title: userPrompt.substring(0, 30) + '...',
        messages: [],
        lastActive: new Date(),
        datasets: []
      };
      history.sessions.push(session);
    }

    // 🔍 Extract keywords
    const keywordPrompt = `
You are given a user prompt requesting a dataset. Extract two key elements:

1. **Data Domain** (Primary) – What kind of data or subject is involved? (e.g., digits, tweets, medical images, movie reviews, weather data, etc.)
2. **ML Task Type** (Secondary) – What kind of machine learning task is being performed? (e.g., image classification, regression, sentiment analysis, time series forecasting, etc.)

💡 The data domain is most important for finding relevant datasets. Do not skip the task type unless it's completely unclear.

Return both as lowercase keywords separated by a comma.

📌 Examples:

- Prompt: "image classifier for handwritten digits from a matrix"  
  Output: 'digits, image classification'

**Prompt to analyze:**  
${userPrompt}
`;

    const keywordResult = await this.model.generateContent(keywordPrompt);
    const keywords = keywordResult.response.candidates[0].content.parts[0].text.trim();
    const [primaryKeyword] = keywords.split(',').map(k => k.trim().toLowerCase());

    const datasets = await displayDatasetOptions(primaryKeyword);

    let finalTrainingData = trainingData;
    if (!finalTrainingData && datasets.data.length > 0) {
      const defaultDataset = datasets.data[0];
      finalTrainingData = `Dataset: ${defaultDataset.title}\nURL: ${defaultDataset.url}`;
    }

    // Save user message
    session.messages.push({
      role: 'user',
      content: userPrompt,
      timestamp: new Date(),
      trainingData: finalTrainingData,
      datasets: datasets.data.map(dataset => ({
        title: dataset.title,
        url: dataset.url,
        subtitle: dataset.subtitle,
        creatorName: dataset.creatorName,
        downloadCount: dataset.downloadCount
      }))
    });

    // Prepare prompt with conversation context
    const conversationContext = await this.formatDBConversationHistory(session.messages);
    const systemPrompt = getSystemPrompt();
    const continuePrompt = CONTINUE_PROMPT;

    const finalPrompt = `${systemPrompt}
Previous conversation:
${conversationContext}
${continuePrompt}
Current user message: ${userPrompt}
${finalTrainingData ? `\nAvailable training data: ${finalTrainingData}` : ''}`;

    const streamingResult = await this.model.generateContentStream(finalPrompt);
    let fullResponse = '';

    for await (const chunk of streamingResult.stream) {
      const chunkText = chunk.text();
      if (!chunkText) continue;

      fullResponse += chunkText;
      socket.emit('generate-response-chunk', {
        sessionId: session.sessionId,
        chunk: chunkText,
        isComplete: false
      });
    }

    if (!fullResponse) {
      throw new Error('Empty response from Gemini');
    }

    const formattedResponse = fullResponse.includes('<code>')
      ? fullResponse
      : `<AskNovaTags>\n1. Processing: Analyzing your request\n</AskNovaTags>\n<code>\n${fullResponse}\n</code>`;

    // Save assistant message
    session.messages.push({
      role: 'assistant',
      content: formattedResponse,
      timestamp: new Date(),
      trainingData: finalTrainingData
    });

    // Update datasets & session info
    session.datasets = datasets.data.map(dataset => ({
      title: dataset.title,
      url: dataset.url,
      subtitle: dataset.subtitle,
      creatorName: dataset.creatorName,
      downloadCount: dataset.downloadCount
    }));

    session.lastActive = new Date();

    // Replace updated session in sessions array
    const sessionIndex = history.sessions.findIndex(s => s.sessionId === session.sessionId);
    if (sessionIndex !== -1) {
      history.sessions[sessionIndex] = session;
    }

    history.markModified('sessions');
    await history.save();

    socket.emit('generate-response-result', {
      sessionId: session.sessionId,
      response: formattedResponse,
      datasets: datasets.data,
      isComplete: true
    });

  } catch (error) {
    socket.emit('error', {
      message: `Response generation failed: ${error.message}`,
      type: 'response-generation'
    });
  }
});


      socket.on('get-sessions', async (data) => {
        try {
          const { userId } = data;
          const history = await History.findOne({
            author: new mongoose.Types.ObjectId(userId)
          });

          socket.emit('sessions-result', {
            sessions: history?.sessions.map(session => ({
              id: session.sessionId,
              title: session.title,
              lastActive: session.lastActive,
              messageCount: session.messages.length
            })) || [],
          });
        } catch (error) {
          socket.emit('error', {
            message: `Failed to get sessions: ${error.message}`,
            type: 'sessions-retrieval'
          });
        }
      });

      socket.on('get-history', async (data) => {
        try {
            const { userId, sessionId } = data;
            const history = await History.findOne({
                author: new mongoose.Types.ObjectId(userId)
            });
        console.log("gistory",history)
            const session = history?.sessions.find(s => s.sessionId === sessionId);
        
            if (!session) {
                socket.emit('history-result', { messages: [], isEmpty: true });
                return;
            }
            
            socket.emit('history-result', {
                sessionId: session.sessionId,
                title: session.title,
                messages: session.messages,
                lastResponse: session.messages
                    .filter(msg => msg.role === 'assistant')
                    .pop()?.content || '',
                datasets: session.datasets || [],
                isEmpty: false
            });
        } catch (error) {
            socket.emit('error', {
                message: `History retrieval failed: ${error.message}`,
                type: 'history-retrieval'
            });
        }
    });

      socket.on('create-session', async (data) => {
        try {
          const { userId, title } = data;
          const history = await History.findOne({
            author: new mongoose.Types.ObjectId(userId)
          });

          if (!history) {
            socket.emit('error', {
              message: 'User history not found',
              type: 'session-creation'
            });
            return;
          }

          const newSession = {
            sessionId: Date.now().toString(),
            title: title || 'New Chat',
            messages: [],
            lastActive: new Date()
          };

          history.sessions.push(newSession);
          await history.save();

          socket.emit('session-created', {
            sessionId: newSession.sessionId,
            title: newSession.title
          });
        } catch (error) {
          socket.emit('error', {
            message: `Session creation failed: ${error.message}`,
            type: 'session-creation'
          });
        }
      });

      socket.on('delete-session', async (data) => {
        try {
          const { userId, sessionId } = data;
          const history = await History.findOne({
            author: new mongoose.Types.ObjectId(userId)
          });

          if (!history) {
            socket.emit('error', {
              message: 'User history not found',
              type: 'session-deletion'
            });
            return;
          }

          history.sessions = history.sessions.filter(s => s.sessionId !== sessionId);
          await history.save();

          socket.emit('session-deleted', { sessionId });
        } catch (error) {
          socket.emit('error', {
            message: `Session deletion failed: ${error.message}`,
            type: 'session-deletion'
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  getIO() {
    return this.io;
  }
}

export default GeminiSocketHandler;