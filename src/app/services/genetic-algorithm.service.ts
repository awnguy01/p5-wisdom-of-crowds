import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Results } from '../classes/models/results';
import { CityNode } from '../classes/models/city-node';

@Injectable({
  providedIn: 'root'
})
export class GeneticAlgorithmService {
  results = new BehaviorSubject<Results | undefined>(undefined);
  resultCache = new BehaviorSubject<Results[]>([]);

  worker: Worker;

  constructor() {
    // updates the results upon receiving a new message from the web worker
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker('./genetic-algorithm.worker', {
        type: 'module'
      });
      this.worker.onmessage = ({ data }) => {
        const results: Results = data;
        this.results.next(results);
        if (results.duration) {
          this.resultCache.next([...this.resultCache.getValue(), results]);
        }
      };
    } else {
      // Web Workers are not supported in this environment.
    }
  }

  /** startGeneticAlgorithm
   * @desc sends a signal to the web worker to start the specified algorithm
   */
  startGeneticAlgorithm(allCities: CityNode[]) {
    this.worker.postMessage(allCities);
  }
}
