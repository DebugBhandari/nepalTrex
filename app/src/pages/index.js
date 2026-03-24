import Head from 'next/head';
import { signOut, useSession } from 'next-auth/react';
import { FEATURED_TREKS, TREK_REGIONS } from '@org/types';
import { formatDurationDays, titleCase } from '@org/utils';
import { query } from '../lib/db';

export default function HomePage({ featuredTreks, trekRegions }) {
  const { data: session, status } = useSession();

  return (
    <>
      <Head>
        <title>NepalTrex | Trekking Adventures in Nepal</title>
        <meta
          name="description"
          content="Explore trekking routes across Nepal with NepalTrex. Discover itineraries, region maps, and guided mountain experiences."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Merriweather:wght@700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="landing-bg" />

      <header className="site-header">
        <div className="brand">NepalTrex</div>
        <nav className="main-menu" aria-label="Main navigation">
          <a href="#treks">Treks</a>
          <a href="#regions">Regions</a>
          <a href="#maps">Maps</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="menu-cta" href="#contact">
          Plan My Trek
        </a>
        <div className="auth-block">
          {status === 'authenticated' ? (
            <>
              <span>Hello, {session.user?.name || 'Trekker'}</span>
              <button className="auth-btn" onClick={() => signOut({ callbackUrl: '/' })}>
                Sign out
              </button>
            </>
          ) : (
            <a className="auth-btn" href="/auth/signin">
              Sign in
            </a>
          )}
        </div>
      </header>

      <main className="landing-page">
        <section className="hero">
          <p className="eyebrow">Trekking in the Himalayas</p>
          <h1>Find your route through Nepal&apos;s most iconic trails</h1>
          <p className="hero-copy">
            From the high passes of Annapurna to the villages beneath Everest,
            NepalTrex helps you choose treks, compare routes, and explore maps
            before you fly.
          </p>
          <div className="hero-actions">
            <a href="#treks" className="btn btn-primary">
              Explore Treks
            </a>
            <a href="#maps" className="btn btn-outline">
              View Map Explorer
            </a>
          </div>
        </section>

        <section id="treks" className="section">
          <div className="section-head">
            <h2>Featured Trekking Routes</h2>
            <p>Popular guided journeys for first-timers and experienced hikers.</p>
          </div>
          <div className="trek-grid">
            {featuredTreks.map((trek) => (
              <article key={trek.name} className="trek-card">
                <h3>{trek.name}</h3>
                <ul>
                  <li>
                    <strong>Duration:</strong> {formatDurationDays(trek.durationDays)}
                  </li>
                  <li>
                    <strong>Difficulty:</strong> {titleCase(trek.level)}
                  </li>
                  <li>
                    <strong>Region:</strong> {trek.region}
                  </li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="regions" className="section split">
          <div>
            <h2>Regions at a Glance</h2>
            <p>
              Choose by landscape, altitude, and culture. Our planners can help
              match the right region to your fitness level and time window.
            </p>
          </div>
          <div className="region-pills">
            {trekRegions.map((region) => (
              <span key={region}>{region}</span>
            ))}
          </div>
        </section>

        <section id="maps" className="section">
          <div className="section-head">
            <h2>Map Explorer</h2>
            <p>
              Preview the Nepal trekking corridor and open full map routes for
              planning.
            </p>
          </div>

          <div className="map-wrap">
            <iframe
              title="Nepal map"
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=80.0%2C26.0%2C89.0%2C31.0&layer=mapnik"
            />
          </div>

          <div className="map-links">
            <a
              href="https://www.openstreetmap.org/#map=7/28.2/84.1"
              target="_blank"
              rel="noreferrer"
            >
              Open Nepal Map
            </a>
            <a
              href="https://www.google.com/maps/place/Everest+Base+Camp"
              target="_blank"
              rel="noreferrer"
            >
              Everest Base Camp Route
            </a>
            <a
              href="https://www.google.com/maps/place/Annapurna+Circuit"
              target="_blank"
              rel="noreferrer"
            >
              Annapurna Circuit Route
            </a>
          </div>
        </section>

        <section id="about" className="section callout">
          <h2>Why NepalTrex</h2>
          <p>
            We combine local guides, safe pacing itineraries, and route support
            to help you trek smarter from Kathmandu to the high Himalayas.
          </p>
        </section>

        <footer id="contact" className="site-footer">
          <p>nepaltrex.com</p>
          <p>Email: hello@nepaltrex.com</p>
          <p>Kathmandu, Nepal</p>
        </footer>
      </main>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const trekRows = await query(
      `
        SELECT name, duration_days, level, region
        FROM treks
        WHERE is_featured = true
        ORDER BY name ASC
      `
    );

    const featuredTreks = trekRows.rows.map((row) => ({
      name: row.name,
      durationDays: row.duration_days,
      level: row.level,
      region: row.region,
    }));

    const regionRows = await query(
      `
        SELECT DISTINCT region
        FROM treks
        ORDER BY region ASC
      `
    );

    const trekRegions = regionRows.rows.map((row) => row.region);

    return {
      props: {
        featuredTreks,
        trekRegions,
      },
    };
  } catch {
    return {
      props: {
        featuredTreks: FEATURED_TREKS,
        trekRegions: Array.from(TREK_REGIONS),
      },
    };
  }
}
