export type TrackingCoordinate = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(start: TrackingCoordinate, end: TrackingCoordinate) {
  const earthRadiusMeters = 6371000;
  const deltaLatitude = toRadians(end.latitude - start.latitude);
  const deltaLongitude = toRadians(end.longitude - start.longitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(start.latitude)) *
      Math.cos(toRadians(end.latitude)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function areTrackingCoordinatesOverlapping(
  start?: TrackingCoordinate,
  end?: TrackingCoordinate,
  thresholdMeters = 25
) {
  if (!start || !end) {
    return false;
  }

  return calculateDistanceMeters(start, end) <= thresholdMeters;
}

export function separateTrackingCoordinates(
  start?: TrackingCoordinate,
  end?: TrackingCoordinate,
  offsetMeters = 18
) {
  if (!start || !end || !areTrackingCoordinatesOverlapping(start, end)) {
    return {
      start,
      end
    };
  }

  const metersPerDegreeLatitude = 111320;
  const metersPerDegreeLongitude = Math.max(111320 * Math.cos(toRadians(start.latitude)), 1);
  const latitudeOffset = offsetMeters / metersPerDegreeLatitude;
  const longitudeOffset = offsetMeters / metersPerDegreeLongitude;

  return {
    start: {
      latitude: start.latitude + latitudeOffset,
      longitude: start.longitude - longitudeOffset
    },
    end: {
      latitude: end.latitude - latitudeOffset,
      longitude: end.longitude + longitudeOffset
    }
  };
}
