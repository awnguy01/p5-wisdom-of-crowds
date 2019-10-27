import { CityNode } from './city-node';

export interface GAStartObject {
  algorithm: 1 | 2 | 3 | 4;
  allCities: CityNode[];
}
