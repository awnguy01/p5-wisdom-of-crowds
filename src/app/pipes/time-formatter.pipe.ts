import { Pipe, PipeTransform } from '@angular/core';
import { Utils } from '../classes/utils';

@Pipe({
  name: 'timeFormatter'
})
export class TimeFormatterPipe implements PipeTransform {
  transform(milliseconds: number): any {
    return Utils.formatTime(milliseconds);
  }
}
