import { CityNode } from './city-node';

/** Results
 * @desc container for results display
 */
export class Results {
  constructor(
    public population: CityNode[][],
    public minRoute: CityNode[],
    public minDistance: number,
    public maxRoute: CityNode[],
    public maxDistance: number,
    public avgDistance: number,
    public generation?: number,
    public duration?: string
  ) {}
}
