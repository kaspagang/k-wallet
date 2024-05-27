
function firebaseStore(collection) {
    return {
        get: async (key) => {
            const doc = await collection.doc(key).get();
            if (doc.exists) {
                return doc.data();
            }
            return undefined;
        },
        set: async (key, value) => {
            return await collection.doc(key).set(
                value
            );
        },
        delete: async (key) => {
            await collection.doc(key).delete();
            return true;
        }
    }
}

function initStore(config) {
    switch (config.storeType) {
        case "keyv": {
            const Keyv = require('keyv');
            return {
                userStore: new Keyv(config.userStore),
                custodyStore: new Keyv(config.custodyStore),
            } 
        }
        case "firestore": {
            const Keyv = require('keyv');
            const Firestore = require('@google-cloud/firestore');
            const db = new Firestore(config.storeConfig)
            return {
                userStore: new Keyv({store: firebaseStore(db.collection(config.userStore)), serialize: (x) => x, deserialize: (x) => x}),
                custodyStore: new Keyv({store: firebaseStore(db.collection(config.custodyStore)), serialize: (x) => x, deserialize: (x) => x})
            }
        }
        default:
            throw Error(`Unimplemented store type ${config.storeType}`)
    }

}

module.exports = {
    initStore
}
