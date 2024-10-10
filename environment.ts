import * as objects from "./objects.ts"

export default class Environment {
    constructor(private store: Record<string, objects.Objects>, private outer?: Environment) {}

    get = (name: string): objects.Objects | null => {
        const obj = this.store[name];
        // TODO: Confirm if !== is possible
        if (obj != null) {
            return obj;
        }
        // TODO: Confirm !== is possible
        if (this.outer !== undefined) {
            return this.outer.get(name)
        }
        return null
    }

    set = (name: string, val: objects.Objects): objects.Objects => {
        this.store[name] = val
        return val;
    }

}