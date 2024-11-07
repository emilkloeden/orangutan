import * as objects from "../objects/objects.ts";
import {
  appendFn,
  filterFn,
  joinFn,
  mapFn,
  prependFn,
  reduceFn,
} from "./array.ts";
import { readFileFn, writeFileFn } from "./file.ts";
import { putsFn, typeFn } from "./general.ts";
import { getAsyncFn, postAsyncFn } from "./http.ts";
import { splitFn } from "./string.ts";
import { lenFn } from "./string_and_array.ts";

const BUILTINS: Record<string, objects.BuiltIn> = {
  // general
  puts: new objects.BuiltIn(putsFn),
  type: new objects.BuiltIn(typeFn),
  // string and array
  len: new objects.BuiltIn(lenFn),

  // string
  split: new objects.BuiltIn(splitFn),

  // array
  join: new objects.BuiltIn(joinFn),
  append: new objects.BuiltIn(appendFn),
  prepend: new objects.BuiltIn(prependFn),
  map: new objects.BuiltIn(mapFn),
  filter: new objects.BuiltIn(filterFn),
  reduce: new objects.BuiltIn(reduceFn),

  //file
  readFile: new objects.BuiltIn(readFileFn),
  writeFile: new objects.BuiltIn(writeFileFn),

  // http
  get: new objects.BuiltIn(getAsyncFn),
  post: new objects.BuiltIn(postAsyncFn),
};

export default BUILTINS;
