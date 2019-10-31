import { TestBed } from '@angular/core/testing';

import { CrowdWisdomService } from './crowd-wisdom.service';

describe('CrowdWisdomService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CrowdWisdomService = TestBed.get(CrowdWisdomService);
    expect(service).toBeTruthy();
  });
});
