-- Additional explicitly demo-labelled partial route progress for the platform superuser.
WITH demo_user AS (
  SELECT id FROM users WHERE lower(email) = lower('bhandarideepakdev@gmail.com') LIMIT 1
), partial_treks AS (
  SELECT id, route_geojson FROM treks
  WHERE name IN ('Helambu Trek', 'Poon Hill Trek', 'Rara Lake Trek', 'Upper Mustang Trek')
), waypoint_rows AS (
  SELECT t.id AS trek_id, ordinality - 1 AS waypoint_index, point->>2 AS waypoint_name,
    (point->>0)::double precision AS latitude, (point->>1)::double precision AS longitude
  FROM partial_treks t
  CROSS JOIN LATERAL jsonb_array_elements(t.route_geojson::jsonb->'waypoints') WITH ORDINALITY AS points(point, ordinality)
  WHERE ordinality <= 2
), demo_locations AS (
  INSERT INTO trek_location_records (trek_id, user_id, latitude, longitude, accuracy_m, recorded_at, is_demo)
  SELECT trek_id, demo_user.id, latitude, longitude, 8, NOW() - ((waypoint_index + 1) * INTERVAL '2 hours'), true
  FROM waypoint_rows CROSS JOIN demo_user
  RETURNING id, trek_id, user_id, latitude, longitude, accuracy_m, recorded_at
)
INSERT INTO trek_waypoint_completions
  (trek_id, user_id, waypoint_index, waypoint_name, waypoint_latitude, waypoint_longitude, recorded_latitude, recorded_longitude, accuracy_m, distance_m, location_record_id, completed_at, is_demo)
SELECT w.trek_id, l.user_id, w.waypoint_index, COALESCE(NULLIF(w.waypoint_name, ''), 'Coordinate ' || (w.waypoint_index + 1)), w.latitude, w.longitude, l.latitude, l.longitude, l.accuracy_m, 0, l.id, l.recorded_at, true
FROM waypoint_rows w JOIN demo_locations l ON l.trek_id = w.trek_id AND l.latitude = w.latitude AND l.longitude = w.longitude
ON CONFLICT (user_id, trek_id, waypoint_index) DO NOTHING;