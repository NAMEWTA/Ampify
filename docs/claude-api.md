## Create

**post** `/v1/messages`

Send a structured list of input messages with text and/or image content, and the model will generate the next message in the conversation.

The Messages API can be used for either single queries or stateless multi-turn conversations.

Learn more about the Messages API in our [user guide](https://docs.claude.com/en/docs/initial-setup)

### Body Parameters

- `max_tokens: number`

  The maximum number of tokens to generate before stopping.

  Note that our models may stop _before_ reaching this maximum. This parameter only specifies the absolute maximum number of tokens to generate.

  Different models have different maximum values for this parameter.  See [models](https://docs.claude.com/en/docs/models-overview) for details.

- `messages: array of MessageParam`

  Input messages.

  Our models are trained to operate on alternating `user` and `assistant` conversational turns. When creating a new `Message`, you specify the prior conversational turns with the `messages` parameter, and the model then generates the next `Message` in the conversation. Consecutive `user` or `assistant` turns in your request will be combined into a single turn.

  Each input message must be an object with a `role` and `content`. You can specify a single `user`-role message, or you can include multiple `user` and `assistant` messages.

  If the final message uses the `assistant` role, the response content will continue immediately from the content in that message. This can be used to constrain part of the model's response.

  Example with a single `user` message:

  ```json
  [{"role": "user", "content": "Hello, Claude"}]
  ```

  Example with multiple conversational turns:

  ```json
  [
    {"role": "user", "content": "Hello there."},
    {"role": "assistant", "content": "Hi, I'm Claude. How can I help you?"},
    {"role": "user", "content": "Can you explain LLMs in plain English?"},
  ]
  ```

  Example with a partially-filled response from Claude:

  ```json
  [
    {"role": "user", "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"},
    {"role": "assistant", "content": "The best answer is ("},
  ]
  ```

  Each input message `content` may be either a single `string` or an array of content blocks, where each block has a specific `type`. Using a `string` for `content` is shorthand for an array of one content block of type `"text"`. The following input messages are equivalent:

  ```json
  {"role": "user", "content": "Hello, Claude"}
  ```

  ```json
  {"role": "user", "content": [{"type": "text", "text": "Hello, Claude"}]}
  ```

  See [input examples](https://docs.claude.com/en/api/messages-examples).

  Note that if you want to include a [system prompt](https://docs.claude.com/en/docs/system-prompts), you can use the top-level `system` parameter — there is no `"system"` role for input messages in the Messages API.

  There is a limit of 100,000 messages in a single request.

  - `content: string or array of ContentBlockParam`

    - `UnionMember0 = string`

    - `UnionMember1 = array of ContentBlockParam`

      - `TextBlockParam = object { text, type, cache_control, citations }`

        - `text: string`

        - `type: "text"`

          - `"text"`

        - `cache_control: optional CacheControlEphemeral`

          Create a cache control breakpoint at this content block.

          - `type: "ephemeral"`

            - `"ephemeral"`

          - `ttl: optional "5m" or "1h"`

            The time-to-live for the cache control breakpoint.

            This may be one the following values:

            - `5m`: 5 minutes
            - `1h`: 1 hour

            Defaults to `5m`.

            - `"5m"`

            - `"1h"`

        - `citations: optional array of TextCitationParam`

          - `CitationCharLocationParam = object { cited_text, document_index, document_title, 3 more }`

            - `cited_text: string`

            - `document_index: number`

            - `document_title: string`

            - `end_char_index: number`

            - `start_char_index: number`

            - `type: "char_location"`

              - `"char_location"`

          - `CitationPageLocationParam = object { cited_text, document_index, document_title, 3 more }`

            - `cited_text: string`

            - `document_index: number`

            - `document_title: string`

            - `end_page_number: number`

            - `start_page_number: number`

            - `type: "page_location"`

              - `"page_location"`

          - `CitationContentBlockLocationParam = object { cited_text, document_index, document_title, 3 more }`

            - `cited_text: string`

            - `document_index: number`

            - `document_title: string`

            - `end_block_index: number`

            - `start_block_index: number`

            - `type: "content_block_location"`

              - `"content_block_location"`

          - `CitationWebSearchResultLocationParam = object { cited_text, encrypted_index, title, 2 more }`

            - `cited_text: string`

            - `encrypted_index: string`

            - `title: string`

            - `type: "web_search_result_location"`

              - `"web_search_result_location"`

            - `url: string`

          - `CitationSearchResultLocationParam = object { cited_text, end_block_index, search_result_index, 4 more }`

            - `cited_text: string`

            - `end_block_index: number`

            - `search_result_index: number`

            - `source: string`

            - `start_block_index: number`

            - `title: string`

            - `type: "search_result_location"`

              - `"search_result_location"`

      - `ImageBlockParam = object { source, type, cache_control }`

        - `source: Base64ImageSource or URLImageSource`

          - `Base64ImageSource = object { data, media_type, type }`

            - `data: string`

            - `media_type: "image/jpeg" or "image/png" or "image/gif" or "image/webp"`

              - `"image/jpeg"`

              - `"image/png"`

              - `"image/gif"`

              - `"image/webp"`

            - `type: "base64"`

              - `"base64"`

          - `URLImageSource = object { type, url }`

            - `type: "url"`

              - `"url"`

            - `url: string`

        - `type: "image"`

          - `"image"`

        - `cache_control: optional CacheControlEphemeral`

          Create a cache control breakpoint at this content block.

          - `type: "ephemeral"`

            - `"ephemeral"`

          - `ttl: optional "5m" or "1h"`

            The time-to-live for the cache control breakpoint.

            This may be one the following values:

            - `5m`: 5 minutes
            - `1h`: 1 hour

            Defaults to `5m`.

            - `"5m"`

            - `"1h"`

      - `DocumentBlockParam = object { source, type, cache_control, 3 more }`

        - `source: Base64PDFSource or PlainTextSource or ContentBlockSource or URLPDFSource`

          - `Base64PDFSource = object { data, media_type, type }`

            - `data: string`

            - `media_type: "application/pdf"`

              - `"application/pdf"`

            - `type: "base64"`

              - `"base64"`

          - `PlainTextSource = object { data, media_type, type }`

            - `data: string`

            - `media_type: "text/plain"`

              - `"text/plain"`

            - `type: "text"`

              - `"text"`

          - `ContentBlockSource = object { content, type }`

            - `content: string or array of ContentBlockSourceContent`

              - `UnionMember0 = string`

              - `ContentBlockSourceContent = array of ContentBlockSourceContent`

                - `TextBlockParam = object { text, type, cache_control, citations }`

                  - `text: string`

                  - `type: "text"`

                    - `"text"`

                  - `cache_control: optional CacheControlEphemeral`

                    Create a cache control breakpoint at this content block.

                    - `type: "ephemeral"`

                      - `"ephemeral"`

                    - `ttl: optional "5m" or "1h"`

                      The time-to-live for the cache control breakpoint.

                      This may be one the following values:

                      - `5m`: 5 minutes
                      - `1h`: 1 hour

                      Defaults to `5m`.

                      - `"5m"`

                      - `"1h"`

                  - `citations: optional array of TextCitationParam`

                    - `CitationCharLocationParam = object { cited_text, document_index, document_title, 3 more }`

                      - `cited_text: string`

                      - `document_index: number`

                      - `document_title: string`

                      - `end_char_index: number`

                      - `start_char_index: number`

                      - `type: "char_location"`

                        - `"char_location"`

                    - `CitationPageLocationParam = object { cited_text, document_index, document_title, 3 more }`

                      - `cited_text: string`

                      - `document_index: number`

                      - `document_title: string`

                      - `end_page_number: number`

                      - `start_page_number: number`

                      - `type: "page_location"`

                        - `"page_location"`

                    - `CitationContentBlockLocationParam = object { cited_text, document_index, document_title, 3 more }`

                      - `cited_text: string`

                      - `document_index: number`

                      - `document_title: string`

                      - `end_block_index: number`

                      - `start_block_index: number`

                      - `type: "content_block_location"`

                        - `"content_block_location"`

                    - `CitationWebSearchResultLocationParam = object { cited_text, encrypted_index, title, 2 more }`

                      - `cited_text: string`

                      - `encrypted_index: string`

                      - `title: string`

                      - `type: "web_search_result_location"`

                        - `"web_search_result_location"`

                      - `url: string`

                    - `CitationSearchResultLocationParam = object { cited_text, end_block_index, search_result_index, 4 more }`

                      - `cited_text: string`

                      - `end_block_index: number`

                      - `search_result_index: number`

                      - `source: string`

                      - `start_block_index: number`

                      - `title: string`

                      - `type: "search_result_location"`

                        - `"search_result_location"`

                - `ImageBlockParam = object { source, type, cache_control }`

                  - `source: Base64ImageSource or URLImageSource`

                    - `Base64ImageSource = object { data, media_type, type }`

                      - `data: string`

                      - `media_type: "image/jpeg" or "image/png" or "image/gif" or "image/webp"`

                        - `"image/jpeg"`

                        - `"image/png"`

                        - `"image/gif"`

                        - `"image/webp"`

                      - `type: "base64"`

                        - `"base64"`

                    - `URLImageSource = object { type, url }`

                      - `type: "url"`

                        - `"url"`

                      - `url: string`

                  - `type: "image"`

                    - `"image"`

                  - `cache_control: optional CacheControlEphemeral`

                    Create a cache control breakpoint at this content block.

                    - `type: "ephemeral"`

                      - `"ephemeral"`

                    - `ttl: optional "5m" or "1h"`

                      The time-to-live for the cache control breakpoint.

                      This may be one the following values:

                      - `5m`: 5 minutes
                      - `1h`: 1 hour

                      Defaults to `5m`.

                      - `"5m"`

                      - `"1h"`

            - `type: "content"`

              - `"content"`

          - `URLPDFSource = object { type, url }`

            - `type: "url"`

              - `"url"`

            - `url: string`

        - `type: "document"`

          - `"document"`

        - `cache_control: optional CacheControlEphemeral`

          Create a cache control breakpoint at this content block.

          - `type: "ephemeral"`

            - `"ephemeral"`

          - `ttl: optional "5m" or "1h"`

            The time-to-live for the cache control breakpoint.

            This may be one the following values:

            - `5m`: 5 minutes
            - `1h`: 1 hour

            Defaults to `5m`.

            - `"5m"`

            - `"1h"`

        - `citations: optional CitationsConfigParam`

          - `enabled: optional boolean`

        - `context: optional string`

        - `title: optional string`

      - `SearchResultBlockParam = object { content, source, title, 3 more }`

        - `content: array of TextBlockParam`

          - `text: string`

          - `type: "text"`

            - `"text"`

          - `cache_control: optional CacheControlEphemeral`

            Create a cache control breakpoint at this content block.

            - `type: "ephemeral"`

              - `"ephemeral"`

            - `ttl: optional "5m" or "1h"`

              The time-to-live for the cache control breakpoint.

              This may be one the following values:

              - `5m`: 5 minutes
              - `1h`: 1 hour

              Defaults to `5m`.

              - `"5m"`

              - `"1h"`

          - `citations: optional array of TextCitationParam`

            - `CitationCharLocationParam = object { cited_text, document_index, document_title, 3 more }`

              - `cited_text: string`

              - `document_index: number`

              - `document_title: string`

              - `end_char_index: number`

              - `start_char_index: number`

              - `type: "char_location"`

                - `"char_location"`

            - `CitationPageLocationParam = object { cited_text, document_index, document_title, 3 more }`

              - `cited_text: string`

              - `document_index: number`

              - `document_title: string`

              - `end_page_number: number`

              - `start_page_number: number`

              - `type: "page_location"`

                - `"page_location"`

            - `CitationContentBlockLocationParam = object { cited_text, document_index, document_title, 3 more }`

              - `cited_text: string`

              - `document_index: number`

              - `document_title: string`

              - `end_block_index: number`

              - `start_block_index: number`

              - `type: "content_block_location"`

                - `"content_block_location"`

            - `CitationWebSearchResultLocationParam = object { cited_text, encrypted_index, title, 2 more }`

              - `cited_text: string`

              - `encrypted_index: string`

              - `title: string`

              - `type: "web_search_result_location"`

                - `"web_search_result_location"`

              - `url: string`

            - `CitationSearchResultLocationParam = object { cited_text, end_block_index, search_result_index, 4 more }`

              - `cited_text: string`

              - `end_block_index: number`

              - `search_result_index: number`

              - `source: string`

              - `start_block_index: number`

              - `title: string`

              - `type: "search_result_location"`

                - `"search_result_location"`

        - `source: string`

        - `title: string`

        - `type: "search_result"`

          - `"search_result"`

        - `cache_control: optional CacheControlEphemeral`

          Create a cache control breakpoint at this content block.

          - `type: "ephemeral"`

            - `"ephemeral"`

          - `ttl: optional "5m" or "1h"`

            The time-to-live for the cache control breakpoint.

            This may be one the following values:

            - `5m`: 5 minutes
            - `1h`: 1 hour

            Defaults to `5m`.

            - `"5m"`

            - `"1h"`

        - `citations: optional CitationsConfigParam`

          - `enabled: optional boolean`

      - `ThinkingBlockParam = object { signature, thinking, type }`

        - `signature: string`

        - `thinking: string`

        - `type: "thinking"`

          - `"thinking"`

      - `RedactedThinkingBlockParam = object { data, type }`

        - `data: string`

        - `type: "redacted_thinking"`

          - `"redacted_thinking"`

      - `ToolUseBlockParam = object { id, input, name, 2 more }`

        - `id: string`

        - `input: map[unknown]`

        - `name: string`

        - `type: "tool_use"`

          - `"tool_use"`

        - `cache_control: optional CacheControlEphemeral`

          Create a cache control breakpoint at this content block.

          - `type: "ephemeral"`

            - `"ephemeral"`

          - `ttl: optional "5m" or "1h"`

            The time-to-live for the cache control breakpoint.

            This may be one the following values:

            - `5m`: 5 minutes
            - `1h`: 1 hour

            Defaults to `5m`.

            - `"5m"`

            - `"1h"`

      - `ToolResultBlockParam = object { tool_use_id, type, cache_control, 2 more }`

        - `tool_use_id: string`

        - `type: "tool_result"`

          - `"tool_result"`

        - `cache_control: optional CacheControlEphemeral`

          Create a cache control breakpoint at this content block.

          - `type: "ephemeral"`

            - `"ephemeral"`

          - `ttl: optional "5m" or "1h"`

            The time-to-live for the cache control breakpoint.

            This may be one the following values:

            - `5m`: 5 minutes
            - `1h`: 1 hour

            Defaults to `5m`.

            - `"5m"`

            - `"1h"`

        - `content: optional string or array of TextBlockParam or ImageBlockParam or SearchResultBlockParam or DocumentBlockParam`

          - `UnionMember0 = string`

          - `UnionMember1 = array of TextBlockParam or ImageBlockParam or SearchResultBlockParam or DocumentBlockParam`

            - `TextBlockParam = object { text, type, cache_control, citations }`

              - `text: string`

              - `type: "text"`

                - `"text"`

              - `cache_control: optional CacheControlEphemeral`

                Create a cache control breakpoint at this content block.

                - `type: "ephemeral"`

                  - `"ephemeral"`

                - `ttl: optional "5m" or "1h"`

                  The time-to-live for the cache control breakpoint.

                  This may be one the following values:

                  - `5m`: 5 minutes
                  - `1h`: 1 hour

                  Defaults to `5m`.

                  - `"5m"`

                  - `"1h"`

              - `citations: optional array of TextCitationParam`

                - `CitationCharLocationParam = object { cited_text, document_index, document_title, 3 more }`

                  - `cited_text: string`

                  - `document_index: number`

                  - `document_title: string`

                  - `end_char_index: number`

                  - `start_char_index: number`

                  - `type: "char_location"`

                    - `"char_location"`

                - `CitationPageLocationParam = object { cited_text, document_index, document_title, 3 more }`

                  - `cited_text: string`

                  - `document_index: number`

                  - `document_title: string`

                  - `end_page_number: number`

                  - `start_page_number: number`

                  - `type: "page_location"`

                    - `"page_location"`

                - `CitationContentBlockLocationParam = object { cited_text, document_index, document_title, 3 more }`

                  - `cited_text: string`

                  - `document_index: number`

                  - `document_title: string`

                  - `end_block_index: number`

                  - `start_block_index: number`

                  - `type: "content_block_location"`

                    - `"content_block_location"`

                - `CitationWebSearchResultLocationParam = object { cited_text, encrypted_index, title, 2 more }`

                  - `cited_text: string`

                  - `encrypted_index: string`

                  - `title: string`

                  - `type: "web_search_result_location"`

                    - `"web_search_result_location"`

                  - `url: string`

                - `CitationSearchResultLocationParam = object { cited_text, end_block_index, search_result_index, 4 more }`

                  - `cited_text: string`

                  - `end_block_index: number`

                  - `search_result_index: number`

                  - `source: string`

                  - `start_block_index: number`

                  - `title: string`

                  - `type: "search_result_location"`

                    - `"search_result_location"`

            - `ImageBlockParam = object { source, type, cache_control }`

              - `source: Base64ImageSource or URLImageSource`

                - `Base64ImageSource = object { data, media_type, type }`

                  - `data: string`

                  - `media_type: "image/jpeg" or "image/png" or "image/gif" or "image/webp"`

                    - `"image/jpeg"`

                    - `"image/png"`

                    - `"image/gif"`

                    - `"image/webp"`

                  - `type: "base64"`

                    - `"base64"`

                - `URLImageSource = object { type, url }`

                  - `type: "url"`

                    - `"url"`

                  - `url: string`

              - `type: "image"`

                - `"image"`

              - `cache_control: optional CacheControlEphemeral`

                Create a cache control breakpoint at this content block.

                - `type: "ephemeral"`

                  - `"ephemeral"`

                - `ttl: optional "5m" or "1h"`

                  The time-to-live for the cache control breakpoint.

                  This may be one the following values:

                  - `5m`: 5 minutes
                  - `1h`: 1 hour

                  Defaults to `5m`.

                  - `"5m"`

                  - `"1h"`

            - `SearchResultBlockParam = object { content, source, title, 3 more }`

              - `content: array of TextBlockParam`

                - `text: string`

                - `type: "text"`

                  - `"text"`

                - `cache_control: optional CacheControlEphemeral`

                  Create a cache control breakpoint at this content block.

                  - `type: "ephemeral"`

                    - `"ephemeral"`

                  - `ttl: optional "5m" or "1h"`

                    The time-to-live for the cache control breakpoint.

                    This may be one the following values:

                    - `5m`: 5 minutes
                    - `1h`: 1 hour

                    Defaults to `5m`.

                    - `"5m"`

                    - `"1h"`

                - `citations: optional array of TextCitationParam`

                  - `CitationCharLocationParam = object { cited_text, document_index, document_title, 3 more }`

                    - `cited_text: string`

                    - `document_index: number`

                    - `document_title: string`

                    - `end_char_index: number`

                    - `start_char_index: number`

                    - `type: "char_location"`

                      - `"char_location"`

                  - `CitationPageLocationParam = object { cited_text, document_index, document_title, 3 more }`

                    - `cited_text: string`

                    - `document_index: number`

                    - `document_title: string`

                    - `end_page_number: number`

                    - `start_page_number: number`

                    - `type: "page_location"`

                      - `"page_location"`

                  - `CitationContentBlockLocationParam = object { cited_text, document_index, document_title, 3 more }`

                    - `cited_text: string`

                    - `document_index: number`

                    - `document_title: string`

                    - `end_block_index: number`

                    - `start_block_index: number`

                    - `type: "content_block_location"`

                      - `"content_block_location"`

                  - `CitationWebSearchResultLocationParam = object { cited_text, encrypted_index, title, 2 more }`

                    - `cited_text: string`

                    - `encrypted_index: string`

                    - `title: string`

                    - `type: "web_search_result_location"`

                      - `"web_search_result_location"`

                    - `url: string`

                  - `CitationSearchResultLocationParam = object { cited_text, end_block_index, search_result_index, 4 more }`

                    - `cited_text: string`

                    - `end_block_index: number`

                    - `search_result_index: number`

                    - `source: string`

                    - `start_block_index: number`

                    - `title: string`

                    - `type: "search_result_location"`

                      - `"search_result_location"`

              - `source: string`

              - `title: string`

              - `type: "search_result"`

                - `"search_result"`

              - `cache_control: optional CacheControlEphemeral`

                Create a cache control breakpoint at this content block.

                - `type: "ephemeral"`

                  - `"ephemeral"`

                - `ttl: optional "5m" or "1h"`

                  The time-to-live for the cache control breakpoint.

                  This may be one the following values:

                  - `5m`: 5 minutes
                  - `1h`: 1 hour

                  Defaults to `5m`.

                  - `"5m"`

                  - `"1h"`

              - `citations: optional CitationsConfigParam`

                - `enabled: optional boolean`

            - `DocumentBlockParam = object { source, type, cache_control, 3 more }`

              - `source: Base64PDFSource or PlainTextSource or ContentBlockSource or URLPDFSource`

                - `Base64PDFSource = object { data, media_type, type }`

                  - `data: string`

                  - `media_type: "application/pdf"`

                    - `"application/pdf"`

                  - `type: "base64"`

                    - `"base64"`

                - `PlainTextSource = object { data, media_type, type }`

                  - `data: string`

                  - `media_type: "text/plain"`

                    - `"text/plain"`

                  - `type: "text"`

                    - `"text"`

                - `ContentBlockSource = object { content, type }`

                  - `content: string or array of ContentBlockSourceContent`

                    - `UnionMember0 = string`

                    - `ContentBlockSourceContent = array of ContentBlockSourceContent`

                      - `TextBlockParam = object { text, type, cache_control, citations }`

                        - `text: string`

                        - `type: "text"`

                          - `"text"`

                        - `cache_control: optional CacheControlEphemeral`

                          Create a cache control breakpoint at this content block.

                          - `type: "ephemeral"`

                            - `"ephemeral"`

                          - `ttl: optional "5m" or "1h"`

                            The time-to-live for the cache control breakpoint.

                            This may be one the following values:

                            - `5m`: 5 minutes
                            - `1h`: 1 hour

                            Defaults to `5m`.

                            - `"5m"`

                            - `"1h"`

                        - `citations: optional array of TextCitationParam`

                          - `CitationCharLocationParam = object { cited_text, document_index, document_title, 3 more }`

                            - `cited_text: string`

                            - `document_index: number`

                            - `document_title: string`

                            - `end_char_index: number`

                            - `start_char_index: number`

                            - `type: "char_location"`

                              - `"char_location"`

                          - `CitationPageLocationParam = object { cited_text, document_index, document_title, 3 more }`

                            - `cited_text: string`

                            - `document_index: number`

                            - `document_title: string`

                            - `end_page_number: number`

                            - `start_page_number: number`

                            - `type: "page_location"`

                              - `"page_location"`

                          - `CitationContentBlockLocationParam = object { cited_text, document_index, document_title, 3 more }`

                            - `cited_text: string`

                            - `document_index: number`

                            - `document_title: string`

                            - `end_block_index: number`

                            - `start_block_index: number`

                            - `type: "content_block_location"`

                              - `"content_block_location"`

                          - `CitationWebSearchResultLocationParam = object { cited_text, encrypted_index, title, 2 more }`

                            - `cited_text: string`

                            - `encrypted_index: string`

                            - `title: string`

                            - `type: "web_search_result_location"`

                              - `"web_search_result_location"`

                            - `url: string`

                          - `CitationSearchResultLocationParam = object { cited_text, end_block_index, search_result_index, 4 more }`

                            - `cited_text: string`

                            - `end_block_index: number`

                            - `search_result_index: number`

                            - `source: string`

                            - `start_block_index: number`

                            - `title: string`

                            - `type: "search_result_location"`

                              - `"search_result_location"`

                      - `ImageBlockParam = object { source, type, cache_control }`

                        - `source: Base64ImageSource or URLImageSource`

                          - `Base64ImageSource = object { data, media_type, type }`

                            - `data: string`

                            - `media_type: "image/jpeg" or "image/png" or "image/gif" or "image/webp"`

                              - `"image/jpeg"`

                              - `"image/png"`

                              - `"image/gif"`

                              - `"image/webp"`

                            - `type: "base64"`

                              - `"base64"`

                          - `URLImageSource = object { type, url }`

                            - `type: "url"`

                              - `"url"`

                            - `url: string`

                        - `type: "image"`

                          - `"image"`

                        - `cache_control: optional CacheControlEphemeral`

                          Create a cache control breakpoint at this content block.

                          - `type: "ephemeral"`

                            - `"ephemeral"`

                          - `ttl: optional "5m" or "1h"`

                            The time-to-live for the cache control breakpoint.

                            This may be one the following values:

                            - `5m`: 5 minutes
                            - `1h`: 1 hour

                            Defaults to `5m`.

                            - `"5m"`

                            - `"1h"`

                  - `type: "content"`

                    - `"content"`

                - `URLPDFSource = object { type, url }`

                  - `type: "url"`

                    - `"url"`

                  - `url: string`

              - `type: "document"`

                - `"document"`

              - `cache_control: optional CacheControlEphemeral`

                Create a cache control breakpoint at this content block.

                - `type: "ephemeral"`

                  - `"ephemeral"`

                - `ttl: optional "5m" or "1h"`

                  The time-to-live for the cache control breakpoint.

                  This may be one the following values:

                  - `5m`: 5 minutes
                  - `1h`: 1 hour

                  Defaults to `5m`.

                  - `"5m"`

                  - `"1h"`

              - `citations: optional CitationsConfigParam`

                - `enabled: optional boolean`

              - `context: optional string`

              - `title: optional string`

        - `is_error: optional boolean`

      - `ServerToolUseBlockParam = object { id, input, name, 2 more }`

        - `id: string`

        - `input: map[unknown]`

        - `name: "web_search"`

          - `"web_search"`

        - `type: "server_tool_use"`

          - `"server_tool_use"`

        - `cache_control: optional CacheControlEphemeral`

          Create a cache control breakpoint at this content block.

          - `type: "ephemeral"`

            - `"ephemeral"`

          - `ttl: optional "5m" or "1h"`

            The time-to-live for the cache control breakpoint.

            This may be one the following values:

            - `5m`: 5 minutes
            - `1h`: 1 hour

            Defaults to `5m`.

            - `"5m"`

            - `"1h"`

      - `WebSearchToolResultBlockParam = object { content, tool_use_id, type, cache_control }`

        - `content: WebSearchToolResultBlockParamContent`

          - `WebSearchToolResultBlockItem = array of WebSearchResultBlockParam`

            - `encrypted_content: string`

            - `title: string`

            - `type: "web_search_result"`

              - `"web_search_result"`

            - `url: string`

            - `page_age: optional string`

          - `WebSearchToolRequestError = object { error_code, type }`

            - `error_code: "invalid_tool_input" or "unavailable" or "max_uses_exceeded" or 3 more`

              - `"invalid_tool_input"`

              - `"unavailable"`

              - `"max_uses_exceeded"`

              - `"too_many_requests"`

              - `"query_too_long"`

              - `"request_too_large"`

            - `type: "web_search_tool_result_error"`

              - `"web_search_tool_result_error"`

        - `tool_use_id: string`

        - `type: "web_search_tool_result"`

          - `"web_search_tool_result"`

        - `cache_control: optional CacheControlEphemeral`

          Create a cache control breakpoint at this content block.

          - `type: "ephemeral"`

            - `"ephemeral"`

          - `ttl: optional "5m" or "1h"`

            The time-to-live for the cache control breakpoint.

            This may be one the following values:

            - `5m`: 5 minutes
            - `1h`: 1 hour

            Defaults to `5m`.

            - `"5m"`

            - `"1h"`

  - `role: "user" or "assistant"`

    - `"user"`

    - `"assistant"`

- `model: Model`

  The model that will complete your prompt.

  See [models](https://docs.anthropic.com/en/docs/models-overview) for additional details and options.

  - `UnionMember0 = "claude-opus-4-6" or "claude-opus-4-5-20251101" or "claude-opus-4-5" or 18 more`

    The model that will complete your prompt.

    See [models](https://docs.anthropic.com/en/docs/models-overview) for additional details and options.

    - `"claude-opus-4-6"`

      Most intelligent model for building agents and coding

    - `"claude-opus-4-5-20251101"`

      Premium model combining maximum intelligence with practical performance

    - `"claude-opus-4-5"`

      Premium model combining maximum intelligence with practical performance

    - `"claude-3-7-sonnet-latest"`

      High-performance model with early extended thinking

    - `"claude-3-7-sonnet-20250219"`

      High-performance model with early extended thinking

    - `"claude-3-5-haiku-latest"`

      Fastest and most compact model for near-instant responsiveness

    - `"claude-3-5-haiku-20241022"`

      Our fastest model

    - `"claude-haiku-4-5"`

      Hybrid model, capable of near-instant responses and extended thinking

    - `"claude-haiku-4-5-20251001"`

      Hybrid model, capable of near-instant responses and extended thinking

    - `"claude-sonnet-4-20250514"`

      High-performance model with extended thinking

    - `"claude-sonnet-4-0"`

      High-performance model with extended thinking

    - `"claude-4-sonnet-20250514"`

      High-performance model with extended thinking

    - `"claude-sonnet-4-5"`

      Our best model for real-world agents and coding

    - `"claude-sonnet-4-5-20250929"`

      Our best model for real-world agents and coding

    - `"claude-opus-4-0"`

      Our most capable model

    - `"claude-opus-4-20250514"`

      Our most capable model

    - `"claude-4-opus-20250514"`

      Our most capable model

    - `"claude-opus-4-1-20250805"`

      Our most capable model

    - `"claude-3-opus-latest"`

      Excels at writing and complex tasks

    - `"claude-3-opus-20240229"`

      Excels at writing and complex tasks

    - `"claude-3-haiku-20240307"`

      Our previous most fast and cost-effective

  - `UnionMember1 = string`

- `inference_geo: optional string`

  Specifies the geographic region for inference processing. If not specified, the workspace's `default_inference_geo` is used.

- `metadata: optional Metadata`

  An object describing metadata about the request.

  - `user_id: optional string`

    An external identifier for the user who is associated with the request.

    This should be a uuid, hash value, or other opaque identifier. Anthropic may use this id to help detect abuse. Do not include any identifying information such as name, email address, or phone number.

- `output_config: optional OutputConfig`

  Configuration options for the model's output, such as the output format.

  - `effort: optional "low" or "medium" or "high" or "max"`

    All possible effort levels.

    - `"low"`

    - `"medium"`

    - `"high"`

    - `"max"`

  - `format: optional JSONOutputFormat`

    A schema to specify Claude's output format in responses. See [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

    - `schema: map[unknown]`

      The JSON schema of the format

    - `type: "json_schema"`

      - `"json_schema"`

- `service_tier: optional "auto" or "standard_only"`

  Determines whether to use priority capacity (if available) or standard capacity for this request.

  Anthropic offers different levels of service for your API requests. See [service-tiers](https://docs.claude.com/en/api/service-tiers) for details.

  - `"auto"`

  - `"standard_only"`

- `stop_sequences: optional array of string`

  Custom text sequences that will cause the model to stop generating.

  Our models will normally stop when they have naturally completed their turn, which will result in a response `stop_reason` of `"end_turn"`.

  If you want the model to stop generating when it encounters custom strings of text, you can use the `stop_sequences` parameter. If the model encounters one of the custom sequences, the response `stop_reason` value will be `"stop_sequence"` and the response `stop_sequence` value will contain the matched stop sequence.

- `stream: optional boolean`

  Whether to incrementally stream the response using server-sent events.

  See [streaming](https://docs.claude.com/en/api/messages-streaming) for details.

- `system: optional string or array of TextBlockParam`

  System prompt.

  A system prompt is a way of providing context and instructions to Claude, such as specifying a particular goal or role. See our [guide to system prompts](https://docs.claude.com/en/docs/system-prompts).

  - `UnionMember0 = string`

  - `UnionMember1 = array of TextBlockParam`

    - `text: string`

    - `type: "text"`

      - `"text"`

    - `cache_control: optional CacheControlEphemeral`

      Create a cache control breakpoint at this content block.

      - `type: "ephemeral"`

        - `"ephemeral"`

      - `ttl: optional "5m" or "1h"`

        The time-to-live for the cache control breakpoint.

        This may be one the following values:

        - `5m`: 5 minutes
        - `1h`: 1 hour

        Defaults to `5m`.

        - `"5m"`

        - `"1h"`

    - `citations: optional array of TextCitationParam`

      - `CitationCharLocationParam = object { cited_text, document_index, document_title, 3 more }`

        - `cited_text: string`

        - `document_index: number`

        - `document_title: string`

        - `end_char_index: number`

        - `start_char_index: number`

        - `type: "char_location"`

          - `"char_location"`

      - `CitationPageLocationParam = object { cited_text, document_index, document_title, 3 more }`

        - `cited_text: string`

        - `document_index: number`

        - `document_title: string`

        - `end_page_number: number`

        - `start_page_number: number`

        - `type: "page_location"`

          - `"page_location"`

      - `CitationContentBlockLocationParam = object { cited_text, document_index, document_title, 3 more }`

        - `cited_text: string`

        - `document_index: number`

        - `document_title: string`

        - `end_block_index: number`

        - `start_block_index: number`

        - `type: "content_block_location"`

          - `"content_block_location"`

      - `CitationWebSearchResultLocationParam = object { cited_text, encrypted_index, title, 2 more }`

        - `cited_text: string`

        - `encrypted_index: string`

        - `title: string`

        - `type: "web_search_result_location"`

          - `"web_search_result_location"`

        - `url: string`

      - `CitationSearchResultLocationParam = object { cited_text, end_block_index, search_result_index, 4 more }`

        - `cited_text: string`

        - `end_block_index: number`

        - `search_result_index: number`

        - `source: string`

        - `start_block_index: number`

        - `title: string`

        - `type: "search_result_location"`

          - `"search_result_location"`

- `temperature: optional number`

  Amount of randomness injected into the response.

  Defaults to `1.0`. Ranges from `0.0` to `1.0`. Use `temperature` closer to `0.0` for analytical / multiple choice, and closer to `1.0` for creative and generative tasks.

  Note that even with `temperature` of `0.0`, the results will not be fully deterministic.

- `thinking: optional ThinkingConfigParam`

  Configuration for enabling Claude's extended thinking.

  When enabled, responses include `thinking` content blocks showing Claude's thinking process before the final answer. Requires a minimum budget of 1,024 tokens and counts towards your `max_tokens` limit.

  See [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking) for details.

  - `ThinkingConfigEnabled = object { budget_tokens, type }`

    - `budget_tokens: number`

      Determines how many tokens Claude can use for its internal reasoning process. Larger budgets can enable more thorough analysis for complex problems, improving response quality.

      Must be ≥1024 and less than `max_tokens`.

      See [extended thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking) for details.

    - `type: "enabled"`

      - `"enabled"`

  - `ThinkingConfigDisabled = object { type }`

    - `type: "disabled"`

      - `"disabled"`

  - `ThinkingConfigAdaptive = object { type }`

    - `type: "adaptive"`

      - `"adaptive"`

- `tool_choice: optional ToolChoice`

  How the model should use the provided tools. The model can use a specific tool, any available tool, decide by itself, or not use tools at all.

  - `ToolChoiceAuto = object { type, disable_parallel_tool_use }`

    The model will automatically decide whether to use tools.

    - `type: "auto"`

      - `"auto"`

    - `disable_parallel_tool_use: optional boolean`

      Whether to disable parallel tool use.

      Defaults to `false`. If set to `true`, the model will output at most one tool use.

  - `ToolChoiceAny = object { type, disable_parallel_tool_use }`

    The model will use any available tools.

    - `type: "any"`

      - `"any"`

    - `disable_parallel_tool_use: optional boolean`

      Whether to disable parallel tool use.

      Defaults to `false`. If set to `true`, the model will output exactly one tool use.

  - `ToolChoiceTool = object { name, type, disable_parallel_tool_use }`

    The model will use the specified tool with `tool_choice.name`.

    - `name: string`

      The name of the tool to use.

    - `type: "tool"`

      - `"tool"`

    - `disable_parallel_tool_use: optional boolean`

      Whether to disable parallel tool use.

      Defaults to `false`. If set to `true`, the model will output exactly one tool use.

  - `ToolChoiceNone = object { type }`

    The model will not be allowed to use tools.

    - `type: "none"`

      - `"none"`

- `tools: optional array of ToolUnion`

  Definitions of tools that the model may use.

  If you include `tools` in your API request, the model may return `tool_use` content blocks that represent the model's use of those tools. You can then run those tools using the tool input generated by the model and then optionally return results back to the model using `tool_result` content blocks.

  There are two types of tools: **client tools** and **server tools**. The behavior described below applies to client tools. For [server tools](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview#server-tools), see their individual documentation as each has its own behavior (e.g., the [web search tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool)).

  Each tool definition includes:

  * `name`: Name of the tool.
  * `description`: Optional, but strongly-recommended description of the tool.
  * `input_schema`: [JSON schema](https://json-schema.org/draft/2020-12) for the tool `input` shape that the model will produce in `tool_use` output content blocks.

  For example, if you defined `tools` as:

  ```json
  [
    {
      "name": "get_stock_price",
      "description": "Get the current stock price for a given ticker symbol.",
      "input_schema": {
        "type": "object",
        "properties": {
          "ticker": {
            "type": "string",
            "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."
          }
        },
        "required": ["ticker"]
      }
    }
  ]
  ```

  And then asked the model "What's the S&P 500 at today?", the model might produce `tool_use` content blocks in the response like this:

  ```json
  [
    {
      "type": "tool_use",
      "id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
      "name": "get_stock_price",
      "input": { "ticker": "^GSPC" }
    }
  ]
  ```

  You might then run your `get_stock_price` tool with `{"ticker": "^GSPC"}` as an input, and return the following back to the model in a subsequent `user` message:

  ```json
  [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
      "content": "259.75 USD"
    }
  ]
  ```

  Tools can be used for workflows that include running client-side tools and functions, or more generally whenever you want the model to produce a particular JSON structure of output.

  See our [guide](https://docs.claude.com/en/docs/tool-use) for more details.

  - `Tool = object { input_schema, name, cache_control, 4 more }`

    - `input_schema: object { type, properties, required }`

      [JSON schema](https://json-schema.org/draft/2020-12) for this tool's input.

      This defines the shape of the `input` that your tool accepts and that the model will produce.

      - `type: "object"`

        - `"object"`

      - `properties: optional map[unknown]`

      - `required: optional array of string`

    - `name: string`

      Name of the tool.

      This is how the tool will be called by the model and in `tool_use` blocks.

    - `cache_control: optional CacheControlEphemeral`

      Create a cache control breakpoint at this content block.

      - `type: "ephemeral"`

        - `"ephemeral"`

      - `ttl: optional "5m" or "1h"`

        The time-to-live for the cache control breakpoint.

        This may be one the following values:

        - `5m`: 5 minutes
        - `1h`: 1 hour

        Defaults to `5m`.

        - `"5m"`

        - `"1h"`

    - `description: optional string`

      Description of what this tool does.

      Tool descriptions should be as detailed as possible. The more information that the model has about what the tool is and how to use it, the better it will perform. You can use natural language descriptions to reinforce important aspects of the tool input JSON schema.

    - `eager_input_streaming: optional boolean`

      Enable eager input streaming for this tool. When true, tool input parameters will be streamed incrementally as they are generated, and types will be inferred on-the-fly rather than buffering the full JSON output. When false, streaming is disabled for this tool even if the fine-grained-tool-streaming beta is active. When null (default), uses the default behavior based on beta headers.

    - `strict: optional boolean`

      When true, guarantees schema validation on tool names and inputs

    - `type: optional "custom"`

      - `"custom"`

  - `ToolBash20250124 = object { name, type, cache_control, strict }`

    - `name: "bash"`

      Name of the tool.

      This is how the tool will be called by the model and in `tool_use` blocks.

      - `"bash"`

    - `type: "bash_20250124"`

      - `"bash_20250124"`

    - `cache_control: optional CacheControlEphemeral`

      Create a cache control breakpoint at this content block.

      - `type: "ephemeral"`

        - `"ephemeral"`

      - `ttl: optional "5m" or "1h"`

        The time-to-live for the cache control breakpoint.

        This may be one the following values:

        - `5m`: 5 minutes
        - `1h`: 1 hour

        Defaults to `5m`.

        - `"5m"`

        - `"1h"`

    - `strict: optional boolean`

      When true, guarantees schema validation on tool names and inputs

  - `ToolTextEditor20250124 = object { name, type, cache_control, strict }`

    - `name: "str_replace_editor"`

      Name of the tool.

      This is how the tool will be called by the model and in `tool_use` blocks.

      - `"str_replace_editor"`

    - `type: "text_editor_20250124"`

      - `"text_editor_20250124"`

    - `cache_control: optional CacheControlEphemeral`

      Create a cache control breakpoint at this content block.

      - `type: "ephemeral"`

        - `"ephemeral"`

      - `ttl: optional "5m" or "1h"`

        The time-to-live for the cache control breakpoint.

        This may be one the following values:

        - `5m`: 5 minutes
        - `1h`: 1 hour

        Defaults to `5m`.

        - `"5m"`

        - `"1h"`

    - `strict: optional boolean`

      When true, guarantees schema validation on tool names and inputs

  - `ToolTextEditor20250429 = object { name, type, cache_control, strict }`

    - `name: "str_replace_based_edit_tool"`

      Name of the tool.

      This is how the tool will be called by the model and in `tool_use` blocks.

      - `"str_replace_based_edit_tool"`

    - `type: "text_editor_20250429"`

      - `"text_editor_20250429"`

    - `cache_control: optional CacheControlEphemeral`

      Create a cache control breakpoint at this content block.

      - `type: "ephemeral"`

        - `"ephemeral"`

      - `ttl: optional "5m" or "1h"`

        The time-to-live for the cache control breakpoint.

        This may be one the following values:

        - `5m`: 5 minutes
        - `1h`: 1 hour

        Defaults to `5m`.

        - `"5m"`

        - `"1h"`

    - `strict: optional boolean`

      When true, guarantees schema validation on tool names and inputs

  - `ToolTextEditor20250728 = object { name, type, cache_control, 2 more }`

    - `name: "str_replace_based_edit_tool"`

      Name of the tool.

      This is how the tool will be called by the model and in `tool_use` blocks.

      - `"str_replace_based_edit_tool"`

    - `type: "text_editor_20250728"`

      - `"text_editor_20250728"`

    - `cache_control: optional CacheControlEphemeral`

      Create a cache control breakpoint at this content block.

      - `type: "ephemeral"`

        - `"ephemeral"`

      - `ttl: optional "5m" or "1h"`

        The time-to-live for the cache control breakpoint.

        This may be one the following values:

        - `5m`: 5 minutes
        - `1h`: 1 hour

        Defaults to `5m`.

        - `"5m"`

        - `"1h"`

    - `max_characters: optional number`

      Maximum number of characters to display when viewing a file. If not specified, defaults to displaying the full file.

    - `strict: optional boolean`

      When true, guarantees schema validation on tool names and inputs

  - `WebSearchTool20250305 = object { name, type, allowed_domains, 5 more }`

    - `name: "web_search"`

      Name of the tool.

      This is how the tool will be called by the model and in `tool_use` blocks.

      - `"web_search"`

    - `type: "web_search_20250305"`

      - `"web_search_20250305"`

    - `allowed_domains: optional array of string`

      If provided, only these domains will be included in results. Cannot be used alongside `blocked_domains`.

    - `blocked_domains: optional array of string`

      If provided, these domains will never appear in results. Cannot be used alongside `allowed_domains`.

    - `cache_control: optional CacheControlEphemeral`

      Create a cache control breakpoint at this content block.

      - `type: "ephemeral"`

        - `"ephemeral"`

      - `ttl: optional "5m" or "1h"`

        The time-to-live for the cache control breakpoint.

        This may be one the following values:

        - `5m`: 5 minutes
        - `1h`: 1 hour

        Defaults to `5m`.

        - `"5m"`

        - `"1h"`

    - `max_uses: optional number`

      Maximum number of times the tool can be used in the API request.

    - `strict: optional boolean`

      When true, guarantees schema validation on tool names and inputs

    - `user_location: optional object { type, city, country, 2 more }`

      Parameters for the user's location. Used to provide more relevant search results.

      - `type: "approximate"`

        - `"approximate"`

      - `city: optional string`

        The city of the user.

      - `country: optional string`

        The two letter [ISO country code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) of the user.

      - `region: optional string`

        The region of the user.

      - `timezone: optional string`

        The [IANA timezone](https://nodatime.org/TimeZones) of the user.

- `top_k: optional number`

  Only sample from the top K options for each subsequent token.

  Used to remove "long tail" low probability responses. [Learn more technical details here](https://towardsdatascience.com/how-to-sample-from-language-models-682bceb97277).

  Recommended for advanced use cases only. You usually only need to use `temperature`.

- `top_p: optional number`

  Use nucleus sampling.

  In nucleus sampling, we compute the cumulative distribution over all the options for each subsequent token in decreasing probability order and cut it off once it reaches a particular probability specified by `top_p`. You should either alter `temperature` or `top_p`, but not both.

  Recommended for advanced use cases only. You usually only need to use `temperature`.

### Returns

- `Message = object { id, content, model, 5 more }`

  - `id: string`

    Unique object identifier.

    The format and length of IDs may change over time.

  - `content: array of ContentBlock`

    Content generated by the model.

    This is an array of content blocks, each of which has a `type` that determines its shape.

    Example:

    ```json
    [{"type": "text", "text": "Hi, I'm Claude."}]
    ```

    If the request input `messages` ended with an `assistant` turn, then the response `content` will continue directly from that last turn. You can use this to constrain the model's output.

    For example, if the input `messages` were:

    ```json
    [
      {"role": "user", "content": "What's the Greek name for Sun? (A) Sol (B) Helios (C) Sun"},
      {"role": "assistant", "content": "The best answer is ("}
    ]
    ```

    Then the response `content` might be:

    ```json
    [{"type": "text", "text": "B)"}]
    ```

    - `TextBlock = object { citations, text, type }`

      - `citations: array of TextCitation`

        Citations supporting the text block.

        The type of citation returned will depend on the type of document being cited. Citing a PDF results in `page_location`, plain text results in `char_location`, and content document results in `content_block_location`.

        - `CitationCharLocation = object { cited_text, document_index, document_title, 4 more }`

          - `cited_text: string`

          - `document_index: number`

          - `document_title: string`

          - `end_char_index: number`

          - `file_id: string`

          - `start_char_index: number`

          - `type: "char_location"`

            - `"char_location"`

        - `CitationPageLocation = object { cited_text, document_index, document_title, 4 more }`

          - `cited_text: string`

          - `document_index: number`

          - `document_title: string`

          - `end_page_number: number`

          - `file_id: string`

          - `start_page_number: number`

          - `type: "page_location"`

            - `"page_location"`

        - `CitationContentBlockLocation = object { cited_text, document_index, document_title, 4 more }`

          - `cited_text: string`

          - `document_index: number`

          - `document_title: string`

          - `end_block_index: number`

          - `file_id: string`

          - `start_block_index: number`

          - `type: "content_block_location"`

            - `"content_block_location"`

        - `CitationsWebSearchResultLocation = object { cited_text, encrypted_index, title, 2 more }`

          - `cited_text: string`

          - `encrypted_index: string`

          - `title: string`

          - `type: "web_search_result_location"`

            - `"web_search_result_location"`

          - `url: string`

        - `CitationsSearchResultLocation = object { cited_text, end_block_index, search_result_index, 4 more }`

          - `cited_text: string`

          - `end_block_index: number`

          - `search_result_index: number`

          - `source: string`

          - `start_block_index: number`

          - `title: string`

          - `type: "search_result_location"`

            - `"search_result_location"`

      - `text: string`

      - `type: "text"`

        - `"text"`

    - `ThinkingBlock = object { signature, thinking, type }`

      - `signature: string`

      - `thinking: string`

      - `type: "thinking"`

        - `"thinking"`

    - `RedactedThinkingBlock = object { data, type }`

      - `data: string`

      - `type: "redacted_thinking"`

        - `"redacted_thinking"`

    - `ToolUseBlock = object { id, input, name, type }`

      - `id: string`

      - `input: map[unknown]`

      - `name: string`

      - `type: "tool_use"`

        - `"tool_use"`

    - `ServerToolUseBlock = object { id, input, name, type }`

      - `id: string`

      - `input: map[unknown]`

      - `name: "web_search"`

        - `"web_search"`

      - `type: "server_tool_use"`

        - `"server_tool_use"`

    - `WebSearchToolResultBlock = object { content, tool_use_id, type }`

      - `content: WebSearchToolResultBlockContent`

        - `WebSearchToolResultError = object { error_code, type }`

          - `error_code: "invalid_tool_input" or "unavailable" or "max_uses_exceeded" or 3 more`

            - `"invalid_tool_input"`

            - `"unavailable"`

            - `"max_uses_exceeded"`

            - `"too_many_requests"`

            - `"query_too_long"`

            - `"request_too_large"`

          - `type: "web_search_tool_result_error"`

            - `"web_search_tool_result_error"`

        - `UnionMember1 = array of WebSearchResultBlock`

          - `encrypted_content: string`

          - `page_age: string`

          - `title: string`

          - `type: "web_search_result"`

            - `"web_search_result"`

          - `url: string`

      - `tool_use_id: string`

      - `type: "web_search_tool_result"`

        - `"web_search_tool_result"`

  - `model: Model`

    The model that will complete your prompt.

    See [models](https://docs.anthropic.com/en/docs/models-overview) for additional details and options.

    - `UnionMember0 = "claude-opus-4-6" or "claude-opus-4-5-20251101" or "claude-opus-4-5" or 18 more`

      The model that will complete your prompt.

      See [models](https://docs.anthropic.com/en/docs/models-overview) for additional details and options.

      - `"claude-opus-4-6"`

        Most intelligent model for building agents and coding

      - `"claude-opus-4-5-20251101"`

        Premium model combining maximum intelligence with practical performance

      - `"claude-opus-4-5"`

        Premium model combining maximum intelligence with practical performance

      - `"claude-3-7-sonnet-latest"`

        High-performance model with early extended thinking

      - `"claude-3-7-sonnet-20250219"`

        High-performance model with early extended thinking

      - `"claude-3-5-haiku-latest"`

        Fastest and most compact model for near-instant responsiveness

      - `"claude-3-5-haiku-20241022"`

        Our fastest model

      - `"claude-haiku-4-5"`

        Hybrid model, capable of near-instant responses and extended thinking

      - `"claude-haiku-4-5-20251001"`

        Hybrid model, capable of near-instant responses and extended thinking

      - `"claude-sonnet-4-20250514"`

        High-performance model with extended thinking

      - `"claude-sonnet-4-0"`

        High-performance model with extended thinking

      - `"claude-4-sonnet-20250514"`

        High-performance model with extended thinking

      - `"claude-sonnet-4-5"`

        Our best model for real-world agents and coding

      - `"claude-sonnet-4-5-20250929"`

        Our best model for real-world agents and coding

      - `"claude-opus-4-0"`

        Our most capable model

      - `"claude-opus-4-20250514"`

        Our most capable model

      - `"claude-4-opus-20250514"`

        Our most capable model

      - `"claude-opus-4-1-20250805"`

        Our most capable model

      - `"claude-3-opus-latest"`

        Excels at writing and complex tasks

      - `"claude-3-opus-20240229"`

        Excels at writing and complex tasks

      - `"claude-3-haiku-20240307"`

        Our previous most fast and cost-effective

    - `UnionMember1 = string`

  - `role: "assistant"`

    Conversational role of the generated message.

    This will always be `"assistant"`.

    - `"assistant"`

  - `stop_reason: StopReason`

    The reason that we stopped.

    This may be one the following values:

    * `"end_turn"`: the model reached a natural stopping point
    * `"max_tokens"`: we exceeded the requested `max_tokens` or the model's maximum
    * `"stop_sequence"`: one of your provided custom `stop_sequences` was generated
    * `"tool_use"`: the model invoked one or more tools
    * `"pause_turn"`: we paused a long-running turn. You may provide the response back as-is in a subsequent request to let the model continue.
    * `"refusal"`: when streaming classifiers intervene to handle potential policy violations

    In non-streaming mode this value is always non-null. In streaming mode, it is null in the `message_start` event and non-null otherwise.

    - `"end_turn"`

    - `"max_tokens"`

    - `"stop_sequence"`

    - `"tool_use"`

    - `"pause_turn"`

    - `"refusal"`

  - `stop_sequence: string`

    Which custom stop sequence was generated, if any.

    This value will be a non-null string if one of your custom stop sequences was generated.

  - `type: "message"`

    Object type.

    For Messages, this is always `"message"`.

    - `"message"`

  - `usage: Usage`

    Billing and rate-limit usage.

    Anthropic's API bills and rate-limits by token counts, as tokens represent the underlying cost to our systems.

    Under the hood, the API transforms requests into a format suitable for the model. The model's output then goes through a parsing stage before becoming an API response. As a result, the token counts in `usage` will not match one-to-one with the exact visible content of an API request or response.

    For example, `output_tokens` will be non-zero, even for an empty string response from Claude.

    Total input tokens in a request is the summation of `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens`.

    - `cache_creation: CacheCreation`

      Breakdown of cached tokens by TTL

      - `ephemeral_1h_input_tokens: number`

        The number of input tokens used to create the 1 hour cache entry.

      - `ephemeral_5m_input_tokens: number`

        The number of input tokens used to create the 5 minute cache entry.

    - `cache_creation_input_tokens: number`

      The number of input tokens used to create the cache entry.

    - `cache_read_input_tokens: number`

      The number of input tokens read from the cache.

    - `inference_geo: string`

      The geographic region where inference was performed for this request.

    - `input_tokens: number`

      The number of input tokens which were used.

    - `output_tokens: number`

      The number of output tokens which were used.

    - `server_tool_use: ServerToolUsage`

      The number of server tool requests.

      - `web_search_requests: number`

        The number of web search tool requests.

    - `service_tier: "standard" or "priority" or "batch"`

      If the request used the priority, standard, or batch tier.

      - `"standard"`

      - `"priority"`

      - `"batch"`

### Example

```http
curl https://api.anthropic.com/v1/messages \
    -H 'Content-Type: application/json' \
    -H 'anthropic-version: 2023-06-01' \
    -H "X-Api-Key: $ANTHROPIC_API_KEY" \
    --max-time 600 \
    -d '{
          "max_tokens": 1024,
          "messages": [
            {
              "content": "Hello, world",
              "role": "user"
            }
          ],
          "model": "claude-opus-4-6"
        }'
```



# Anthropic 对话格式（Messages）中文

📝 简介
给定一组包含文本和/或图像内容的结构化输入消息列表，模型将生成对话中的下一条消息。Messages API 可用于单次查询或无状态的多轮对话。

💡 请求示例
基础文本对话 ✅

curl https://你的api服务器地址/v1/messages \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --header "x-api-key: $API_API_KEY" \
     --data \
'{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
        {"role": "user", "content": "Hello, world"}
    ]
}'
响应示例:


{
  "content": [
    {
      "text": "Hi! My name is Claude.",
      "type": "text"
    }
  ],
  "id": "msg_013Zva2CMHLNnXjNJKqJ2EF",
  "model": "claude-3-5-sonnet-20241022", 
  "role": "assistant",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "type": "message",
  "usage": {
    "input_tokens": 2095,
    "output_tokens": 503
  }
}
图像分析对话 ✅

curl https://你的api服务器地址/v1/messages \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --header "x-api-key: $API_API_KEY" \
     --data \
'{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": "/9j/4AAQSkZJRg..."
                    }
                },
                {
                    "type": "text",
                    "text": "这张图片里有什么?"
                }
            ]
        }
    ]
}'
响应示例:


{
  "content": [
    {
      "text": "这张图片显示了一只橙色的猫咪正在窗台上晒太阳。猫咪看起来很放松，眯着眼睛享受阳光。窗外可以看到一些绿色的植物。",
      "type": "text"
    }
  ],
  "id": "msg_013Zva2CMHLNnXjNJKqJ2EF",
  "model": "claude-3-5-sonnet-20241022",
  "role": "assistant",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "type": "message",
  "usage": {
    "input_tokens": 3050,
    "output_tokens": 892
  }
}
工具调用 ✅

curl https://你的api服务器地址/v1/messages \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --header "x-api-key: $API_API_KEY" \
     --data \
'{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
        {
            "role": "user", 
            "content": "今天北京的天气怎么样?"
        }
    ],
    "tools": [
        {
            "name": "get_weather",
            "description": "获取指定位置的当前天气",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "城市名称,如:北京"
                    }
                },
                "required": ["location"]
            }
        }
    ]
}'
响应示例:


{
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
      "name": "get_weather",
      "input": { "location": "北京" }
    }
  ],
  "id": "msg_013Zva2CMHLNnXjNJKqJ2EF",
  "model": "claude-3-5-sonnet-20241022",
  "role": "assistant",
  "stop_reason": "tool_use",
  "stop_sequence": null,
  "type": "message",
  "usage": {
    "input_tokens": 2156,
    "output_tokens": 468
  }
}
流式响应 ✅

curl https://你的api服务器地址/v1/messages \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --header "x-api-key: $API_API_KEY" \
     --data \
'{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
        {
            "role": "user",
            "content": "讲个故事"
        }
    ],
    "stream": true
}'
响应示例:


{
  "type": "message_start",
  "message": {
    "id": "msg_013Zva2CMHLNnXjNJKqJ2EF",
    "model": "claude-3-5-sonnet-20241022",
    "role": "assistant",
    "type": "message"
  }
}
{
  "type": "content_block_start",
  "index": 0,
  "content_block": {
    "type": "text"
  }
}
{
  "type": "content_block_delta",
  "index": 0,
  "delta": {
    "text": "从前"
  }
}
{
  "type": "content_block_delta",
  "index": 0,
  "delta": {
    "text": "有一只"
  }
}
{
  "type": "content_block_delta",
  "index": 0,
  "delta": {
    "text": "小兔子..."
  }
}
{
  "type": "content_block_stop",
  "index": 0
}
{
  "type": "message_delta",
  "delta": {
    "stop_reason": "end_turn",
    "usage": {
      "input_tokens": 2045,
      "output_tokens": 628
    }
  }
}
{
  "type": "message_stop"
}
📮 请求
端点

POST /v1/messages
鉴权方法
在请求头中包含以下内容进行 API 密钥认证：


x-api-key: $API_API_KEY
其中 $API_API_KEY 是您的 API 密钥。您可以通过控制台获取 API 密钥，每个密钥仅限于一个工作区使用。

请求头参数
anthropic-beta
类型：字符串
必需：否
指定要使用的 beta 版本，支持用逗号分隔的列表如 beta1,beta2，或多次指定该请求头。

anthropic-version
类型：字符串
必需：是
指定要使用的 API 版本。

请求体参数
max_tokens
类型：整数
必需：是
生成的最大 token 数量。不同模型有不同的限制，详见模型文档。范围 x > 1。

messages
类型：对象数组
必需：是
输入消息列表。模型被训练为在用户和助手之间交替进行对话。创建新消息时，您可以使用 messages 参数指定之前的对话轮次，模型将生成对话中的下一条消息。连续的用户或助手消息会被合并为单个轮次。

每个消息必须包含 role 和 content 字段。您可以指定单个用户角色消息，或包含多个用户和助手消息。如果最后一条消息使用助手角色，响应内容将直接从该消息的内容继续，这可以用来约束模型的响应。

单条用户消息示例:


[{"role": "user", "content": "Hello, Claude"}]
多轮对话示例:


[
  {"role": "user", "content": "你好。"},
  {"role": "assistant", "content": "你好！我是 Claude。有什么可以帮你的吗？"},
  {"role": "user", "content": "请用简单的话解释什么是 LLM？"}
]
部分填充的响应示例:


[
  {"role": "user", "content": "太阳的希腊语名字是什么? (A) Sol (B) Helios (C) Sun"},
  {"role": "assistant", "content": "正确答案是 ("}
]
每个消息的 content 可以是字符串或内容块数组。使用字符串相当于一个 "text" 类型的内容块数组的简写。以下两种写法等效：


{"role": "user", "content": "Hello, Claude"}

{
  "role": "user", 
  "content": [{"type": "text", "text": "Hello, Claude"}]
}
从 Claude 3 模型开始，您还可以发送图片内容块：


{
  "role": "user",
  "content": [
    {
      "type": "image",
      "source": {
        "type": "base64",
        "media_type": "image/jpeg",
        "data": "/9j/4AAQSkZJRg..."
      }
    },
    {
      "type": "text",
      "text": "这张图片里有什么?"
    }
  ]
}
目前支持的图片格式包括: base64, image/jpeg、image/png、image/gif 和 image/webp。

messages.role
类型：枚举字符串
必需：是
可选值：user, assistant
注意：Messages API 中没有 "system" 角色，如果需要系统提示，请使用顶层的 system 参数。

messages.content
类型：字符串或对象数组
必需：是
消息内容可以是以下几种类型之一：

文本内容 (Text)

{
  "type": "text",          // 必需，枚举值: "text"
  "text": "Hello, Claude", // 必需，最小长度: 1
  "cache_control": {
    "type": "ephemeral"    // 可选，枚举值: "ephemeral"
  }
}
图片内容 (Image)

{
  "type": "image",         // 必需，枚举值: "image"
  "source": {             // 必需
    "type": "base64",     // 必需，枚举值: "base64"
    "media_type": "image/jpeg", // 必需，支持: image/jpeg, image/png, image/gif, image/webp
    "data": "/9j/4AAQSkZJRg..."  // 必需，base64 编码的图片数据
  },
  "cache_control": {
    "type": "ephemeral"    // 可选，枚举值: "ephemeral"
  }
}
工具使用 (Tool Use)

{
  "type": "tool_use",      // 必需，枚举值: "tool_use"，默认值
  "id": "toolu_xyz...",    // 必需，工具使用的唯一标识符
  "name": "get_weather",   // 必需，工具名称，最小长度: 1
  "input": {              // 必需，工具的输入参数对象
    // 工具输入参数，具体格式由工具的 input_schema 定义
  },
  "cache_control": {
    "type": "ephemeral"    // 可选，枚举值: "ephemeral"
  }
}
工具结果 (Tool Result)

{
  "type": "tool_result",   // 必需，枚举值: "tool_result"
  "tool_use_id": "toolu_xyz...",  // 必需
  "content": "结果内容",   // 必需，可以是字符串或内容块数组
  "is_error": false,      // 可选，布尔值
  "cache_control": {
    "type": "ephemeral"    // 可选，枚举值: "ephemeral"
  }
}
当 content 为内容块数组时，每个内容块可以是文本或图片：


{
  "type": "tool_result",
  "tool_use_id": "toolu_xyz...",
  "content": [
    {
      "type": "text",      // 必需，枚举值: "text"
      "text": "分析结果",   // 必需，最小长度: 1
      "cache_control": {
        "type": "ephemeral" // 可选，枚举值: "ephemeral"
      }
    },
    {
      "type": "image",     // 必需，枚举值: "image"
      "source": {         // 必需
        "type": "base64", // 必需，枚举值: "base64"
        "media_type": "image/jpeg",
        "data": "..."
      },
      "cache_control": {
        "type": "ephemeral"
      }
    }
  ]
}
文档 (Document)

{
  "type": "document",      // 必需，枚举值: "document"
  "source": {             // 必需
    // 文档源数据
  },
  "cache_control": {
    "type": "ephemeral"    // 可选，枚举值: "ephemeral"
  }
}
注意： 1. 每种类型都可以包含可选的 cache_control 字段，用于控制内容的缓存行为 2. 文本内容的最小长度为 1 3. 所有类型的 type 字段都是必需的枚举字符串 4. 工具结果的 content 字段支持字符串或包含文本/图片的内容块数组

model
类型：字符串
必需：是
要使用的模型名称，详见模型文档。范围 1 - 256 个字符。

metadata
类型：对象
必需：否
描述请求元数据的对象。包含以下可选字段：

user_id: 与请求关联的用户的外部标识符。应该是 uuid、哈希值或其他不透明标识符。不要包含任何标识信息如姓名、邮箱或电话号码。最大长度：256。
stop_sequences
类型：字符串数组
必需：否
自定义的停止生成的文本序列。

stream
类型：布尔值
必需：否
是否使用服务器发送事件 (SSE) 来增量返回响应内容。

system
类型：字符串
必需：否
系统 prompt，为 Claude 提供背景和指令。这是一种为模型提供上下文和特定目标或角色的方式。注意这与消息中的 role 不同，Messages API 中没有 "system" 角色。

temperature
类型：数字
必需：否
默认值：1.0
控制生成随机性，0.0 - 1.0。范围 0 < x < 1。建议对于分析性/选择题类任务使用接近 0.0 的值，对于创造性和生成性任务使用接近 1.0 的值。

注意：即使 temperature 设置为 0.0，结果也不会完全确定。

🆕 thinking
类型：对象
必需：否
配置 Claude 的扩展思考功能。启用时，响应将包含展示 Claude 在给出最终答案前的思考过程的内容块。需要至少 1,024 个 token 的预算，并计入您的 max_tokens 限制。

可以设置为以下两种模式之一：

1. 启用模式

{
  "type": "enabled",
  "budget_tokens": 2048
}
type: 必需，枚举值: "enabled"
budget_tokens: 必需，整数。决定 Claude 可以用于内部推理过程的 token 数量。更大的预算可以让模型对复杂问题进行更深入的分析，提高响应质量。必须 ≥1024 且小于 max_tokens。范围 x > 1024。
2. 禁用模式

{
  "type": "disabled"
}
type: 必需，枚举值: "disabled"
tool_choice
类型：对象
必需：否
控制模型如何使用提供的工具。可以是以下三种类型之一：

1. Auto 模式 (自动选择)

{
  "type": "auto",  // 必需，枚举值: "auto"
  "disable_parallel_tool_use": false  // 可选，默认 false。如果为 true，模型最多只会使用一个工具
}
2. Any 模式 (任意工具)

{
  "type": "any",  // 必需，枚举值: "any"
  "disable_parallel_tool_use": false  // 可选，默认 false。如果为 true，模型将恰好使用一个工具
}
3. Tool 模式 (指定工具)

{
  "type": "tool",  // 必需，枚举值: "tool"
  "name": "get_weather",  // 必需，指定要使用的工具名称
  "disable_parallel_tool_use": false  // 可选，默认 false。如果为 true，模型将恰好使用一个工具
}
注意： 1. Auto 模式：模型可以自行决定是否使用工具 2. Any 模式：模型必须使用工具，但可以选择任何可用的工具 3. Tool 模式：模型必须使用指定的工具

tools
类型：对象数组
必需：否
定义模型可能使用的工具。工具可以是自定义工具或内置工具类型：

1. 自定义工具（Tool）
每个自定义工具定义包含：

type: 可选，枚举值: "custom"
name: 工具名称，必需，1-64 个字符
description: 工具描述，建议尽可能详细
input_schema: 工具输入的 JSON Schema 定义，必需
cache_control: 缓存控制，可选，type 为 "ephemeral"
示例：


[
  {
    "type": "custom",
    "name": "get_weather",
    "description": "获取指定位置的当前天气",
    "input_schema": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "城市名称,如:北京"
        }
      },
      "required": ["location"]
    }
  }
]
2. 计算机工具 (ComputerUseTool)

{
  "type": "computer_20241022",  // 必需
  "name": "computer",           // 必需，枚举值: "computer"
  "display_width_px": 1024,     // 必需，显示宽度(像素)
  "display_height_px": 768,     // 必需，显示高度(像素)
  "display_number": 0,          // 可选，X11 显示编号
  "cache_control": {
    "type": "ephemeral"         // 可选
  }
}
3. Bash 工具 (BashTool)

{
  "type": "bash_20241022",      // 必需
  "name": "bash",               // 必需，枚举值: "bash"
  "cache_control": {
    "type": "ephemeral"         // 可选
  }
}
4. 文本编辑器工具 (TextEditor)

{
  "type": "text_editor_20241022", // 必需
  "name": "str_replace_editor",   // 必需，枚举值: "str_replace_editor"
  "cache_control": {
    "type": "ephemeral"           // 可选
  }
}
当模型使用工具时，会返回 tool_use 内容块：


[
  {
    "type": "tool_use",
    "id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
    "name": "get_weather",
    "input": { "location": "北京" }
  }
]
您可以执行工具并通过 tool_result 内容块返回结果：


[
  {
    "type": "tool_result",
    "tool_use_id": "toolu_01D7FLrfh4GYq7yT1ULFeyMV",
    "content": "北京当前天气晴朗，温度 25°C"
  }
]
top_k
类型：整数
必需：否
范围：x > 0
从 token 的前 K 个选项中采样。用于移除低概率的"长尾"响应。建议仅在高级用例中使用，通常只需要调整 temperature。

top_p
类型：数字
必需：否
范围：0 < x < 1
使用 nucleus 采样。计算每个后续 token 按概率降序排列的累积分布，在达到 top_p 指定的概率时截断。建议仅调整 temperature 或 top_p 其中之一，不要同时使用。

📥 响应
成功响应
返回一个聊天补全对象，包含以下字段：

content
类型：对象数组
必需：是
模型生成的内容，由多个内容块组成。每个内容块都有一个确定其形状的 type。内容块可以是以下类型之一：

文本内容块 (Text)

{
  "type": "text",          // 必需，枚举值: "text"，默认值
  "text": "你好，我是 Claude。" // 必需，最大长度: 5000000，最小长度: 1
}
工具使用内容块 (Tool Use)

{
  "type": "tool_use",      // 必需，枚举值: "tool_use"，默认值
  "id": "toolu_xyz...",    // 必需，工具使用的唯一标识符
  "name": "get_weather",   // 必需，工具名称，最小长度: 1
  "input": {              // 必需，工具的输入参数对象
    // 工具输入参数，具体格式由工具的 input_schema 定义
  }
}
示例：


// 文本内容示例
[{"type": "text", "text": "你好，我是 Claude。"}]

// 工具使用示例
[{
  "type": "tool_use",
  "id": "toolu_xyz...",
  "name": "get_weather",
  "input": { "location": "北京" }
}]

// 混合内容示例
[
  {"type": "text", "text": "根据天气查询结果："},
  {
    "type": "tool_use",
    "id": "toolu_xyz...",
    "name": "get_weather",
    "input": { "location": "北京" }
  }
]
如果请求的最后一条消息是助手角色，响应内容会直接从该消息继续。例如：


// 请求
[
  {"role": "user", "content": "太阳的希腊语名字是什么? (A) Sol (B) Helios (C) Sun"},
  {"role": "assistant", "content": "正确答案是 ("}
]

// 响应
[{"type": "text", "text": "B)"}]
id
类型：字符串
必需：是
响应的唯一标识符。

model
类型：字符串
必需：是
使用的模型名称。

role
类型：枚举字符串
必需：是
默认值：assistant
生成消息的会话角色，始终为 "assistant"。

stop_reason
类型：枚举字符串或 null
必需：是
停止生成的原因，可能的值包括：

"end_turn": 模型达到自然停止点
"max_tokens": 超过请求的 max_tokens 或模型的最大限制
"stop_sequence": 生成了自定义停止序列之一
"tool_use": 模型调用了一个或多个工具
在非流式模式下，此值始终非空。在流式模式下，在 message_start 事件中为 null，其他情况下非空。

stop_sequence
类型：字符串或 null
必需：是
生成的自定义停止序列。如果模型遇到了 stop_sequences 参数中指定的某个序列，这个字段将包含该匹配的停止序列。如果不是因为停止序列而停止，则为 null。

type
类型：枚举字符串
必需：是
默认值：message
可选值：message
对象类型，对于 Messages 始终为 "message"。

usage
类型：对象
必需：是
计费和限流相关的使用量统计。包含以下字段：

input_tokens: 使用的输入 token 数量，必需，范围 x > 0
output_tokens: 使用的输出 token 数量，必需，范围 x > 0
cache_creation_input_tokens: 创建缓存条目使用的输入 token 数量(如果适用)，必需，范围 x > 0
cache_read_input_tokens: 从缓存读取的输入 token 数量(如果适用)，必需，范围 x > 0
注意：由于 API 在内部会对请求进行转换和解析，token 计数可能与请求和响应的实际可见内容不完全对应。例如，即使是空字符串响应，output_tokens 也会是非零值。

错误响应
当请求出现问题时，API 将返回一个错误响应对象，HTTP 状态码在 4XX-5XX 范围内。

常见错误状态码
401 Unauthorized: API 密钥无效或未提供
400 Bad Request: 请求参数无效
429 Too Many Requests: 超出 API 调用限制
500 Internal Server Error: 服务器内部错误
错误响应示例:


{
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid API key provided",
    "code": "invalid_api_key"
  }
}
主要错误类型:

invalid_request_error: 请求参数错误
authentication_error: 认证相关错误
rate_limit_error: 请求频率超限
server_error: 服务器内部错误