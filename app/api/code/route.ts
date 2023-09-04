import { NextResponse } from 'next/server';
import { StreamingTextResponse, CohereStream } from 'ai'
import { auth } from '@clerk/nextjs';

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge'
const instructionMessage = "You are a code generator, You must answer only in markdown code snippets. Use code comments for explanations: \n\n";

export async function POST(req: Request) {

    try {
        const { userId }  = auth();
        const reqBody = await req.json();
        const { messages } = reqBody;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!messages) {
            return new NextResponse("Messages are required", { status: 400 });
        }

    
        const body = JSON.stringify({
            prompt: instructionMessage + messages,
            model: 'command',
            max_tokens: 300,
            stop_sequences: [],
            temperature: 0.9,
            return_likelihoods: 'NONE',
            stream: false
          })
        
          const response = await fetch('https://api.cohere.ai/v1/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.COHERE_API_KEY}`
            },
            body
          })

          return new NextResponse(response.body, { status: 200 });

        //   // Extract the text response from the Cohere stream
        //   const stream = CohereStream(response);

        //   // Respond with the stream
        //   return new StreamingTextResponse(stream)

    } catch (error) {
        console.log("[CONVERSATION_ERROR]", error);
        return new NextResponse("Internal error", { status: 500});
    }

}
