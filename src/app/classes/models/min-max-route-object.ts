import { CityNode } from './city-node';

export interface MinMaxRouteObject {
  minRoute: CityNode[];
  minDistance: number;
  maxRoute: CityNode[];
  maxDistance: number;
}
