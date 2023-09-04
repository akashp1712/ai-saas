import { NextResponse } from 'next/server';
import { StreamingTextResponse, CohereStream } from 'ai'
import { auth } from '@clerk/nextjs';

import { increaseApiLimit, checkApiLimit } from '@/lib/api-limit';

// IMPORTANT! Set the runtime to edge
// export const runtime = 'edge'
// commenting out, as getting error: [CONVERSATION_ERROR] [Error: PrismaClient is unable to run in Vercel Edge Functions. As an alternative, try Accelerate: https://pris.ly/d/accelerate.

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

        const freeTrial = await checkApiLimit();

        if (!freeTrial) {
          return new NextResponse("Free trial has expired", {
            status: 403 });
        }

        const body = JSON.stringify({
            prompt: messages,
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

          await increaseApiLimit();

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
