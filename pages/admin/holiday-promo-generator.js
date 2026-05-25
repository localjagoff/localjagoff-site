export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/admin/promo-generator",
      permanent: false,
    },
  };
}

export default function HolidayPromoRedirect() {
  return null;
}
