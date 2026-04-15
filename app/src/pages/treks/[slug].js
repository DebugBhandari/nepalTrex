import SlugPage, { getServerSideProps as getLegacySlugProps } from '../[slug]';

export default function TrekSlugPage(props) {
  return <SlugPage {...props} />;
}

export async function getServerSideProps(context) {
  const result = await getLegacySlugProps(context);

  if (result?.props?.pageType === 'stay') {
    return {
      redirect: {
        destination: `/stays/${context.params.slug}`,
        permanent: false,
      },
    };
  }

  return result;
}
