import { useState, createContext, useContext, useEffect, PropsWithChildren } from "react";
import Loading from "../pages/Loading";

export type JSONType = { [key: string | number]: JSON } | string | number | boolean | null | JSONType[];

export interface AppProviderProps extends PropsWithChildren { }

export interface SingleJSONData {
    title: string;
    data: any;
}

export interface JSONData {
    json_left: SingleJSONData;
    json_right: SingleJSONData;
}

export interface IDBStorageItem {
    title: string;
    data: JSONData;
}

export interface _IDBStorageItem extends IDBStorageItem {
    id: number;
}

export interface ComparisonMetaData {
    id: number;
    title: string;
}

export interface AppContextInterface {
    loading: boolean;
    savedComparisons: ComparisonMetaData[];
    saveComparison: (data: IDBStorageItem) => Promise<number>;
    deleteComparison: (id: number) => void;
    getComparison: (id: number) => Promise<_IDBStorageItem>;
    updateComparison: (id: number, data: IDBStorageItem) => void;
}

const AppContext = createContext<AppContextInterface>({
    loading: true,
    savedComparisons: [],
    saveComparison: async () => 1,
    updateComparison: () => { },
    deleteComparison: () => { },
    getComparison: (id) => {
        return new Promise((resolve) => {
            resolve({
                id,
                title: "",
                data: {
                    json_left: {
                        title: "",
                        data: {},
                    },
                    json_right: {
                        title: "",
                        data: {},
                    },
                },
            });
        });
    },
});

const LOCAL_STORAGE_KEY = "json_comp_ls_key";
const IDB_STORAGE_KEY = "json_comp_idb_key";
const IDB_COMPARISONS_STORE_KEY = IDB_STORAGE_KEY; //"json_comp_idb_comparisons_store_key";

export function useAppContext() {
    return useContext(AppContext);
}

let IDB_CONNECTION_REQ: IDBOpenDBRequest | null = null;

export function AppProvider({ children }: AppProviderProps) {
    const [initializing, setInitializing] = useState(true);
    const [loading, setLoading] = useState(false);
    const [savedComparisonMetas, setSavedComparisonMetas] = useState<{ [id: number]: ComparisonMetaData }>({});
    const [database, setDatabase] = useState<IDBDatabase | null>(null);

    function addDataToStorage(data: IDBStorageItem) {
        return new Promise<number>((resolve, reject) => {
            if (!database) return reject("No database");
            setLoading(true);
            // open a read/write db transaction, ready for adding the data
            const transaction = database.transaction([IDB_COMPARISONS_STORE_KEY], "readwrite");

            // Report on the success of the transaction completing, when everything is done
            transaction.addEventListener("complete", () => {
                console.log("Transaction completed: database modification finished.");
            });

            transaction.addEventListener("error", () => {
                console.log("Transaction not opened due to error");
                reject("Transaction not opened due to error");
            });

            // call an object store that's already been added to the database
            const objectStore = transaction.objectStore(IDB_COMPARISONS_STORE_KEY);

            // Make a request to add our newItem object to the object store
            const addRequest = objectStore.add(data);

            addRequest.addEventListener("success", () => {
                console.log("Success: data has been added to object store", addRequest.result);
                if (typeof addRequest.result !== "number") return reject("No result");
                setSavedComparisonMetas((old_data) => {
                    old_data[addRequest.result as number] = { id: addRequest.result as number, title: data.title }
                    return { ...old_data };
                });
                // setSavedDataFromStorage((old_array) => [...old_array, { ...data, id: addRequest.result as number }]);
                setLoading(false);
                return resolve(addRequest.result as number);
            });

            addRequest.addEventListener("error", () => {
                console.log("Error: data has not been added to object store");
                return reject("Error: data has not been added to object store");
            });
        });
    }

    function updateDataInStorage(id: number, data: IDBStorageItem) {
        if (!database) return;
        setLoading(true);
        // open a read/write db transaction, ready for adding the data
        const transaction = database.transaction([IDB_COMPARISONS_STORE_KEY], "readwrite");

        // Report on the success of the transaction completing, when everything is done
        transaction.addEventListener("complete", () => {
            console.log("Transaction completed: database modification finished.");
        });

        transaction.addEventListener("error", () => {
            console.log("Transaction not opened due to error");
        });

        // call an object store that's already been added to the database
        const objectStore = transaction.objectStore(IDB_COMPARISONS_STORE_KEY);

        // Make a request to update our item object to the object store
        const updateRequest = objectStore.put(data, id);

        updateRequest.addEventListener("success", () => {
            console.log("Success: data has been added to object store", updateRequest.result);
            if (typeof updateRequest.result !== "number") return;
            setSavedComparisonMetas((old_data_list) => {
                old_data_list[updateRequest.result as number] = { id: updateRequest.result as number, title: data.title }
                return { ...old_data_list };
            });
            // setSavedDataFromStorage((old_array) => [...old_array, { ...data, id: addRequest.result as number }]);
            setLoading(false);
        });

        updateRequest.addEventListener("error", () => {
            console.log("Error: data has not been updated to object store");
        });
    }

    function getSavedComparisonMetas(database?: IDBDatabase) {
        return new Promise<typeof savedComparisonMetas>((resolve, reject) => {
            if (!database) resolve([]);
            setLoading(true);
            const transaction = database.transaction([IDB_COMPARISONS_STORE_KEY], "readonly");
            const objectStore = transaction.objectStore(IDB_COMPARISONS_STORE_KEY);
            let res = objectStore.getAll();
            console.log('called getall', res);
            res.addEventListener("success", (evt) => {
                let items = res.result;
                let metas: typeof savedComparisonMetas = {};
                items.forEach((item: _IDBStorageItem) => {
                    metas[item.id] = {
                        id: item.id,
                        title: item.title,
                    };
                });
                setSavedComparisonMetas(metas);
                setLoading(false);
                setInitializing(false);
                resolve(metas);
            });
            res.addEventListener("error", (evt) => {
                setLoading(false);
                setInitializing(false);
                console.error(evt);
                reject(evt);
            });
        });
    }

    function getSavedComparison(id: number) {
        return new Promise<_IDBStorageItem>((resolve, reject) => {
            if (!database) return;
            setLoading(true);
            const transaction = database.transaction([IDB_COMPARISONS_STORE_KEY], "readwrite");
            const objectStore = transaction.objectStore(IDB_COMPARISONS_STORE_KEY);
            let pending = objectStore.openCursor(id);
            pending.addEventListener("success", (evt) => {
                setLoading(false);
                console.log("Success: data has been fetched from object store", evt);
                if (!evt.target) reject("No target");
                const cursor = (evt.target as any).result;
                if (cursor) {
                    resolve(cursor.value as _IDBStorageItem);
                }
                reject("No cursor");
            });
            pending.addEventListener("error", (evt) => {
                setLoading(false);
                reject(evt);
            });
        });
    }

    function deleteSavedDataFromStorage(id: number) {
        if (!database) return;
        let matching = savedComparisonMetas[id];
        if (!matching) return;
        setLoading(true);
        // open a database transaction and delete the task, finding it using the id we retrieved above
        const transaction = database.transaction([IDB_COMPARISONS_STORE_KEY], "readwrite");
        const objectStore = transaction.objectStore(IDB_COMPARISONS_STORE_KEY);
        const deleteRequest = objectStore.delete(matching.id);
        // report that the data item has been deleted
        transaction.addEventListener("complete", () => {
            // delete the parent of the button
            console.log(`Data ${id} deleted.`);
            setSavedComparisonMetas((old_data) => {
                delete old_data[id];
                return { ...old_data };
            });
            setLoading(false);
        });
        transaction.addEventListener("error", (evt) => {
            console.log("Error deleting data", evt);
        });
        deleteRequest.addEventListener("success", () => {
            console.log("Data deleted");
        });
        deleteRequest.addEventListener("error", (evt) => {
            console.error("Error deleting data", evt);
        });
    }

    function onIDBConnectionSuccess() {
        console.log("Success: Database connection opened", IDB_CONNECTION_REQ);
        if (!IDB_CONNECTION_REQ) return;
        setDatabase(IDB_CONNECTION_REQ.result);
        getSavedComparisonMetas(IDB_CONNECTION_REQ.result).then(console.log).catch(console.error);
    }

    function onIDBConnectionUpgradeNeeded(event: IDBVersionChangeEvent) {
        console.log("Upgrade needed called", (event.target as any).result);
        // if (!IDB_CONNECTION_REQ) return;
        if (!event.target) {
            console.error("No target");
            return;
        };
        // Grab a reference to the opened database
        setDatabase((event.target as any).result);
        let _database = (event.target as any).result as IDBDatabase;
        if (!_database) {
            console.error("No database");
            return;
        };

        console.log('Creating object store', _database);

        // Create an objectStore in our database to store notes and an auto-incrementing key
        // An objectStore is similar to a 'table' in a relational database
        const objectStore = _database.createObjectStore(IDB_COMPARISONS_STORE_KEY, {
            keyPath: "id",
            autoIncrement: true,
        });

        // Define what data items the objectStore will contain
        objectStore.createIndex("title", "title", { unique: false });
        objectStore.createIndex("data", "data", { unique: false });

        console.log("Database setup complete");
    }

    function onIDBConnectionError(event: Event) {
        console.error("Database error: " + (event.target as any).errorCode);
    }

    useEffect(() => {
        console.log("Initializing IDB");
        IDB_CONNECTION_REQ = window.indexedDB.open(IDB_STORAGE_KEY, 1);
        IDB_CONNECTION_REQ.addEventListener("error", onIDBConnectionError);
        IDB_CONNECTION_REQ.addEventListener("success", onIDBConnectionSuccess);
        IDB_CONNECTION_REQ.addEventListener("upgradeneeded", onIDBConnectionUpgradeNeeded);
        return () => {
            IDB_CONNECTION_REQ?.removeEventListener("error", onIDBConnectionError);
            IDB_CONNECTION_REQ?.removeEventListener("success", onIDBConnectionSuccess);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedComparisonMetas));
    }, [savedComparisonMetas]);

    return (
        <AppContext.Provider
            value={{
                loading,
                savedComparisons: Object.values(savedComparisonMetas),
                getComparison: getSavedComparison,
                saveComparison: addDataToStorage,
                deleteComparison: deleteSavedDataFromStorage,
                updateComparison: updateDataInStorage,
            }}
        >
            {database && !initializing ? children : <Loading />}
        </AppContext.Provider>
    );
}
