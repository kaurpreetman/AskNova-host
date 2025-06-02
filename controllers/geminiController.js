import GeminiSocketHandler from '../service/socket.js';

let socketHandler;

const initSocketHandler = (server) => {
  socketHandler = new GeminiSocketHandler(server);
  return socketHandler;
};

const extractKeywordsAndKaggleApiHit = async (req, res) => {
  try {
    if (!socketHandler) {
      return res.status(500).json({ success: false, message: 'Socket handler not initialized' });
    }

    const { userPrompt, userId } = req.body;

    if (!userPrompt || !userId) {
      return res.status(400).json({ success: false, message: 'Prompt and userID are required' });
    }

    socketHandler.getIO().emit('extract-keywords', { userPrompt, userId });

    socketHandler.getIO().once('keywords-result', (data) => {
      res.status(200).json({ success: true, data, message: 'Suggested datasets successfully' });
    });

    socketHandler.getIO().once('error', (error) => {
      res.status(500).json({ success: false, message: `Keyword extraction failed: ${error.message}` });
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const genResponse = async (req, res) => {
  try {
    if (!socketHandler) {
      return res.status(500).json({ success: false, message: 'Socket handler not initialized' });
    }

    const { userPrompt, trainingData, userId } = req.body;

    if (!userPrompt || !userId) {
      return res.status(400).json({ success: false, message: 'Prompt and userID are required' });
    }

    socketHandler.getIO().once('error', (error) => {
      return res.status(500).json({ success: false, message: `Response generation failed: ${error.message}` });
    });

    socketHandler.getIO().once('generate-response-result', (data) => {
      if (!data || !data.response) {
        return res.status(500).json({ success: false, message: 'Invalid response format from Gemini' });
      }

      const response = {
        sessionId: data.sessionId,
        response: data.response,
        datasets: data.datasets || [],
        isComplete: data.isComplete !== false,
      };

      res.status(200).json({ success: true, data: response, message: 'Response generated successfully' });
    });

    socketHandler.getIO().emit('generate-response', {
      userPrompt,
      trainingData,
      userId,
      sessionId: req.body.sessionId || Date.now().toString(),
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getHistory = async (req, res) => {
  try {
    if (!socketHandler) {
      return res.status(500).json({ success: false, message: 'Socket handler not initialized' });
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    socketHandler.getIO().once('history-result', (data) => {
      res.status(200).json({ success: true, data, message: 'History retrieved successfully' });
    });

    socketHandler.getIO().once('error', (error) => {
      res.status(500).json({ success: false, message: `History retrieval failed: ${error.message}` });
    });

    socketHandler.getIO().emit('get-history', { userId });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export {
  initSocketHandler,
  extractKeywordsAndKaggleApiHit,
  genResponse,
  getHistory,
};
