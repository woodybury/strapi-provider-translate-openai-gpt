# OpenAI translation provider for Strapi Translate Plugin

Configure the OpenAi GPT provider through the pluginOptions:

```js
module.exports = {
  // ...
  translate: {
    enabled: true,
    config: {
      // Add the name of your provider here (required)
      provider: 'openai-gpt',
      providerOptions: {
        // Your provider might define some custom options like an apiKey
        // your API key - required and wil cause errors if not provided
        apiKey: 'sk-YOUR_API_KEY',
        // model - default: 'gpt-4o'
        model: 'gpt-4o',
        // max tokens used per one translate operation - default: 4096
        maxTokens: 4096,
        // additional system prompt for the translation - default: none.
        generalPromt: 'Do not translate paths, slugs, etc.',
      },
      // Which field types are translated (default string, text, richtext, components and dynamiczones)
      // Either string or object with type and format
      // Possible formats: plain, markdown, html (default plain)
      translatedFieldTypes: [
        'string',
        { type: 'text', format: 'plain' },
        { type: 'richtext', format: 'markdown' },
        'component',
        'dynamiczone',
      ],
      // If relations should be translated (default true)
      translateRelations: true,
    },
  },
  // ...
}
```

or use environment variables:

- `OPENAI_API_KEY` - default `undefined`
- `OPENAI_MODEL` - default `gpt-4o`
- `OPENAI_MAX_TOKENS` - default `1000`
- `OPENAI_GENERAL_PROMPT` - default `none`
