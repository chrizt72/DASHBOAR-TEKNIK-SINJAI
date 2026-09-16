declare module 'leaflet-omnivore' {
  import * as L from 'leaflet';

  export function kml(
    url: string | Document,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function kmlParse(
    kmlDoc: string | Document,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function gpx(
    url: string | Document,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function gpxParse(
    gpxDoc: string | Document,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function csv(
    url: string,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function csvParse(
    csvData: string,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function geojson(
    url: string,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function topojson(
    url: string,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function polyline(
    url: string,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;

  export function wkt(
    url: string,
    parseOptions?: any,
    customLayer?: L.GeoJSON
  ): L.GeoJSON;
}
