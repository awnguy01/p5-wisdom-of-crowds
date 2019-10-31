import { CityNode } from './city-node';

/** Results
 * @desc container for results display
 */
export class Results {
  constructor(
    public population: CityNode[][] = [],
    public minRoute: CityNode[] = [],
    public minDistance: number = 0,
    public maxRoute: CityNode[] = [],
    public maxDistance: number = 0,
    public avgDistance: number = 0,
    public generation: number = 0,
    public duration: string = '',
    public fragments: CityNode[][] = [],
    public unusedNodes: CityNode[] = [],
    public greedyPairs: CityNode[][] = [],
    public crowdRoute: CityNode[] = []
  ) {}
}
