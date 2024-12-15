import * as objects from "../objects/objects.ts";
import {
  appendFn,
  filterFn,
  firstFn,
  joinFn,
  lastFn,
  mapFn,
  prependFn,
  reduceFn,
  restFn,
  naiveIntegerSortFn,
  zipFn,
  zipLongestFn
} from "./array.ts";
import { readFileFn, writeFileFn } from "./file.ts";
import { ffiFn, putsFn, typeFn } from "./general.ts";
import { entriesFn, keysFn, valuesFn } from "./hash.ts";
import { getAsyncFn, postAsyncFn } from "./http.ts";
import { strFn } from "./integer.ts";
import { intFn, numberFn, splitFn } from "./string.ts";
import { lenFn } from "./string_and_array.ts";

const BUILTINS: Record<string, objects.BuiltIn> = {
  // general
  puts: new objects.BuiltIn(putsFn),
  type: new objects.BuiltIn(typeFn),
  ffi: new objects.BuiltIn(ffiFn),
  // string and array
  len: new objects.BuiltIn(lenFn),

  // string
  split: new objects.BuiltIn(splitFn),
  int: new objects.BuiltIn(intFn),
  number: new objects.BuiltIn(numberFn),

  // int
  str: new objects.BuiltIn(strFn),

  // array
  join: new objects.BuiltIn(joinFn),
  append: new objects.BuiltIn(appendFn),
  prepend: new objects.BuiltIn(prependFn),
  map: new objects.BuiltIn(mapFn),
  filter: new objects.BuiltIn(filterFn),
  reduce: new objects.BuiltIn(reduceFn),
  first: new objects.BuiltIn(firstFn),
  last: new objects.BuiltIn(lastFn),
  rest: new objects.BuiltIn(restFn),
  sort: new objects.BuiltIn(naiveIntegerSortFn),
  zip: new objects.BuiltIn(zipFn),
  zipLongest: new objects.BuiltIn(zipLongestFn),

  // hash
  keys: new objects.BuiltIn(keysFn),
  values: new objects.BuiltIn(valuesFn),
  entries: new objects.BuiltIn(entriesFn),

  // file
  readFile: new objects.BuiltIn(readFileFn),
  writeFile: new objects.BuiltIn(writeFileFn),

  // http
  get: new objects.BuiltIn(getAsyncFn),
  post: new objects.BuiltIn(postAsyncFn),
};

export default BUILTINS;
