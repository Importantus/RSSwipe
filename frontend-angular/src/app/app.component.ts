import { Component } from '@angular/core';
import {BackendTestService} from "./backend-test.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'frontend-old-angular';
  responseOutput = '';

  constructor(private backendService: BackendTestService) {
  }

  public getClock(){
    this.backendService.getClock()
      .subscribe(
        (response) => {
          this.responseOutput = response.someDateTime;
        }
      );
  }

  public getPredefinedEntity(){
    this.backendService.getPredefinedQueryResult()
      .subscribe(
        (response) => {
          this.responseOutput = JSON.stringify(response.queryResponse);
        }
      );
  }
}
