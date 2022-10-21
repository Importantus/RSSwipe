import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from "./../environments/environment";



@Injectable()
export class BackendTestService {

  baseURL: string = environment.BACKEND_URL + "/";

  constructor(private http: HttpClient) {
  }

  getClock(): Observable<any> {
    return this.http.get(this.baseURL + 'clock');
  }

  getPredefinedQueryResult(): Observable<any>{
    return this.http.get(this.baseURL + 'database/predefined');
  }

}
