import { Platform } from "react-native";

export let storage;

//secure store returns promises so we will return promises here for compatibility
const webStorage = {
    set: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    remove: (key) => Promise.resolve(localStorage.removeItem(key)),
    get: (key) => Promise.resolve(localStorage.getItem(key))

};

const mobileStorage = {
    set: (key, value) => SecureStore.setItemAsync(key, value),
    remove: (key) => SecureStore.deleteItemAsync(key),
    get: (key) => SecureStore.getItemAsync(key)
};

export function initStorage() {
    if (Platform.OS === "web") {
        storage = webStorage;
    } else {
        storage = mobileStorage;
    }
};