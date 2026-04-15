import SlugPage, { getServerSideProps as getLegacySlugProps } from '../[slug]';

export default function StaySlugPage(props) {
  return <SlugPage {...props} />;
}

export async function getServerSideProps(context) {
  const result = await getLegacySlugProps(context);

  if (result?.props?.pageType === 'trek') {
    return {
      redirect: {
        destination: `/treks/${context.params.slug}`,
        permanent: false,
      },
    };
  }

  return result;
}
