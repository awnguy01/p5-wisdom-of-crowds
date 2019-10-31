import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CityNode } from 'src/app/classes/models/city-node';
import { Utils } from 'src/app/classes/utils';
import { FormControl, FormBuilder } from '@angular/forms';
import { Observable, BehaviorSubject, timer, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as CanvasJS from 'src/assets/lib/canvasjs.min.js';
import { Results } from 'src/app/classes/models/results';
import { GeneticAlgorithmService } from 'src/app/services/genetic-algorithm.service';
import { CrowdWisdomService } from 'src/app/services/crowd-wisdom.service';

const CHART_OPTS = {
  animationEnabled: true,
  theme: 'dark2',
  zoomEnabled: true,
  title: {
    text: 'Project 5 Wisdom of Crowds'
  },
  toolTip: {
    contentFormatter: e => {
      const entry = e.entries[0] || e.entries[1];
      return `${entry.dataPoint.name}: (${entry.dataPoint.x}, ${entry.dataPoint.y})`;
    }
  },
  axisX: {
    viewportMinimum: -10,
    viewportMaximum: 110
  },
  axisY: {
    viewportMinimum: -10,
    viewportMaximum: 120
  },
  data: [
    {
      type: 'line',
      markerType: 'circle',
      markerSize: 10,
      dataPoints: []
    },
    { type: 'scatter', dataPoints: [] },
    {
      type: 'line',
      markerType: 'circle',
      markerSize: 10,
      dataPoints: []
    }
  ]
};
const COST_CHART_OPTS = {
  ...CHART_OPTS,
  theme: 'dark1',
  title: {
    text: 'Improvement Graph'
  },
  axisX: {
    title: 'Generation',
    viewportMinimum: 0,
    viewportMaximum: 310000
  },
  axisY: {
    title: 'Cost',
    viewportMinimum: 0,
    viewportMaximum: 7000
  }
};

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {
  @ViewChild('graphCanvas', { static: true }) graphCanvas: ElementRef;

  currResults = new BehaviorSubject<Results>(undefined);
  swarmResults = new BehaviorSubject<Results>(undefined);
  currCities = new BehaviorSubject<CityNode[]>([]);
  selectedHistory = new BehaviorSubject<Results[]>([]);
  generationBreak = 0;

  tspFileCtrl: FormControl = this.fb.control(null);
  chart: any; // Displays the currently shortest traced route
  costChart: any; // Displays the improvement in minimum distance after subsequent generations

  bestRoutes: number[] = [];
  crowdRoute: CityNode[] = [];
  crowdDistance: number = 0;

  constructor(
    readonly fb: FormBuilder,
    readonly genAlgSvc: GeneticAlgorithmService,
    readonly crowdWisdomSvc: CrowdWisdomService
  ) {}

  ngOnInit() {
    this.chart = new CanvasJS.Chart('chartContainer', CHART_OPTS);
    this.costChart = new CanvasJS.Chart('costChartContainer', COST_CHART_OPTS);
    this.chart.render();
    this.costChart.render();
    this.watchResultChanges().subscribe();
    this.tspFileCtrlChanges().subscribe();

    this.listenToHistory();
    this.pollResults();
    this.getResultsCache();
    this.listenToSwarmResults();
  }

  /** pollResults
   * @desc checks the current results every 250 milliseconds to render the graphs
   */
  pollResults(): Subscription {
    let lastMinRouteStr = '';
    return timer(0, 500).subscribe(() => {
      const currResults: Results = this.currResults.getValue();
      if (currResults) {
        const newMinRouteStr = JSON.stringify(currResults.minRoute);
        if (newMinRouteStr !== lastMinRouteStr) {
          console.log('re-rendering');
          this.chart.options.data[0].dataPoints = Utils.convertCitiesToDataPoints(
            currResults.minRoute
          );
          this.chart.render();
          lastMinRouteStr = newMinRouteStr;
        }
        if (currResults.generation >= this.generationBreak) {
          const selectedHistory = this.selectedHistory.getValue();
          this.selectedHistory.next([...selectedHistory, currResults]);
          this.generationBreak += 10000;
        }
      }
    });
  }

  /** getResultsCache
   * @desc gets the list of results generated from various genetic algorithm iterations
   */
  getResultsCache(): Subscription {
    return this.genAlgSvc.resultCache.subscribe((bestResults: Results[]) => {
      this.bestRoutes = bestResults.map(
        (result: Results) => result.minDistance
      );
    });
  }

  /** listenToSwarmResults
   * @desc listen to updates from the wisdom of crowds service
   */
  listenToSwarmResults(): Subscription {
    return this.crowdWisdomSvc.results.subscribe((results: Results) => {
      this.swarmResults.next(results);
      const dataPointFragments: any[] = [];
      results.fragments.forEach((fragment: CityNode[]) => {
        dataPointFragments.push(...Utils.convertCitiesToDataPoints(fragment));
        dataPointFragments.push({ x: 0, y: null });
      });
      this.chart.options.data[0].dataPoints = dataPointFragments;
      this.chart.options.data[1].dataPoints = Utils.convertCitiesToDataPoints(
        results.unusedNodes
      );
      const dataPointGreedyPairs: any[] = [];
      results.greedyPairs.forEach((pair: CityNode[]) => {
        dataPointGreedyPairs.push(...Utils.convertCitiesToDataPoints(pair));
        dataPointGreedyPairs.push({ x: 0, y: null });
      });
      if (results.crowdRoute && results.crowdRoute.length) {
        this.crowdRoute = results.crowdRoute;
        this.crowdDistance = Utils.calcTotalDistance(results.crowdRoute, true);
      }
      this.chart.options.data[2].dataPoints = dataPointGreedyPairs;
      this.chart.options.data[2].dataPoints = this.chart.render();
    });
  }

  /** listenToHistory
   * @desc updates the improvement graph every time a new data point is received
   */
  listenToHistory(): Subscription {
    return this.selectedHistory.subscribe((results: Results[]) => {
      const dataPoints = results.map((result: Results) => ({
        x: result.generation,
        y: result.minDistance
      }));
      this.costChart.options.data[0].dataPoints = dataPoints;
      this.costChart.render();
    });
  }

  /** watchResultChanges
   * @desc subscribe to updates in results from the AI service
   */
  watchResultChanges(): Observable<Results> {
    return this.genAlgSvc.results.asObservable().pipe(
      tap((results?: Results) => {
        if (results) {
          this.currResults.next(results);
        }
      })
    );
  }

  /** tspFileCtrlChanges
   * @desc wait to read new file inputs and begin finding the Hamiltonian path
   */
  tspFileCtrlChanges(): Observable<any> {
    return this.tspFileCtrl.valueChanges.pipe(
      tap((file: File) => {
        this.currResults.next(undefined);
        this.genAlgSvc.results.next(undefined);
        this.genAlgSvc.resultCache.next([]);
        const reader = new FileReader();

        reader.onloadend = () => {
          const allCities = Utils.parseCitiesFromFileText(
            reader.result as string
          );
          this.chart.options.data[0].dataPoints = Utils.convertCitiesToDataPoints(
            allCities
          );
          this.chart.render();
          this.currCities.next(allCities);
        };
        if (file) {
          reader.readAsText(file);
        }
      })
    );
  }

  /** routeToString
   * @desc adds a space between nodes in a route string
   */
  routeToString(route: CityNode[]): string {
    return Utils.routeToString(route).replace(/,/g, ', ');
  }

  /** calcStandardDeviation
   * @desc calls the util function to calculate the standard deviation of a population
   */
  calcStandardDeviation(population: CityNode[][]) {
    const distances = population.map((route: CityNode[]) =>
      Utils.calcTotalDistance(route, true)
    );
    return Utils.calcStandardDeviation(distances);
  }

  /** roundToNearestThousandth
   * @desc round a number to the nearest thousandth decimal
   */
  roundToNearestThousandth(val: number): number {
    return Math.round(val * 1000) / 1000;
  }

  /** runGeneticAlgorithm
   * @desc trigger to start a specified genetic algorithm
   */
  runGeneticAlgorithm() {
    const allCities = this.currCities.getValue();
    if (allCities) {
      this.genAlgSvc.startGeneticAlgorithm(allCities);
    }
  }

  /** useWisdomOfCrowds
   * @desc use the wisdom of crowds aggregation technique to find a more optimal solution
   */
  useWisdomOfCrowds() {
    const currResults = this.currResults.getValue();
    if (currResults.duration) {
      this.crowdWisdomSvc.consultTheExperts(
        this.genAlgSvc.resultCache
          .getValue()
          .map((result: Results) => Utils.filterDuplicates(result.minRoute))
      );
    }
  }
}
