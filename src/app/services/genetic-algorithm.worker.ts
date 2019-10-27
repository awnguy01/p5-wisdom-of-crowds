/// <reference lib="webworker" />
'use strict';

import { CityNode } from '../classes/models/city-node';
import { FitnessMap } from '../classes/models/fitness-map';
import { Utils } from '../classes/utils';
import { Results } from '../classes/models/results';
import * as moment from 'moment';
import { GAStartObject } from '../classes/models/ga-start-object';

const POPULATION_SIZE = 50; // constant number of routes for each generation

/** generateInitPopulation
 * @desc randomly generates routes to add to the initial population
 */
const generateInitPopulation = (allCities: CityNode[]): CityNode[][] => {
  const pool: CityNode[][] = [];

  // adds routes until population size is met
  for (let i = 0; i < POPULATION_SIZE; i++) {
    const route: CityNode[] = [];
    const remCities = [...allCities];

    // randomly selects a node from the remaining cities to add to the new route
    while (remCities.length) {
      const randomIndex = Math.floor(Math.random() * remCities.length);
      route.push(remCities[randomIndex]);
      remCities.splice(randomIndex, 1);
    }
    pool.push(route);
  }
  return pool;
};

/** calcPopulationStats
 * @desc produces the Results object with calculated properties
 */
const calcPopulationStats = (
  population: CityNode[][],
  generation?: number
): Results => {
  // results with placeholder values
  const results: Results = {
    population,
    minRoute: population[0],
    minDistance: Utils.calcTotalDistance(population[0], true),
    maxRoute: population[0],
    maxDistance: Utils.calcTotalDistance(population[0], true),
    avgDistance: 0,
    generation
  };
  const allDistances: number[] = [];

  population.forEach((route: CityNode[]) => {
    const routeDistance: number = Utils.calcTotalDistance(route, true);
    allDistances.push(routeDistance);

    // updates the minimum distance properties if a shorter distance is found
    if (routeDistance < results.minDistance) {
      results.minRoute = route;
      results.minDistance = routeDistance;
    }

    // updates the maximum distance properties if a longer distance is found
    if (routeDistance > results.maxDistance) {
      results.maxRoute = route;
      results.maxDistance = routeDistance;
    }
  });

  // calculates the average of all distances in the population
  results.avgDistance =
    allDistances.reduce((sum: number, distance: number) => sum + distance) /
    allDistances.length;

  return results;
};

/** calcFitness
 * @desc determines the fitness based on a percentile of how close
 * the value is to the minimum value and then cubes the fitness to
 * increase the odds of being chosen as a parent
 */
const calcFitness = (
  minVal: number,
  maxVal: number,
  testVal: number
): number => {
  const minMaxDiff: number = maxVal - minVal || 1;
  const testValPercentile: number = 1 - (testVal - minVal) / minMaxDiff;
  return (testValPercentile * 100) ** 3;
};

/** generateFitnessMapList
 * @desc calculate the fitness for every member in the population with
 * reference to its original index in the population for later access
 */
const generateFitnessMapList = (population: CityNode[][]): FitnessMap[] => {
  const results: Results = calcPopulationStats(population);

  return population.map(
    (route: CityNode[], index: number): FitnessMap => ({
      originalIndex: index,
      fitnessValue: calcFitness(
        results.minDistance,
        results.maxDistance,
        Utils.calcTotalDistance(route, true)
      )
    })
  );
};

/** selectParentRoutes
 * @desc selects two parents based on their fitness as a probability
 */
const selectParentRoutes = (
  originalFitnessMapList: FitnessMap[],
  population: CityNode[][]
): CityNode[][] => {
  const fitnessMapList = [...originalFitnessMapList];

  // sorts to fitness map for the RNG to select the routes with highest fitness value first
  fitnessMapList.sort(
    (fitnessA: FitnessMap, fitnessB: FitnessMap) =>
      fitnessB.fitnessValue - fitnessA.fitnessValue
  );

  // total of al fitness values
  let aggregateFitness = 0;
  fitnessMapList.forEach(
    (fitness: FitnessMap) => (aggregateFitness += fitness.fitnessValue)
  );

  // parent fitness values
  const randomFitnessA: number = Math.random() * aggregateFitness;
  const randomFitnessB: number = Math.random() * aggregateFitness;

  // if total population fitness minus the fitness of a route
  // is below the RNG fitness, select that route as a parent
  let parentA: CityNode[] = [];
  let parentB: CityNode[] = [];
  for (let i = 0; i < population.length; i++) {
    aggregateFitness -= fitnessMapList[i].fitnessValue;
    if (aggregateFitness <= randomFitnessA) {
      parentA = population[fitnessMapList[i].originalIndex];
    }
    if (aggregateFitness <= randomFitnessB) {
      parentB = population[fitnessMapList[i].originalIndex];
    }
    if (parentA.length && parentB.length) {
      break;
    }
  }

  if (!parentA.length || !parentB.length) {
    console.error('Could not generate parents');
  }
  return [parentA, parentB];
};

/** genOffspring
 * @desc first crossover function
 */
const genOffspring = (
  parentA: CityNode[],
  parentB: CityNode[]
): CityNode[][] => {
  const popLength = parentA.length;

  // randomly selects the index at which the nodes to the
  // left of each parent is copied to the new offspring
  const crossOverPoint = Math.floor(Math.random() * popLength);
  const childA: CityNode[] = parentA.slice(0, crossOverPoint);
  const childB: CityNode[] = parentB.slice(0, crossOverPoint);

  // fill the remaining nodes in each offspring with the
  // missing nodes in the order the appear in the other parent
  const fillRemaining = (child: CityNode[], parent: CityNode[]) => {
    for (const node of parent) {
      if (child.length === popLength) {
        break;
      }
      if (!child.includes(node)) {
        child.push(node);
      }
    }
  };
  fillRemaining(childA, parentB);
  fillRemaining(childB, parentA);

  return [childA, childB];
};

/** genOffspring2
 * @desc second crossover function
 */
const genOffspring2 = (
  parentA: CityNode[],
  parentB: CityNode[]
): CityNode[][] => {
  const childRoute: CityNode[] = [parentA[0]];

  // indices for each parent
  let indexA = 1;
  let indexB = 0;
  while (
    childRoute.length < parentA.length &&
    indexA < parentA.length &&
    indexB < parentB.length
  ) {
    // increments each index until the node at each index is not in the child route
    let destA: CityNode = parentA[indexA];
    let destB: CityNode = parentB[indexB];
    while (indexA < parentA.length && childRoute.includes(destA)) {
      indexA++;
      destA = parentA[indexA];
    }
    while (indexB < parentB.length && childRoute.includes(destB)) {
      indexB++;
      destB = parentB[indexB];
    }

    const lastChildNode: CityNode = childRoute[childRoute.length - 1];
    const distA = Utils.calcDistance(destA, lastChildNode);
    const distB = Utils.calcDistance(destB, lastChildNode);

    // add the node from the parent that has the closest
    // distance to the last node in the child route
    childRoute.push(Math.min(distA, distB) === distA ? destA : destB);
  }
  return [childRoute];
};

/** mutate
 * @desc randomly swaps two nodes at a specified mutation rate
 */
const mutate = (route: CityNode[], mutationRate: number): CityNode[] => {
  const routeClone: CityNode[] = [...route];
  const dauber: number = Math.random() * 100;

  // mutate only if RNG number is below the mutation rate
  if (dauber < 100 * mutationRate) {
    // selects two random indices to swap nodes
    const indexA: number = Math.floor(Math.random() * routeClone.length);
    const indexB: number = Math.floor(Math.random() * routeClone.length);
    const nodeA: CityNode = routeClone[indexA];
    const nodeB: CityNode = routeClone[indexB];
    routeClone[indexA] = nodeB;
    routeClone[indexB] = nodeA;
  }
  return routeClone;
};

/** startGeneticAlgorithm
 * @desc main driver to execute a specified genetic algorithm
 */
const startGeneticAlgorithm = (startObject: GAStartObject): void => {
  const startTime = moment();
  const population: CityNode[][] = generateInitPopulation(
    startObject.allCities
  );
  let generation = 0;

  // get initial results
  let currStats: Results = calcPopulationStats([...population], generation++);
  postMessage(currStats);

  do {
    const currBestPopulation: CityNode[][] = [...currStats.population];
    const childPopulation: CityNode[][] = [];
    const fitnessMapList: FitnessMap[] = generateFitnessMapList(
      currBestPopulation
    );

    // create more offspring until population size is reached
    while (childPopulation.length < POPULATION_SIZE) {
      // select the parent routes
      const parents: CityNode[][] = selectParentRoutes(
        fitnessMapList,
        currBestPopulation
      );
      if (parents.length === 2) {
        // selects the crossover function and mutation
        // rates based on the specified algorithm number
        const algNr: number = startObject.algorithm;
        const mutationRate = algNr % 2 === 0 ? 0.015 : 0.02;
        const crossOverFn = algNr <= 2 ? genOffspring : genOffspring2;

        // crossover the parents to produce the offspring
        let routeChildren = crossOverFn(parents[0], parents[1]);

        // potentially mutate the offspring
        routeChildren = routeChildren.map((child: CityNode[]) =>
          mutate(child, mutationRate)
        );

        // add the new offspring to the population
        childPopulation.push(...routeChildren);
      } else {
        console.error('Invalid number of parents');
      }
    }

    // update the results with the new population
    const childPopulationStats = calcPopulationStats(
      childPopulation,
      generation++
    );

    childPopulationStats.duration = Utils.formatTime(moment().diff(startTime));

    currStats = childPopulationStats;

    postMessage(currStats);
  } while (generation <= 300000); // stopping criteria
};

// waits for the signal to trigger the genetic algorithm
addEventListener('message', ({ data }: { data: GAStartObject }) => {
  startGeneticAlgorithm(data);
});
