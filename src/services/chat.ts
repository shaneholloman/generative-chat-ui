import Groq from "groq-sdk";
import { Anthropic } from '@anthropic-ai/sdk';

const groq = new Groq({
  apiKey: "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",
  dangerouslyAllowBrowser: true,
});

export interface ChatResponse {
  responsetype: "text" | "html";
  response: string;
}

export const sendMessage = async (
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ChatResponse> => {
  console.log("Sending message:", message);
  
  const anthropicKey = localStorage.getItem('ANTHROPIC_API_KEY');
  
  let initialResponse = "";
  
  if (anthropicKey) {
    console.log("Using Anthropic API first");
    try {
      const anthropic = new Anthropic({
        apiKey: anthropicKey,
        dangerouslyAllowBrowser: true,
      });

      const chatCompletion = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 4096,
        temperature: 0.7,
        system: `You are an AI assistant that responds with either text or HTML fragments. 
          
          IMPORTANT: When deciding between text and HTML responses, ALWAYS prefer HTML fragments.
          This application demonstrates that LLM chat apps can respond with generative UI instead of just text.
          
          When creating HTML fragments, ensure they are:
          1. Completely self-contained with ALL required functionality:
             - Include ALL necessary JavaScript code
             - Load required libraries from CDNs (e.g., OpenLayers for maps)
             - Handle all interactions within the fragment
          2. Match the dark theme (bg-gray-800, text-gray-200, etc.)
          3. Use modern, rounded UI elements with proper padding/spacing
          4. Include error handling and validation
          5. Provide clear feedback for user interactions
          6. Use semantic HTML and ARIA attributes
          
          Specific requirements for common scenarios:
          
          1. For maps (e.g., Southeast Asia regions):
             - Use OpenLayers with OpenStreetMap
             - Include proper CDN imports
             - Create layers for region markers (green/yellow/red)
             - Handle zoom/pan interactions
          
          2. For calculators (e.g., German net salary):
             - Create a designated result div with a specific ID
             - Show results in the div on button click
             - Include all calculation logic in JavaScript
             - Handle edge cases and validation
          
          3. For evaluations (e.g., song reviews):
             - Include buttons for accept/reject
             - Make API calls to GROQ's LLAMA 3.3 model using:
               fetch('https://api.groq.com/v1/chat/completions', {
                 method: 'POST',
                 headers: {
                   'Authorization': 'Bearer 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',
                   'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({
                   model: "llama-3.3-70b-versatile",
                   messages: [
                     { role: "system", content: "You are a music review assistant." },
                     { role: "user", content: "Review this song: [song details]" }
                   ]
                 })
               })
             - Display results in a designated div
          
          Format your response as a JSON object:
          {
            "responsetype": "text" or "html",
            "response": "your response content"
          }`,
        messages: [
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: "user", content: message }
        ],
      });

      initialResponse = chatCompletion.content[0].type === 'text' 
        ? chatCompletion.content[0].text
        : '';
        
      console.log("Anthropic response:", initialResponse);

      try {
        const parsedResponse = JSON.parse(initialResponse);
        if (parsedResponse.responsetype && parsedResponse.response) {
          console.log("Successfully parsed Anthropic response as JSON");
          return parsedResponse;
        }
      } catch (parseError) {
        console.log("Anthropic response is not valid JSON, will use Groq for formatting");
      }
    } catch (error) {
      console.error("Error calling Anthropic:", error);
      initialResponse = "Sorry, there was an error processing your request.";
    }
  }

  if (!anthropicKey || initialResponse === "Sorry, there was an error processing your request.") {
    try {
      console.log("Using Groq directly");
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that creates interactive HTML fragments or text responses.
            ALWAYS prefer HTML fragments over text when possible.
            
            Your HTML fragments MUST be completely self-contained:
            1. Include ALL required JavaScript functionality
            2. Load ANY needed libraries via CDN
            3. Handle ALL user interactions
            4. Match dark theme (bg-gray-800, text-gray-200)
            5. Use modern UI with proper spacing
            6. Include error handling
            7. Show clear user feedback
            8. Use semantic HTML/ARIA
            
            Common scenarios to handle:
            
            1. Maps (Southeast Asia example):
              - Import OpenLayers: <script src="https://cdn.jsdelivr.net/npm/ol@v8.2.0/dist/ol.js"></script>
              - Include OpenLayers CSS
              - Create map with markers
              - Handle interactions
            
            2. Calculators (German salary example):
              - Create result div with ID
              - Include ALL calculation logic
              - Show results on button click
              - Handle validation
            
            3. Reviews (Music evaluation):
              - Add accept/reject buttons
              - Make GROQ API calls using:
                fetch('https://api.groq.com/v1/chat/completions', {
                  headers: {
                    'Authorization': 'Bearer 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'
                  }
                })
              - Show results in designated div`,
          },
          ...history.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: "user", content: message },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 32768,
        top_p: 1,
        stream: false,
        response_format: {
          type: "json_object"
        }
      });

      console.log("Groq direct response:", chatCompletion.choices[0]?.message?.content);
      return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
    } catch (error) {
      console.error("Error calling Groq directly:", error);
      return {
        responsetype: "text",
        response: "Sorry, there was an error processing your request.",
      };
    }
  }

  try {
    console.log("Using Groq to format Anthropic response");
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a JSON formatting assistant for Claude-3 Sonnet responses.
          Format responses into proper JSON structure, ensuring HTML fragments are
          complete and self-contained with all required functionality.
          
          Rules:
          1. If response contains HTML, set responsetype to "html"
          2. For text explanations, set responsetype to "text"
          3. Ensure HTML includes all required:
             - JavaScript functionality
             - CDN library imports
             - Event handlers
             - Error handling
             - User feedback
          4. Preserve all styling and functionality
          
          Required JSON structure:
          {
            "responsetype": "text" | "html",
            "response": "string"
          }`,
        },
        {
          role: "user",
          content: initialResponse,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 32768,
      top_p: 1,
      stream: false,
      response_format: {
        type: "json_object"
      }
    });

    console.log("Groq formatting response:", chatCompletion.choices[0]?.message?.content);
    return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Error in final Groq formatting:", error);
    return {
      responsetype: "text",
      response: "Sorry, there was an error processing your request.",
    };
  }
};