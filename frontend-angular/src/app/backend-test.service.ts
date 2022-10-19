import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable()
export class BackendTestService {

  baseURL: string = "http://localhost:8080/";

  constructor(private http: HttpClient) {
  }

  getClock(): Observable<any> {
    return this.http.get(this.baseURL + 'clock');
  }

  getPredefinedQueryResult(): Observable<any>{
    return this.http.get(this.baseURL + 'database/predefined');
  }

}
