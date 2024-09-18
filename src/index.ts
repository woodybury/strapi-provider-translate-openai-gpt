import { createTranslateClient } from './openai';
import { getService } from './getService';
import Bottleneck from 'bottleneck';

export const index = 'chatgpt';
export const name = 'ChatGPT';

interface IProviderOptions {
  apiKey?: string;
  model?: string;
  basePath?: string;
  localeMap?: object;
  maxTokens?: number;
  generalPrompt?: string;
}

interface ITranslate {
  text: string | object | string[];
  priority?: number;
  sourceLocale: string;
  targetLocale: string;
  format: 'plain' | 'editorjs';
}

export interface IProvider {
  translate(options: ITranslate): Promise<string | object | string[]>;
  usage(): Promise<{
    count: number;
    limit: number;
  }>;
}

const isEditorJs = (text: string): boolean => {
  try {
    const parsed = JSON.parse(text);
    return parsed.blocks && Array.isArray(parsed.blocks) && parsed.version;
  } catch (error) {
    return false;
  }
};

class ProviderOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly localeMap: object;
  readonly maxTokens: number;
  readonly generalPrompt?: string;

  constructor({ apiKey, model, localeMap, maxTokens, generalPrompt }: IProviderOptions) {
    if (!apiKey) throw new Error(`apiKey is not defined`);
    if (!model) throw new Error(`model is not defined`);
    this.localeMap = localeMap || {};
    this.maxTokens = maxTokens || 4096;
    this.generalPrompt = generalPrompt;

    this.apiKey = apiKey;
    this.model = model;
  }
}

export const init = ({ apiKey, model, localeMap, maxTokens, generalPrompt }: IProviderOptions = {}): IProvider => {
  const options = new ProviderOptions({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
    model: model || process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: Number(maxTokens) || Number(process.env.OPENAI_MAX_TOKENS) || 4096,
    generalPrompt: generalPrompt || process.env.OPENAI_GENERAL_PROMPT || '',
    localeMap,
  });
  const client = createTranslateClient(options);

  const limiter = new Bottleneck({
    maxConcurrent: 1,
  });

  return {
    async translate({
      text,
      priority,
      sourceLocale,
      targetLocale,
      format,
    }: ITranslate): Promise<string | object | string[]> {
      if (!text) {
        return '';
      }

      if (!sourceLocale) {
        throw new Error('source locale must be defined');
      }

      if (!targetLocale) {
        throw new Error('target locale must be defined');
      }

      const textArray = Array.isArray(text) ? text : [text];

      const sLocale = sourceLocale;
      const tLocale = targetLocale;

      const promptMap: {
        plain: string;
        editorjs: string;
      } = {
        plain: `Translate the key content in JSON from ${sLocale} to ${tLocale}.`,
        editorjs: `Translate the key content editorjs JSON object from ${sLocale} to ${tLocale}, only translating text fields: for "paragraph" it's "text", for "header" it's "text", for "list" it's "items", for "checklist" it's "items", for "quote" it's "text" and "caption", for "table" it's "content", for "image" it's "caption", and for "link_tool" it's "meta.title" and "meta.description". It is important to preserve the structure and leave all other fields untouched.`,
      };

      if (options.generalPrompt) {
        promptMap.plain += `\n\n${options.generalPrompt}`;
        promptMap.editorjs += `\n\n${options.generalPrompt}`;
      }

      const formattedTextArray: {
        type: 'plain' | 'editorjs';
        content: any;
      }[] = textArray
        .map((t) => {
          try {
            if (isEditorJs(t as string)) {
              const editorjs = JSON.parse(t as string);
              return { type: 'editorjs', content: editorjs };
            } else {
              return { type: 'plain', content: t };
            }
          } catch (error) {
            return error;
          }
        })
        .filter((t): t is { type: 'plain' | 'editorjs'; content: any } => t !== undefined);

      const messagesArray = formattedTextArray.map((t) => {
        return [
          {
            role: 'system',
            content: promptMap[t.type],
          },
          { role: 'user', content: JSON.stringify(t) },
        ];
      });

      const result = await Promise.all(
        messagesArray.map((messages: any) =>
          limiter.schedule(() => {
            return client.translate({
              messages,
              maxTokens: options.maxTokens,
            });
          }),
        ),
      );

      // console.log('result1', result);

      const cleanedResult = result.map((r) => {
        const parsed = JSON.parse(r);

        if (parsed.type === 'plain') {
          return parsed.content;
        }

        return JSON.stringify(parsed.content);
      });

      return Array.isArray(text) ? cleanedResult : cleanedResult[0];
    },
    async usage(): Promise<{
      count: number;
      limit: number;
    }> {
      return client.usage();
    },
  };
};
