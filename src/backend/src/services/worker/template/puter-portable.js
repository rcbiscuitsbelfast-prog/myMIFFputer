// This file is not actually in the webpack project, it is handled seperately.

if (globalThis.Cloudflare) {
    // Cloudflare Workers has a faulty EventTarget implementation which doesn't bind "this" to the event handler
    // This is a workaround to bind "this" to the event handler
    // https://github.com/cloudflare/workerd/issues/4453
    const __cfEventTarget = EventTarget;
    globalThis.EventTarget = class EventTarget extends __cfEventTarget {
        constructor(...args) {
            super(...args)
        }
        addEventListener(type, listener, options) {
            super.addEventListener(type, listener.bind(this), options);
        }
    }
}

globalThis.init_puter_portable = (auth, apiOrigin, type) => {
    // Minimal puter implementation for workers
    const puter = {
        setAPIOrigin: function(origin) {
            this.apiOrigin = origin;
        },
        setAuthToken: function(token) {
            this.authToken = token;
        },
        apiOrigin: null,
        authToken: null
    };
    
    if (type === "userPuter") {
        const goodContext = {}
        Object.getOwnPropertyNames(globalThis).forEach(name => { try { goodContext[name] = globalThis[name]; } catch {} })
        goodContext.globalThis = goodContext;
        goodContext.WorkerGlobalScope = WorkerGlobalScope;
        goodContext.ServiceWorkerGlobalScope = ServiceWorkerGlobalScope;
        goodContext.location = new URL("https://puter.work");
        goodContext.addEventListener = ()=>{};
        goodContext.puter = puter;
        goodContext.puter.setAPIOrigin(apiOrigin);
        goodContext.puter.setAuthToken(auth);
        return goodContext.puter;
    } else {
        globalThis.puter = puter;
        puter.setAPIOrigin(apiOrigin);
        puter.setAuthToken(auth);
    }
}
#include "../dist/webpackPreamplePart.js"

