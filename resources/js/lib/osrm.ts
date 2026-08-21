import axios from 'axios';

const OSRM_BASE_URL =
    (import.meta.env as Record<string, string | undefined>).VITE_OSRM_BASE_URL
    ?? 'https://router.project-osrm.org';

export interface LatLng {
    lat: number;
    lng: number;
}

export interface RouteStep {
    instructionText: string;
    maneuverType: string;
    maneuverModifier: string | null;
    /** [lng, lat], matching GeoJSON/OSRM order */
    location: [number, number];
    distanceMeters: number;
}

export interface Route {
    /** [lat, lng] pairs, ready for Leaflet's L.polyline() */
    coordinates: [number, number][];
    steps: RouteStep[];
    distanceMeters: number;
    durationSeconds: number;
}

/**
 * Fetches a driving route from OSRM's HTTP API. Uses the public demo server by
 * default (VITE_OSRM_BASE_URL overrides it) — fine for development, but the demo
 * server is rate-limited and not meant for production traffic; point this at a
 * self-hosted OSRM instance before going live.
 */
export async function fetchRoute(from: LatLng, to: LatLng): Promise<Route> {
    const url = `${OSRM_BASE_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`;

    const { data } = await axios.get(url, {
        params: { geometries: 'geojson', steps: 'true', overview: 'full' },
    });

    const route = data.routes?.[0];
    if (!route) {
        throw new Error('OSRM no devolvió ninguna ruta');
    }

    const coordinates: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng],
    );

    const steps: RouteStep[] = route.legs.flatMap((leg: any) =>
        leg.steps.map((step: any) => ({
            instructionText: buildInstructionText(step.maneuver, step.name),
            maneuverType: step.maneuver.type,
            maneuverModifier: step.maneuver.modifier ?? null,
            location: step.maneuver.location,
            distanceMeters: step.distance,
        })),
    );

    return {
        coordinates,
        steps,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
    };
}

const MODIFIER_ES: Record<string, string> = {
    left: 'a la izquierda',
    right: 'a la derecha',
    'sharp left': 'bien a la izquierda',
    'sharp right': 'bien a la derecha',
    'slight left': 'ligeramente a la izquierda',
    'slight right': 'ligeramente a la derecha',
    straight: 'de frente',
    uturn: 'en U',
};

function buildInstructionText(maneuver: { type: string; modifier?: string }, streetName: string): string {
    const street = streetName ? ` en ${streetName}` : '';
    const modifier = maneuver.modifier ? MODIFIER_ES[maneuver.modifier] ?? maneuver.modifier : '';

    switch (maneuver.type) {
        case 'depart':
            return `Comienza${street}`;
        case 'arrive':
            return 'Has llegado a tu destino';
        case 'roundabout':
        case 'rotary':
            return `Toma la rotonda${street}`;
        case 'turn':
            return `Gira ${modifier}${street}`;
        case 'new name':
        case 'continue':
            return `Continúa${modifier ? ' ' + modifier : ''}${street}`;
        case 'merge':
            return `Incorpórate ${modifier}${street}`;
        case 'fork':
            return `Toma el desvío ${modifier}${street}`;
        default:
            return `Continúa${street}`;
    }
}
