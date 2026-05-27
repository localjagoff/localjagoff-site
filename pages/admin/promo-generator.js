export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/admin/promo-builder",
      permanent: false,
    },
  };
}

export default function PromoGeneratorRedirect() {
  return null;
}
