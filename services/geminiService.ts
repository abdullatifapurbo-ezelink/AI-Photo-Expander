import { GoogleGenAI, Modality } from "@google/genai";

// FIX: Per coding guidelines, initialize GenAI with process.env.API_KEY.
// This also resolves the 'import.meta.env' TypeScript error.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const expandImageCanvas = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    // For debugging, log the entire response to the console
    console.log("Full Gemini response:", JSON.stringify(response, null, 2));

    const candidate = response.candidates?.[0];

    if (!candidate) {
      throw new Error('No valid response was returned from the AI.');
    }

    // The finish reason is the most reliable indicator of success.
    // A 'STOP' reason means the model finished its turn as expected.
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      let reason = candidate.finishReason;
      let message = `Image generation stopped. Reason: ${reason}.`;
      
      // Provide more user-friendly messages for common failure reasons.
      if (reason === 'SAFETY') {
        message = "The image could not be processed due to the AI's safety policies. Please try a different image.";
      } else if (reason === 'RECITATION') {
        message = "The image could not be processed due to the AI's recitation policy.";
      }
      
      throw new Error(message);
    }
    
    // If the process stopped correctly, we expect an image part.
    let generatedImage: string | null = null;
    let responseText: string | null = null;

    if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
                generatedImage = part.inlineData.data;
            }
            if (part.text) {
                responseText = part.text;
            }
        }
    }

    if (responseText) {
        console.log("Gemini text response:", responseText);
    }
    
    if (generatedImage) {
        // Fallback check: Ensure the AI didn't just echo the input image.
        if (generatedImage === base64ImageData) {
            throw new Error('The AI returned the original image without making changes.');
        }
        return generatedImage;
    }
    
    // This case is unlikely if finishReason is 'STOP', but it's a good safeguard.
    throw new Error('The AI finished successfully but did not return an image.');

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      // Re-throw with more context, but avoid double-wrapping our own errors.
      if (error.message.startsWith('Failed to expand image:')) {
          throw error;
      }
      throw new Error(`Failed to expand image: ${error.message}`);
    }
    throw new Error('An unknown error occurred while expanding the image.');
  }
};
