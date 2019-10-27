import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: FileUploadComponent,
      multi: true
    }
  ]
})
/***** Utility component for listening to file inputs */
export class FileUploadComponent implements OnInit {
  onChange: (...args: any) => any;
  file?: File;

  @HostListener('change', ['$event.target.files']) emitFiles(event: FileList) {
    const file = event && event.item(0);
    this.onChange(file);
    this.file = file;
  }

  constructor(readonly host: ElementRef<HTMLInputElement>) {}

  ngOnInit() {}

  writeValue() {
    this.host.nativeElement.value = '';
    this.file = null;
  }

  registerOnChange(fn: () => any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => any) {}
}
