import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import prismadb from '@/lib/prismadb';
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = headers().get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: any) {
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    // as we're having api route /stripe and we will do one of the two events: 
    // 1) update/cancel the subscription 2) create subscription for the first time.
    // thus we will look for one of these two events in our webhook

    const session = event.data.object as Stripe.Checkout.Session;

    if (event.type === "checkout.session.completed") {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        );

        if (!session?.metadata?.userId) {
            return new NextResponse("User id is required", { status: 400 });
        }

        // if we find valid user id then create prisma subscription
        await prismadb.userSubscription.create({
            data: {
                userId: session?.metadata?.userId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(
                    subscription.current_period_end * 1000
                ),
            },
        })
    }

    // if user has just upgraded their subscription and they already had one before (upgrading again)

    if (event.type === "invoice.payment_succeeded") {
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        );

        // in this case update the user subscription
        await prismadb.userSubscription.update({
            where: {
                stripeSubscriptionId: subscription.id,
            },
            data: {
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(
                    subscription.current_period_end * 1000
                ),
            },
        });
    }

    // it is very important to return 200 status code or else it will mess with webhook functionality
    return new NextResponse(null, {status: 200});

}
