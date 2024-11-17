import * as objects from "../objects/objects.ts";

class ValueEnvironmentPair {
  constructor(public value: objects.Objects, public env: Environment) {}
}
export default class Environment {
  constructor(
    public store: Record<string, objects.Objects>,
    private outer?: Environment,
  ) {}

  get = (name: string): null | ValueEnvironmentPair  => {
    const obj = this.store[name];
    // TODO: Confirm if !== is possible
    if (obj != null) {
      return new ValueEnvironmentPair(obj, this);
    }
    // TODO: Confirm !== is possible
    if (this.outer !== undefined) {
      return this.outer.get(name);
    }
    return null;
  };

  set = (name: string, val: objects.Objects | null): objects.Objects | null => {
    if (val !== null) {
      // TODO: THIS REALLY SHOULD THROW!!!
      this.store[name] = val;
    }
    return val;
  };
}
