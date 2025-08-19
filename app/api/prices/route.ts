import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const GET = async () => {
  try {
    const pricesData = await stripe.prices.list({
      active: true,
      expand: ["data.product"],
    });

    const prices = pricesData.data;

    return NextResponse.json({ prices });
  } catch (err: any) {
    console.error("Failed to fetch prices:", err);
    return NextResponse.json(
      { error: { message: err.message } },
      { status: 500 }
    );
  }
};
