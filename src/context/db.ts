import Dexie, { Table } from 'dexie';
import { IDBStorageItem } from './AppContext';

export interface Comparison {
    id?: number;
    data: IDBStorageItem;
}

export class Database extends Dexie {
    // 'friends' is added by dexie when declaring the stores()
    // We just tell the typing system this is the case
    comparisons!: Table<Comparison>;

    constructor() {
        super('gray-db');
        this.version(1).stores({
            comparisons: '++id, data.title' // Primary key and indexed props
        });
    }
}

export const db = new Database();