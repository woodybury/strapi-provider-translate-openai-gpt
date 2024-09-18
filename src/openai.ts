import OpenAI from 'openai';

interface OpenAIOptions {
  apiKey: string;
  model: string;
}

interface ITranslateOptions {
  maxTokens: number;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}

class ChatGptTranslator {
  private _openAiClient: OpenAI | null = null;
  constructor(private readonly _options: OpenAIOptions) {}

  private _getOpenAiClient(): OpenAI {
    if (!this._openAiClient) {
      this._openAiClient = new OpenAI({
        apiKey: this._options.apiKey,
      });
    }
    return this._openAiClient;
  }

  public async translate(options: ITranslateOptions): Promise<any> {
    try {
      const response = await this._getOpenAiClient().chat.completions.create({
        model: this._options.model,
        messages: options.messages,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' },
        temperature: 0.2,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const choices = response.choices;

      // console.log('choices', choices);

      if (choices && choices.length > 0) {
        return choices[0].message?.content;
      }
      throw new Error('No result received');
    } catch (error: any) {
      const status = error?.response?.status;

      switch (status) {
        case 429:
          throw new Error('Too many requests');
        case 400:
          throw new Error('Bad request');
        default:
          throw new Error(`translate(): ${JSON.stringify(error)}`);
      }
    }
  }

  public async usage(): Promise<{
    count: number;
    limit: number;
  }> {
    return {
      count: 1,
      limit: 10,
    };
  }
}

const createTranslateClient = ({ apiKey, model }: OpenAIOptions) => {
  return new ChatGptTranslator({ apiKey, model });
};

export { createTranslateClient };
