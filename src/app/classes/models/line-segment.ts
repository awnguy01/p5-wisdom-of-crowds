import { Line } from './line';
import { CityNode } from './city-node';
import { Utils } from '../utils';

/** LineSegment
 * @desc line in the form Ax + Bx + C = 0 with specified endpoints and a length
 */
export class LineSegment implements Line {
  a: number;
  b: number;
  c: number;

  length: number;
  endPointA: CityNode;
  endPointB: CityNode;

  constructor(cityA: CityNode, cityB: CityNode) {
    this.endPointA = cityA;
    this.endPointB = cityB;
    this.a = cityB.y - cityA.y;
    this.b = -(cityB.x - cityA.x);
    this.c = -this.b * cityB.y - this.a * cityB.x;
    this.length = Utils.calcDistance(cityA, cityB);
  }
}
