/** PointLineDistResults
 * @desc used when calculating the shortest distance from a point to a given line segment
 */
export interface PointLineDistResults {
  isPerpToEdge: boolean;
  distance: number;
  closestEndpoint?: 'a' | 'b';
}
