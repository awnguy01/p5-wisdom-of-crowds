import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CityNode } from 'src/app/classes/models/city-node';
import { Utils } from 'src/app/classes/utils';
import { FormControl, FormBuilder } from '@angular/forms';
import { Observable, BehaviorSubject, timer, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as CanvasJS from 'src/assets/lib/canvasjs.min.js';
import { Results } from 'src/app/classes/models/results';
import { GeneticAlgorithmService } from 'src/app/services/genetic-algorithm.service';

const CHART_OPTS = {
  animationEnabled: true,
  theme: 'dark2',
  zoomEnabled: true,
  title: {
    text: 'Project 4 Genetic Algorithm'
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
    // { type: 'scatter', dataPoints: [] },
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
  currCities = new BehaviorSubject<CityNode[]>([]);
  selectedHistory = new BehaviorSubject<Results[]>([]);
  generationBreak = 0;

  tspFileCtrl: FormControl = this.fb.control(null);
  chart: any; // Displays the currently shortest traced route
  costChart: any; // Displays the improvement in minimum distance after subsequent generations

  constructor(
    readonly fb: FormBuilder,
    readonly genAlgSvc: GeneticAlgorithmService
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
  }

  /** pollResults
   * @desc checks the current results every 250 milliseconds to render the graphs
   */
  pollResults(): Subscription {
    return timer(0, 250).subscribe(() => {
      const currResults: Results = this.currResults.getValue();
      if (currResults) {
        this.chart.options.data[0].dataPoints = Utils.convertCitiesToDataPoints(
          currResults.minRoute
        );
        this.chart.render();
        if (currResults.generation >= this.generationBreak) {
          const selectedHistory = this.selectedHistory.getValue();
          this.selectedHistory.next([...selectedHistory, currResults]);
          this.generationBreak += 10000;
        }
      }
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

  /** runGeneticAlgorithm
   * @desc trigger to start a specified genetic algorithm
   */
  runGeneticAlgorithm(algorithm: 1 | 2 | 3 | 4) {
    const allCities = this.currCities.getValue();
    if (allCities) {
      this.genAlgSvc.startGeneticAlgorithm(algorithm, allCities);
    }
  }
}
