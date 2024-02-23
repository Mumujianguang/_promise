const PromiseState = {
    pending: 'pending',
    fulfilled: 'fulfilled',
    rejected: 'rejected'
}

class _Promise {
    state = PromiseState.pending;

    value;   
    reason;

    fulfilledQueue = [];
    rejectedQueue = [];

    constructor(executor) {

        try {
            executor(
                (value) => this.resolve(value),
                (reason) => this.reject(reason)
            )
        } catch(e) {
            this.reject(e);
        }

    }

    resolve(value) {
        if (this.state !== PromiseState.pending) {
            return;
        }

        this.state = PromiseState.fulfilled;
        this.value = value;

        this.fulfilledQueue.forEach((onFulfilled) => onFulfilled(value))
    }

    reject(reason) {
        if (this.state !== PromiseState.pending) {
            return;
        }

        this.state = PromiseState.rejected;
        this.reason = reason;

        this.rejectedQueue.forEach((onRejected) => onRejected(reason))
    }

    resolutionProcedure(promise2, x, resolve, reject) {
        if (promise2 === x) {
            reject(new TypeError('promise2 === x'));
            return;
        }

        if (x instanceof _Promise) {
            x.then(
                (value) => this.resolutionProcedure(promise2, value, resolve, reject),
                (reason) => reject(reason)
            );
            return;
        }

        if (
            x !== null &&
            typeof x === 'object' ||
            typeof x === 'function'
        ) {
            let then;

            try {
                then = x.then;
            } catch (error) {
                reject(error);
                return;
            }

            if (typeof then === 'function') {
                let isCalledResolvePromise = false;
                let isCalledRejectPromise = false;
                const resolvePromise = (value) => {
                    if (isCalledResolvePromise || isCalledResolvePromise) {
                        return;
                    }

                    isCalledResolvePromise = true;
                    this.resolutionProcedure(promise2, value, resolve, reject)
                }
                const rejectPromise = (reason) => {
                    if (isCalledRejectPromise || isCalledResolvePromise) {
                        return;
                    }

                    isCalledRejectPromise = true;
                    reject(reason)
                }
                try {
                    then.call(
                        x,
                        resolvePromise,
                        rejectPromise
                    )
                } catch (error) {
                    if (
                        !isCalledRejectPromise &&
                        !isCalledResolvePromise
                    ) {
                        reject(error)
                    }
                }
                return;
            }
        }

        resolve(x);
    }

    createResolveCallback(promise2, onFulfilled, resolve, reject) {
        return (value) => queueMicrotask(() => {
            if (typeof onFulfilled !== 'function') {
                resolve(value);
                return;
            }

            let x;

            try {
                x = onFulfilled(value);
            } catch (error) {
                reject(error);
                return;
            }

            this.resolutionProcedure(promise2, x, resolve, reject)
        })
        
    }

    createRejectCallback(promise2, onRejected, resolve, reject) {
        return (reason) => queueMicrotask(() => {
            if (typeof onRejected !== 'function') {
                reject(reason);
                return;
            }

            let x;

            try {
                x = onRejected(reason);
            } catch (error) {
                reject(error);
                return;
            }

            this.resolutionProcedure(promise2, x, resolve, reject)
        })
        
    }

    then(onFulfilled, onRejected) {
        const promise2 = new _Promise((resolve, reject) => {
            queueMicrotask(() => {
                onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : () => resolve(this.value);
                onRejected = typeof onRejected === 'function' ? onRejected : () => reject(this.reason);

                const resolveCallback = this.createResolveCallback(promise2, onFulfilled, resolve, reject);
                const rejectCallback = this.createRejectCallback(promise2, onRejected, resolve, reject);

                if (this.state === PromiseState.fulfilled) {
                    resolveCallback(this.value);
                    return;
                }

                if (this.state === PromiseState.rejected) {
                    rejectCallback(this.reason);
                    return;
                }

                this.fulfilledQueue.push(
                    resolveCallback
                )

                this.rejectedQueue.push(
                    rejectCallback
                )
            })
        })

        return promise2;
    }
}

module.exports = {
    resolved(value) {
        return new _Promise((resolve) => resolve(value))
    },

    rejected(reason) {
        return new _Promise((_, reject) => reject(reason))
    },

    deferred() {
        const ret = {};

        ret.promise = new _Promise((resolve, reject) => {
            ret.resolve = resolve;
            ret.reject = reject
        })

        return ret;
    }
}