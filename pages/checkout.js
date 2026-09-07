import Head from "next/head";
import CartPage from "./cart";

export default function MetaCheckout({ transfer, transferError }) {
  return <>
    <Head>
      <title>Checkout | Local Jagoff</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
    <CartPage transfer={transfer} transferError={transferError} />
  </>;
}

export async function getServerSideProps({ query, res }) {
  const { resolveMetaCart } = require("../lib/meta-checkout.cjs");
  const { CommerceError } = require("../lib/commerce.cjs");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  try {
    if (process.env.CHECKOUT_PAUSED === "true") {
      throw new CommerceError("Checkout temporarily paused", 503);
    }
    const transfer = await resolveMetaCart(query, { apiKey: process.env.PRINTFUL_API_KEY });
    return { props: { transfer, transferError: null } };
  } catch (error) {
    res.statusCode = error instanceof CommerceError ? error.status : 503;
    return { props: { transfer: null, transferError: res.statusCode === 400
      ? "This shop cart is invalid or includes an unavailable item. Please return to the shop and try again."
      : "Checkout is temporarily unavailable. Please try again shortly." } };
  }
}
