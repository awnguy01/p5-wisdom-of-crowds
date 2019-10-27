import { CityNode } from './models/city-node';
import { LineSegment } from './models/line-segment';
import { Line } from './models/line';
import { PointLineDistResults } from './models/point-line-dist-results';
import * as moment from 'moment';

export class Utils {
  /** parseCitiesFromFileText
   * @desc parse a standard TSP file for its list of city nodes and coordinates
   */
  static parseCitiesFromFileText(fileText: string): CityNode[] {
    const cityLines: string[] = fileText
      .split('\n')
      .filter((line: string, index: number) => index > 6 && line);
    const cities: CityNode[] = cityLines.map((line: string) => {
      const lineParts = line.split(' ');
      return new CityNode(lineParts[0], +lineParts[1], +lineParts[2]);
    });

    return cities;
  }

  /** calcDistance
   * @desc calculate the Euclidean distance between two city nodes using distance formula
   */
  static calcDistance(a: CityNode, b: CityNode): number {
    const xDiff: number = b.x - a.x;
    const yDiff: number = b.y - a.y;
    return Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
  }
  static calcTotalDistance(route: CityNode[], loop: boolean): number {
    let totalDistance = 0;
    const cities: CityNode[] = route;
    if (cities && cities.length) {
      cities.forEach((city: CityNode, index: number) => {
        if (index + 1 < cities.length) {
          totalDistance += Utils.calcDistance(city, cities[index + 1]);
        }
      });
      totalDistance += loop
        ? Utils.calcDistance(cities[cities.length - 1], cities[0])
        : 0;
    }
    return totalDistance;
  }

  /** calcPerpendicularLine
   * @desc calculate the normal to a line at a given point in the form Ax + By + C = 0
   */
  static calcPerpendicularLine(point: CityNode, edge: LineSegment): Line {
    const a: number = edge.b;
    const b: number = -edge.a;
    const c: number = edge.a * point.y - edge.b * point.x;
    return { a, b, c };
  }

  /** isPointBetweenTwoLines
   * @desc detect if a given point is between two given lines
   */
  static isPointBetweenTwoLines(
    point: CityNode,
    lineA: Line,
    lineB: Line
  ): boolean {
    const calcX = (line: Line) => (-line.b * point.y - line.c) / line.a;
    const calcY = (line: Line) => (-line.a * point.x - line.c) / line.b;
    const aX: number = calcX(lineA);
    const aY: number = calcY(lineA);
    const bX: number = calcX(lineB);
    const bY: number = calcY(lineB);
    const leftX: number = Math.min(aX, bX);
    const rightX: number = Math.max(aX, bX);
    const topY: number = Math.max(aY, bY);
    const botY: number = Math.min(aY, bY);

    return (
      leftX <= point.x &&
      rightX >= point.x &&
      topY >= point.y &&
      botY <= point.y
    );
  }

  /** calcPointLineDistance
   * @desc calculate the shortest distance from a given point to an edge
   */
  static calcPointEdgeDistance(
    point: CityNode,
    edge: LineSegment
  ): PointLineDistResults {
    const perpLineA: Line = this.calcPerpendicularLine(edge.endPointA, edge);
    const perpLineB: Line = this.calcPerpendicularLine(edge.endPointB, edge);
    const isPerpToEdge = this.isPointBetweenTwoLines(
      point,
      perpLineA,
      perpLineB
    );

    if (isPerpToEdge) {
      // if point lies within the perpendicular space formed by an edge,
      // calculate using a point-line distance formula
      const am: number = edge.a * point.x;
      const bn: number = edge.b * point.y;
      const c: number = edge.c;
      const a2: number = Math.pow(edge.a, 2);
      const b2: number = Math.pow(edge.b, 2);
      const distance = Math.abs(am + bn + c) / Math.sqrt(a2 + b2);
      return { isPerpToEdge, distance };
    } else {
      // if point is outside the perpendicular space, find minimum Euclidean
      // distance from the given point to the edge's two endpoints
      const distA: number = Utils.calcDistance(point, edge.endPointA);
      const distB: number = Utils.calcDistance(point, edge.endPointB);
      const distance = Math.min(distA, distB);
      const closestEndpoint = distA < distB ? 'a' : 'b';
      return { isPerpToEdge, distance, closestEndpoint };
    }
  }

  /** convertCitiesToDataPoints
   * @desc convert CityNode object to objects conforming to CanvasJS API
   */
  static convertCitiesToDataPoints(cities: CityNode[]): any {
    return cities.map((city: CityNode) => {
      return { ...city, label: city.name };
    });
  }

  /** calcStandardDeviation
   * @desc calculates the standard deviation of a list of numbers
   */
  static calcStandardDeviation(values: number[]): number {
    const avg = this.calcAverage(values);
    const squareDiffs: number[] = values.map((val: number) => (val - avg) ** 2);
    return this.calcAverage(squareDiffs) ** 0.5;
  }

  /** calcAverage
   * @desc calculates the average of a list of numbers
   */
  static calcAverage(values: number[]): number {
    return (
      values.reduce((sum: number, val: number) => sum + val) / values.length
    );
  }

  /** formatTime
   * @desc converts milliseconds into HH:mm:ss format
   */
  static formatTime(milliseconds: number) {
    const duration = moment.duration(milliseconds);
    const parseTime = (measurement: any) =>
      duration
        .get(measurement)
        .toString()
        .padStart(2, '0');
    const hours = parseTime('hours');
    const mins = parseTime('minutes');
    const secs = parseTime('seconds');
    return `${hours}:${mins}:${secs}`;
  }

  /** routeToString
   * @desc returns a list of names of each node in a route
   */
  static routeToString(route: CityNode[]): string {
    return route.map((node: CityNode) => node.name).toString();
  }
}
