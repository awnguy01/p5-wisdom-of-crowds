/// <reference lib="webworker" />
'use strict';

import { CityNode } from '../classes/models/city-node';
import { Utils } from '../classes/utils';
import { Results } from '../classes/models/results';
import * as moment from 'moment';

const POPULATION_SIZE = 100; // constant number of routes for each generation
const MUTATION_RATE = 0.02;
const MATING_POOL_PERCENTILE = 0.4;
const MATING_POOL_SURVIVOR_PERCENTILE = 0.1;

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
    ...new Results(),
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

  const minRoute = results.minRoute;
  results.minRoute = [...minRoute, minRoute[0]];
  const maxRoute = results.maxRoute;
  results.maxRoute = [...maxRoute, maxRoute[0]];

  return results;
};

/** calcFitness
 * @desc calculates fitness based on inverse of route distance
 */
const calcFitness = (route: CityNode[]): number => {
  const distance = Utils.calcTotalDistance(route, true);
  return 1 / distance;
};

/** genOffspring3
 * @desc third crossover function
 */
const crossOver = (parentA: CityNode[], parentB: CityNode[]): CityNode[][] => {
  const routeLength = parentA.length;

  const getRandIndex = () => Math.floor(Math.random() * routeLength);
  const sliceIndexA1 = getRandIndex();
  const sliceIndexA2 = getRandIndex();
  const sliceIndexB1 = getRandIndex();
  const sliceIndexB2 = getRandIndex();
  const childA: CityNode[] = parentA.slice(
    Math.min(sliceIndexA1, sliceIndexA2),
    Math.max(sliceIndexA1, sliceIndexA2)
  );
  const childB: CityNode[] = parentB.slice(
    Math.min(sliceIndexB1, sliceIndexB2),
    Math.max(sliceIndexB1, sliceIndexB2)
  );

  // fill the remaining nodes in each offspring with the
  // missing nodes in the order the appear in the other parent
  const fillRemaining = (
    child: CityNode[],
    parent: CityNode[],
    startIndex: number
  ) => {
    let preFillCounter = 0;
    for (const node of parent) {
      if (child.length === routeLength) {
        break;
      }
      if (!child.includes(node)) {
        if (preFillCounter < startIndex) {
          child.unshift(node);
          preFillCounter++;
        } else {
          child.push(node);
        }
      }
    }
  };
  fillRemaining(childA, parentB, Math.min(sliceIndexA1, sliceIndexA2));
  fillRemaining(childB, parentA, Math.min(sliceIndexB1, sliceIndexB2));

  return [childA, childB];
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
const startGeneticAlgorithm = (allCities: CityNode[]): void => {
  const startTime = moment();
  let population: CityNode[][] = generateInitPopulation(allCities);
  let generation = 0;
  let leastDistanceSoFar: number = null;
  let repeatCounter = 0;

  do {
    // Generate initial results
    const currStats: Results = calcPopulationStats(
      [...population],
      generation++
    );

    // Stopping criterion: algorithm has not generated better
    // results after a specified number of consecutive generations
    if (
      leastDistanceSoFar === null ||
      currStats.minDistance < leastDistanceSoFar
    ) {
      leastDistanceSoFar = currStats.minDistance;
      repeatCounter = 0;
    } else {
      repeatCounter++;
    }

    postMessage(currStats);

    // Use the specified upper percentile of the population as the new mating pool
    const bestPerformers: CityNode[][] = selectUpperPercentile(
      population,
      MATING_POOL_PERCENTILE
    );

    // Choose the specified upper percentile of the mating pool to persist
    const offSpring: CityNode[][] = selectUpperPercentile(
      bestPerformers,
      MATING_POOL_SURVIVOR_PERCENTILE
    );

    // Continue to generate more offspring until population quota is reached
    while (offSpring.length < POPULATION_SIZE) {
      const parentAIndex = Math.floor(Math.random() * bestPerformers.length);
      const parentBIndex = Math.floor(Math.random() * bestPerformers.length);
      const children = crossOver(
        bestPerformers[parentAIndex],
        bestPerformers[parentBIndex]
      );
      children.forEach((child: CityNode[]) => {
        if (offSpring.length < POPULATION_SIZE) {
          offSpring.push(mutate(child, MUTATION_RATE));
        }
      });
    }

    population = offSpring;
    generation++;
  } while (repeatCounter < 10000);

  const finalStats: Results = calcPopulationStats(
    [...population],
    generation++
  );

  finalStats.duration = Utils.formatTime(moment().diff(startTime));
  postMessage(finalStats);
};

/** selectUpperPercentile
 * @desc Take the top specified percent of the population
 */
const selectUpperPercentile = (
  population: CityNode[][],
  percentile: number
) => {
  return [...population]
    .sort(
      (routeA: CityNode[], routeB: CityNode[]) =>
        calcFitness(routeB) - calcFitness(routeA)
    )
    .slice(0, Math.floor(population.length * percentile));
};

// waits for the signal to trigger the genetic algorithm
addEventListener('message', ({ data: allCities }: { data: CityNode[] }) => {
  startGeneticAlgorithm(allCities);
});
