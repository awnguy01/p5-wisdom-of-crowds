import { Injectable } from '@angular/core';
import { CityNode } from '../classes/models/city-node';
import { Utils } from '../classes/utils';
import { Results } from '../classes/models/results';
import { BehaviorSubject } from 'rxjs';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class CrowdWisdomService {
  results = new BehaviorSubject<Results>(new Results());
  constructor() {}

  /** consultTheExperts
   * @desc Find a new solution from aggregating the given solutions
   */
  consultTheExperts(experts: CityNode[][]): CityNode[] {
    const startTime = moment();
    // Look for common subsequences found in a specified percent of the experts
    let nodeFragments: CityNode[][] = this.findConnectedNodes(experts);
    nodeFragments = this.mergeCommonNodeFragments(nodeFragments);

    const results: Results = new Results();
    results.fragments = nodeFragments;
    results.unusedNodes = this.getUnusedNodes(nodeFragments, experts[0]);
    this.results.next(results);

    const finalRoute = this.greedyConnectFragments(nodeFragments, experts[0]);
    console.log(finalRoute);
    console.log(Utils.calcTotalDistance(finalRoute, true));
    const currResults: Results = this.results.getValue();
    currResults.duration = Utils.formatTime(moment().diff(startTime));
    this.results.next(currResults);

    return finalRoute;
  }

  /** greedyConnectFragments
   * @desc Greedy algorithm to recursively connect the closest
   * fragment endpoints and unconnected nodes until path is complete
   */
  greedyConnectFragments(
    fragmentList: CityNode[][],
    nodeList: CityNode[]
  ): CityNode[] {
    // Base case to return final route if there is only a single fragment left
    if (fragmentList.length === 1) {
      const finalFragment: CityNode[] = fragmentList[0];
      const finalPair = [
        finalFragment[0],
        finalFragment[finalFragment.length - 1]
      ];
      const finalResults: Results = this.calcCrowdResults(finalPair, nodeList);
      finalResults.crowdRoute = fragmentList[0];
      this.results.next(finalResults);
      return fragmentList[0];
    }

    // Create an array of potential nodes to connect
    // from the unconnected nodes and fragment endpoints
    const unusedNodes: CityNode[] = this.getUnusedNodes(fragmentList, nodeList);
    let endpoints: CityNode[] = [...unusedNodes];
    fragmentList.forEach((fragment: CityNode[]) => {
      endpoints.push(fragment[0]);
      endpoints.push(fragment[fragment.length - 1]);
    });

    endpoints = Utils.filterDuplicates(endpoints);

    // List of all possible connections without creating any premature closed loops
    const allPairs = Utils.getListOfPairs(endpoints).filter(
      (pair: CityNode[]) =>
        !fragmentList.some((fragment: CityNode[]) => {
          const fragStart: string = JSON.stringify(fragment[0]);
          const fragEnd: string = JSON.stringify(fragment[fragment.length - 1]);
          const pairStart: string = JSON.stringify(pair[0]);
          const pairEnd: string = JSON.stringify(pair[1]);
          const inOrderMatched = fragStart === pairStart && fragEnd === pairEnd;
          const reverseOrderMatched =
            fragStart === pairEnd && fragEnd === pairStart;
          return inOrderMatched || reverseOrderMatched;
        })
    );

    // Find the lowest cost available node pair
    const minPair: CityNode[] = this.findMinPair(allPairs);

    // Append the pair to the fragment list and proceed to next recursion
    // if both parts of the pair are not currently part of any fragment
    const pairIsUnused = minPair.every((pairPartial: CityNode) =>
      unusedNodes.includes(pairPartial)
    );
    if (pairIsUnused) {
      return this.greedyConnectFragments([...fragmentList, minPair], nodeList);
    }

    // Find the fragment that each pair node is referring to if it exists
    // and mark if the node is at the start of the fragment or end
    let firstEndPointFragment: CityNode[] = [minPair[0]];
    let firstPairNodeAtFragStart = true;
    let secondEndPointFragment: CityNode[] = [minPair[1]];
    let secondNodeAtFragStart = true;
    fragmentList.forEach((fragment: CityNode[]) => {
      const fragStartStr = JSON.stringify(fragment[0]);
      const fragEndStr = JSON.stringify(fragment[fragment.length - 1]);
      const pairStartStr = JSON.stringify(minPair[0]);
      const pairEndStr = JSON.stringify(minPair[1]);
      if (fragStartStr === pairStartStr) {
        firstPairNodeAtFragStart = true;
        firstEndPointFragment = fragment;
      } else if (fragStartStr === pairEndStr) {
        secondNodeAtFragStart = true;
        secondEndPointFragment = fragment;
      } else if (fragEndStr === pairStartStr) {
        firstPairNodeAtFragStart = false;
        firstEndPointFragment = fragment;
      } else if (fragEndStr === pairEndStr) {
        secondNodeAtFragStart = false;
        secondEndPointFragment = fragment;
      }
    });

    // Create a new fragment list without the found fragments
    const filteredFragmentList: CityNode[][] = fragmentList.filter(
      (fragment: CityNode[]) => {
        const fragmentStr = JSON.stringify(fragment);
        return (
          fragmentStr !== JSON.stringify(firstEndPointFragment) &&
          fragmentStr !== JSON.stringify(secondEndPointFragment)
        );
      }
    );

    // Create a new fragment from two fragments
    // joined at their specified reference points
    const joinedFragment: CityNode[] = this.joinFragments(
      firstEndPointFragment,
      secondEndPointFragment,
      firstPairNodeAtFragStart,
      secondNodeAtFragStart
    );
    filteredFragmentList.push(joinedFragment);

    this.results.next(this.calcCrowdResults(minPair, nodeList));

    return this.greedyConnectFragments(filteredFragmentList, nodeList);
  }

  /** joinFragments
   * @desc join two fragments at their specified reference points
   */
  joinFragments(
    firstFrag: CityNode[],
    secondFrag: CityNode[],
    firstFragJoinAtStart: boolean,
    secondFragJoinAtStart: boolean
  ): CityNode[] {
    let joinedFragment = [];
    if (firstFragJoinAtStart && secondFragJoinAtStart) {
      const reversedFirstFragment = [...firstFrag].reverse();
      joinedFragment = [...reversedFirstFragment, ...secondFrag];
    }
    if (!firstFragJoinAtStart && secondFragJoinAtStart) {
      joinedFragment = [...firstFrag, ...secondFrag];
    }
    if (firstFragJoinAtStart && !secondFragJoinAtStart) {
      joinedFragment = [...secondFrag, ...firstFrag];
    }
    if (!firstFragJoinAtStart && !secondFragJoinAtStart) {
      const reversedSecondFragment = [...secondFrag].reverse();
      joinedFragment = [...firstFrag, ...reversedSecondFragment];
    }
    return joinedFragment;
  }

  /** findMinPair
   * @desc find the pair with the lowest distance from a list of node pairs
   */
  findMinPair(allPairs: CityNode[][]): CityNode[] {
    let minPair: CityNode[] = [];
    let minDistance = 0;

    allPairs.forEach((pair: CityNode[]) => {
      const distance = Utils.calcDistance(pair[0], pair[1]);
      if (!minPair.length) {
        minPair = pair;
        minDistance = distance;
      } else {
        if (distance < minDistance) {
          minPair = pair;
          minDistance = distance;
        }
      }
    });
    return minPair;
  }

  /** calcCrowdResults
   * @desc Return results updated with new greedy pair and unconnected nodes
   */
  calcCrowdResults(minPair: CityNode[], nodeList: CityNode[]): Results {
    const currResults = this.results.getValue();
    currResults.greedyPairs.push(minPair);
    const nonPairedNodes = nodeList.filter(
      (node: CityNode) => !minPair.includes(node)
    );
    currResults.unusedNodes = currResults.unusedNodes.filter(
      (unusedNode: CityNode) => nonPairedNodes.includes(unusedNode)
    );
    return currResults;
  }

  /** getUnusedNodes
   * @desc Scan a list of fragments and determine which nodes from the node list were not include
   */
  getUnusedNodes(fragments: CityNode[][], nodeList: CityNode[]) {
    const usedNodes: CityNode[] = [].concat(...fragments);
    return nodeList.filter(
      (node: CityNode) =>
        !usedNodes
          .map((usedNode: CityNode) => JSON.stringify(usedNode))
          .includes(JSON.stringify(node))
    );
  }

  /** mergeCommonNodeFragments
   * @desc Combine fragments that have common endpoints
   */
  mergeCommonNodeFragments(fragmentList: CityNode[][]): CityNode[][] {
    const fixedList: CityNode[][] = [];
    const remainingFragments: CityNode[][] = [...fragmentList];

    fragmentList.forEach((fragment: CityNode[]) => {
      // Process each fragment only once
      if (Utils.arrayIncludes(remainingFragments, fragment)) {
        const leftNode = fragment[0];
        const rightNode = fragment[fragment.length - 1];
        const leftNodeStr = JSON.stringify(leftNode);
        const rightNodeStr = JSON.stringify(rightNode);
        remainingFragments.splice(remainingFragments.indexOf(fragment), 1);
        const mergedFragment = [...fragment];
        const remainingFragmentsCopy = [...remainingFragments];
        remainingFragmentsCopy.forEach((remFragment: CityNode[]) => {
          if (Utils.arrayIncludes(remainingFragments, remFragment)) {
            const remFragmentCopy = [...remFragment];
            const remLeftNode: CityNode = remFragment[0];
            const remRightNode: CityNode = remFragment[remFragment.length - 1];
            const remLeftNodeStr = JSON.stringify(remLeftNode);
            const remRightNodeStr = JSON.stringify(remRightNode);
            const removeRemFragment = () => {
              remainingFragments.splice(
                remainingFragments.indexOf(remFragment),
                1
              );
            };
            if (remLeftNodeStr === leftNodeStr) {
              remFragmentCopy.shift();
              mergedFragment.unshift(...remFragmentCopy.reverse());
              removeRemFragment();
            } else if (remLeftNodeStr === rightNodeStr) {
              remFragmentCopy.shift();
              mergedFragment.push(...remFragmentCopy);
              removeRemFragment();
            } else if (remRightNodeStr === leftNodeStr) {
              remFragmentCopy.pop();
              mergedFragment.unshift(...remFragmentCopy);
              removeRemFragment();
            } else if (remRightNodeStr === rightNodeStr) {
              remFragmentCopy.pop();
              mergedFragment.push(...[...remFragmentCopy].reverse());
              removeRemFragment();
            }
          }
        });
        fixedList.push(mergedFragment);
      }
    });

    if (fragmentList.length === fixedList.length) {
      return fixedList;
    }
    return this.mergeCommonNodeFragments(fixedList);
  }

  /** findConnectedNodes
   * @desc return a list of node pairs that exist
   * in at least 90% (floor) of the provided routes
   */
  findConnectedNodes(experts: CityNode[][]) {
    const nodeList: CityNode[] = experts[0];
    const lastIndex = nodeList.length - 1;
    const connectedPairs: CityNode[][] = [];
    nodeList.forEach((targetNode: CityNode) => {
      let connectedNode: CityNode | undefined;
      let connectedCount = 0;
      nodeList.forEach((candidateNode: CityNode) => {
        let candidateCount = 0;
        experts.forEach((expertRoute: CityNode[]) => {
          const targetNodeIndex: number = expertRoute.findIndex(
            (testNode: CityNode) =>
              JSON.stringify(testNode) === JSON.stringify(targetNode)
          );
          const candidateNodeIndex: number = expertRoute.findIndex(
            (testNode: CityNode) =>
              JSON.stringify(testNode) === JSON.stringify(candidateNode)
          );
          if (
            (targetNodeIndex === 0 && candidateNodeIndex === lastIndex) ||
            (targetNodeIndex === lastIndex && candidateNodeIndex === 0) ||
            Math.abs(targetNodeIndex - candidateNodeIndex) === 1
          ) {
            candidateCount++;
          }
        });
        if (candidateCount > connectedCount) {
          connectedNode = candidateNode;
          connectedCount = candidateCount;
        }
      });
      if (connectedCount > Math.floor(experts.length * 0.9)) {
        connectedPairs.push([targetNode, connectedNode]);
      }
    });
    return Utils.filterDuplicates(
      connectedPairs.map((nodePair: CityNode[]) => {
        return [...nodePair].sort(
          (nodeA: CityNode, nodeB: CityNode) => +nodeA.name - +nodeB.name
        );
      })
    );
  }
}
