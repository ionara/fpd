import { DataSource} from '@angular/cdk/collections';
import { Observable, BehaviorSubject } from 'rxjs';
import { IndustriesGeojson } from '../services/industries-geojson.service';

export class ListDataSource implements DataSource<any> {

    public listSubject = new BehaviorSubject<any[]>([]);
    constructor(private _data: IndustriesGeojson) { }

    loadTable(sort: string, sortField: string, pageIndex: number, pageSize: number) {
       return this._data.getPagedData(sort, sortField, pageIndex, pageSize)
        .pipe()
        .subscribe(d => {this.listSubject.next(d);
        });
    }

    connect(): Observable<any[]> {
        return this.listSubject.asObservable();
    }

    disconnect(): void {
        this.listSubject.complete();
    }

}
