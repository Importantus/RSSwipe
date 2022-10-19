import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable()
export class BackendTestService {

  baseURL: string = "http://" + process.env['BACKEND_HOST'] +":" + process.env['BACKEND_PORT'] + "/";

  constructor(private http: HttpClient) {
  }

  getClock(): Observable<any> {
    return this.http.get(this.baseURL + 'clock');
  }

  getPredefinedQueryResult(): Observable<any>{
    return this.http.get(this.baseURL + 'database/predefined');
  }

}
