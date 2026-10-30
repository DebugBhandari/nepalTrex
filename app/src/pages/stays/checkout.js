export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/stays',
      permanent: true,
    },
  };
}

export default function LegacyCheckoutRedirect() {
  return null;
}
