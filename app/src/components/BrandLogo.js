import { useEffect, useState } from 'react';
import { Box } from '@mui/material';

const BRAND_LOGO_SOURCES = [
  '/brand/banner-mountains.svg',
];

function resolveBrandLogo(setSrc) {
  let cancelled = false;

  const tryLoad = (index) => {
    if (index >= BRAND_LOGO_SOURCES.length || cancelled) {
      return;
    }

    const candidate = BRAND_LOGO_SOURCES[index];
    const image = new Image();

    image.onload = () => {
      if (!cancelled) {
        setSrc(candidate);
      }
    };

    image.onerror = () => {
      tryLoad(index + 1);
    };

    image.src = candidate;
  };

  tryLoad(0);

  return () => {
    cancelled = true;
  };
}

export default function BrandLogo({ alt = 'NepalTrex logo', sx }) {
  const [src, setSrc] = useState('');

  useEffect(() => resolveBrandLogo(setSrc), []);

  if (!src) {
    return null;
  }

  return <Box component="img" src={src} alt={alt} sx={sx} />;
}
