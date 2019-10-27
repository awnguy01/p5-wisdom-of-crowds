/** CityNode
 * @desc coordinate-based node
 */
export class CityNode {
  name: string;
  x: number;
  y: number;

  constructor(name: string, x: number, y: number) {
    this.name = name;
    this.x = x;
    this.y = y;
  }
}
