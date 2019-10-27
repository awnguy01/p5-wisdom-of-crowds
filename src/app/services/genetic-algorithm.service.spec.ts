import { TestBed } from '@angular/core/testing';

import { GeneticAlgorithmService } from './genetic-algorithm.service';

describe('GeneticAlgorithmService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GeneticAlgorithmService = TestBed.get(GeneticAlgorithmService);
    expect(service).toBeTruthy();
  });
});
